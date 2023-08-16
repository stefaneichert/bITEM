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
    if selection not in ['places', 'view']:
        return render_template(
            "/entity/entities.html",
            _data=_data,
            title=_(selection),
            csNames=csNames)
    elif selection == 'places':
        return render_template(
            "/map/map.html",
            _data=_data,
            title=_(selection),
            csNames=csNames)
    return ''

def getlist(openAtlasClass):

    sql = """
    SELECT data FROM bitem.tbl_allitems WHERE openatlas_class_name IN %(openAtlasClass)s 
    """
    lan = app.config['TRANSLATION_IDS']
    g.cursor.execute(sql, {'openAtlasClass': openAtlasClass})
    result = g.cursor.fetchall()
    finalresult = []
    for row in result:
        print('')
        print('')
        #print(row.data)
        print('')
        print('')
        if 'images' in row.data:
            print (row.data['images'])
            print (row.data['id'])
            row.data['image'] = iiiftools.setIIIFSize((data_mapper.getMainImage(row.data['id'], row.data['images'])), 300, 500)
        finalresult.append(row.data)
    return (finalresult)
