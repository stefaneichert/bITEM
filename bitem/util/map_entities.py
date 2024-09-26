from flask import g, render_template, session, request
from flask_babel import lazy_gettext as _

from bitem import app
from bitem.util import data_mapper, iiiftools


def get_data(selection: str, case_study=None) -> str:
    viewclasses = app.config['VIEW_CLASSES']
    for key in viewclasses:
        if key == selection:
            openAtlasClass = viewclasses[key]
    casestudies = data_mapper.get_cases(app.config['CASE_STUDY'])
    _data = getlist(openAtlasClass, 0, case_study)

    exclude_case_ids = app.config['HIDDEN_ONES']
    exclude_case_ids = exclude_case_ids + (app.config['CASE_STUDY'],)
    case_ids_used = []
    for row in _data:
        if row['casestudies']:
            for id in row['casestudies']:
                if id not in exclude_case_ids and id not in case_ids_used:
                    case_ids_used.append(id)
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

    case_study_there = False
    cs_description = None
    cs_image = None
    stories = []

    if case_study:
        def translate_text(text, lang):
            start_marker = f"##{lang}_##"
            end_marker = f"##_{lang}##"

            start_index = text.find(start_marker)
            end_index = text.find(end_marker)

            if start_index != -1 and end_index != -1:
                return text[start_index + len(start_marker):end_index].strip()

            parts = text.split("##")
            fallback_text = " ".join(
                part.strip() for i, part in enumerate(parts) if
                i % 2 == 0 and part.strip())

            return fallback_text

        lang = (session.get(
            'language',
            request.accept_languages.best_match(
                app.config['LANGUAGES'].keys())))

        CURRENT_LANGUAGE = session.get(
            'language',
            request.accept_languages.best_match(
                app.config['LANGUAGES'].keys())),

        case_study_there = True

        g.cursor.execute(f'SELECT description FROM model.entity WHERE id = {case_study}')
        cs_description = (g.cursor.fetchone()).description
        if cs_description:
            cs_description = translate_text(cs_description, lang)

        g.cursor.execute(f"""
            SELECT f.filename
            FROM model.entity e
                     JOIN model.link l ON e.id = l.range_id
                     JOIN bitem.files f ON f.id = l.domain_id
            WHERE e.openatlas_class_name = 'type'
              AND l.property_code = 'P67'
                AND e.id = {case_study} AND f.mimetype = 'img' LIMIT 1
                """)
        cs_image = g.cursor.fetchone()
        if cs_image:
            cs_image = cs_image.filename


        g.cursor.execute(f'SELECT DISTINCT s.story_name, f.filename, s.story_id FROM bitem.stories s LEFT JOIN bitem.files f ON f.id = s.story_image WHERE case_study = {case_study}')
        story_data = g.cursor.fetchall()
        for row in story_data:
            story = {}
            story['name'] = translate_text(row[0], lang)
            #story['name'] = row[0]
            story['image'] = row[1]
            story['id'] = row[2]
            stories.append(story)

        for row in csNames:
            if row.id == case_study:
                selection = row.name
                if CURRENT_LANGUAGE[0] == 'de' and row.de:
                    selection = row.de
                if CURRENT_LANGUAGE[0] == 'en' and row.en:
                    selection = row.en
    classesthere = False
    if case_study_there or selection == 'entities':
          classesthere = True

    return render_template(
        "/map/map.html",
        _data=_data,
        entity=True,
        classesthere=classesthere,
        title=_(selection),
        types=types,
        media=media,
        csNames=csNames,
        case_ids_used=case_ids_used,
        selection=selection,
        case_study_there=case_study_there,
        cs_description=cs_description,
        cs_image=cs_image,
        stories=stories)


def getlist(openAtlasClass=None, id=0, case_study=None):
    sql = """
    SELECT data FROM bitem.tbl_allitems WHERE openatlas_class_name IN %(openAtlasClass)s  
    """

    if case_study:
        sql = """
            SELECT data
                FROM bitem.tbl_allitems
                WHERE %(case_study)s = ANY (
                    SELECT jsonb_array_elements_text(data -> 'casestudies')::int
                );
            """

    if id != 0:
        sql = """
            SELECT data FROM bitem.tbl_allitems WHERE id = %(id)s 
            """

    g.cursor.execute(sql, {'openAtlasClass': openAtlasClass, 'id': id, 'case_study' : case_study})
    result = g.cursor.fetchall()
    finalresult = []
    images = []
    for row in result:
        finalresult.append(row.data)

    return (finalresult)
