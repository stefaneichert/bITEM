from flask import request, render_template, session, g
from bs4 import BeautifulSoup
from flask_babel import lazy_gettext as _

from bitem import app


def getManifest(img_id):
    import urllib, json, requests, re
    filetypeJson = app.config['API_URL'] + app.config[
        'FILETYPE_API'] + '?file_id=' + str(img_id)

    locale = session.get(
        'language',
        request.accept_languages.best_match(
            app.config['LANGUAGES'].keys()))

    with urllib.request.urlopen(
            filetypeJson) as url:
        filedata = json.loads(url.read().decode())
        for file_id, data in filedata.items():
            extension = data['extension']
            if extension:
                license = data['license']

    from iiif_prezi3 import Manifest, KeyValueString, config

    config.configs['helpers.auto_fields.AutoLang'].auto_lang = session[
        'language']

    sql = """
        SELECT e.name AS image,
               e.description,
               l.property_code,
               CASE
                   WHEN l.range_id = e.id AND p.name_inverse IS NOT NULL THEN p.name_inverse
                   ELSE p.name
                   END property,
               l.description AS spec,
               e2.id,
               e2.name,
               e2.description AS info
        from model.entity e
                 LEFT JOIN model.link l ON e.id IN (l.domain_id, l.range_id)
                 LEFT JOIN model.entity e2 ON e2.id IN (l.domain_id, l.range_id)
                 JOIN model.property p ON l.property_code = p.code
        WHERE e.id = %(id)s
          AND e2.id != e.id;
    """

    g.cursor.execute(sql, {'id': img_id})
    result = g.cursor.fetchall()
    g.cursor.execute(
        f'SELECT * FROM model.file_info WHERE entity_id = {img_id}')
    license_info = g.cursor.fetchone()
    if license_info:
        creator = license_info.creator
        rightsholder = license_info.license_holder

    g.cursor.execute(f'SELECT description FROM model.entity WHERE id = {img_id}')
    filedescription = g.cursor.fetchone()

    image_name = result[0].image
    if license:
        attribution = ''
        source = ''
        sourceThere = False
        for row in result:
            nourl = True
            if row.property == 'is referred to by' or row.name.startswith(("http://", "https://")):
                sourceThere = True
                name = row.name
                if row.name.startswith(("http://", "https://")):
                    nourl = False
                    linktext = row.name
                    if row.info:
                        linktext = row.info
                    name = f'<a href="{row.name}" target="_blank">{linktext}</a>'
                source += name
                if row.info and nourl :
                    source += ': ' + row.info
                if row.spec and nourl:
                    source += ' ' + row.spec
                source += '<br>'
            if row.name == license and row.property_code == 'P2':
                try:
                    license_uri = (re.search(
                        '##licenseUrl_##(.*)##_licenseUrl##',
                        row.info).group(1)).replace('https', 'http')
                except Exception:
                    license_uri = None
                if license_uri:
                    try:
                        apiUrl = 'https://api.creativecommons.org/rest/1.5/details?license-uri=' + license_uri + '&locale=' + locale
                        document = requests.get(apiUrl)
                        soup = BeautifulSoup(document.content, "lxml-xml")
                        attribution = str(soup.find("html"))
                        if attribution == 'None':
                            attribution = row.name
                            if row.info:
                                attribution += ': ' + row.info
                            if row.spec:
                                attribution += ' ' + row.spec
                    except Exception:
                        pass
                else:
                    attribution = row.name
                    if row.info:
                        attribution += ': ' + row.info
                    if row.spec:
                        attribution += ' ' + row.spec

                attribution += '<br><br>'
        if rightsholder:
            attribution = '<p>'+ _('rightsholder(s)').capitalize() +  ': ' + rightsholder + '</p>' + attribution
        if creator:
            attribution = '<p>' + _('creator(s)').capitalize() + ': ' + creator + '<p>' + attribution
        if filedescription.description:
            attribution = '<p>' + _('info').capitalize() +  ': ' + filedescription.description + '</p>' + attribution
        if sourceThere:
            source = '<br>' + _('source(s)').capitalize() + ':<br>' + source
        attribution += str('<p>' + source + '</p>')


    manifest = Manifest(
        id=request.base_url,
        label=image_name,
        rights=license_uri,
        requiredStatement=KeyValueString(label="Attribution",
                                         value=attribution)
    )
    if extension in ('.png', '.bmp', '.jpg', '.jpeg'):
        canvas = manifest.make_canvas_from_iiif(
            url=app.config['IIIF_URL'] + str(img_id) + extension)

    return manifest.json(indent=2)


@app.route('/iiif/<int:img_id>.json')
def iiif(img_id: int):
    return getManifest(img_id)


@app.route('/iiif/<int:img_id>')
def view(img_id: int):
    return render_template("/iiif/iiif.html", img_id=str(img_id),
                           img_manifest=request.base_url + '.json')
