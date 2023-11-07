from flask import g, render_template
from flask_babel import lazy_gettext as _

from bitem import app
from bitem.util import data_mapper, iiiftools


def get_data(selection: str) -> str:
    viewclasses = app.config['VIEW_CLASSES']
    for key in viewclasses:
        if key == selection:
            openAtlasClass = viewclasses[key]
    casestudies = data_mapper.get_cases(app.config['CASE_STUDY'])
    _data = getlist(openAtlasClass)
    csNames = data_mapper.get_case_study_names(casestudies, openAtlasClass)

    media = ['No media']
    types = []
    for row in _data:
        if 'type' in row:
            if row['type'] not in types:
                types.append(row['type'])
        if 'models' in row:
            if '3d Models' not in media:
                media.append('3d Models')
        if 'image' in row:
            if 'Images' not in media:
                media.append('Images')

    return render_template(
        "/map/map.html",
        _data=_data,
        title=_(selection),
        types=types,
        media=media,
        csNames=csNames,
        selection=selection)
    return ''


def getlist(openAtlasClass=None, id=0):
    sql = """
    SELECT data FROM bitem.tbl_allitems WHERE openatlas_class_name IN %(openAtlasClass)s 
    """

    if id != 0:
        sql = """
            SELECT data FROM bitem.tbl_allitems WHERE id = %(id)s 
            """

    g.cursor.execute(sql, {'openAtlasClass': openAtlasClass, 'id': id})
    result = g.cursor.fetchall()
    finalresult = []
    images = []
    for row in result:
        finalresult.append(row.data)

    return (finalresult)
