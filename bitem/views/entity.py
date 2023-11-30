import json

from flask import render_template, g

from bitem import app
from bitem.util import map_entities


@app.route('/view/<int:entity_id>')
def entity(entity_id: int):
    data = map_entities.getlist(None, entity_id)[0]

    # if data:
    # g.cursor.execute("INSERT INTO bitem.checkaccess (access_type, entity_id) VALUES ('access', %(entity_id)s)",{'entity_id':entity_id})
    # data[0]['connections'] = mapview.get_connections(entity_id)
    #    return json.dumps(data)

    sql = """
    SELECT jsonb_agg(jsonb_build_object('property_code', property_code, 'locale', language_code, 'text', text, 'text_inverse', text_inverse)) AS translations FROM model.property_i18n i
    """

    g.cursor.execute(sql)

    translations = g.cursor.fetchone()

    return render_template("/entity/entity.html", data=data, translations=translations.translations)


@app.route('/update')
def update():
    g.cursor.execute("SELECT 'update' IN (SELECT access_type FROM bitem.checkaccess) AS update")
    updated = g.cursor.fetchone()
    updated = updated.update
    print(updated)
    message_string = 'No changes'
    if updated:
        g.cursor.execute(
            "SELECT jsonb_agg(DISTINCT entity_id) AS updated FROM bitem.checkaccess WHERE access_type = 'update'")
        updated_entities = g.cursor.fetchone()
        updated_entities = tuple(updated_entities.updated)
        print(updated_entities)
        g.cursor.execute("DELETE FROM bitem.tbl_allitems WHERE id IN %(updated_entities)s",
                         {'updated_entities': updated_entities})
        g.cursor.execute("INSERT INTO bitem.tbl_allitems SELECT * FROM bitem.allitems WHERE id IN %(updated_entities)s",
                         {'updated_entities': updated_entities})
        g.cursor.execute("DELETE FROM bitem.checkaccess WHERE access_type = 'update'")
        message_string = 'updated: ' + str(updated_entities)
    print(message_string)
    return message_string


@app.route('/image/<int:image_id>')
def image(image_id: int):
    import urllib, json
    filetypeJsonId = app.config['API_URL'] + app.config['FILETYPE_API'] + '?file_id=' + str(image_id)
    try:
        with urllib.request.urlopen(
                filetypeJsonId) as url:
            filedata = json.loads(url.read().decode())
            for file_id, data in filedata.items():
                return str(file_id) + data['extension']
    except Exception:
        return None

