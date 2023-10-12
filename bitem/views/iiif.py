from flask import request, render_template, session

from bitem import app


def getManifest(img_id):
    import urllib, json
    filetypeJson = app.config['API_URL'] + app.config['FILETYPE_API'] + '?file_id=' + str(img_id)

    with urllib.request.urlopen(
            filetypeJson) as url:
        filedata = json.loads(url.read().decode())
        for file_id, data in filedata.items():
            extension = data['extension']
            if extension:
                license = data['license']
                print("ID:", file_id)
                print("Extension:", extension)
                print("License:", license)



    path = "https://iiif.bitem.at/iiif/3/"

    from iiif_prezi3 import Manifest, config

    config.configs['helpers.auto_fields.AutoLang'].auto_lang = session['language']

    manifest = Manifest(
        id=path,
        label=str(img_id),
        )

    canvas = manifest.make_canvas_from_iiif(
        url=app.config['IIIF_URL'] + str(img_id) + extension)

    return manifest.json(indent=2)

@app.route('/iiif/<int:img_id>.json')
def iiif(img_id: int):
    return getManifest(img_id)

@app.route('/iiif/<int:img_id>')
def view(img_id: int):
    return render_template("/iiif/iiif.html", img_id=str(img_id), img_manifest=request.base_url + '.json')
