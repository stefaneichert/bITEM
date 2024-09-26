from pathlib import Path
from flask import render_template, g, session, request
from bitem import app
import random

@app.route('/')
def index():
    # get random 3d model
    classes = app.config['VIEW_CLASSES']
    root = str(app.config['CASE_STUDY'])
    all_classes = (classes['actors'] + classes['items'] + classes['places'] +
                   classes['events'])
    all_classes = str(list(all_classes))

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

    sql = """
    
        
        SELECT * FROM (SELECT id,
            MAX(CASE WHEN mimetype = '3d' THEN filename END) AS model,
            MAX(CASE WHEN mimetype = 'poster' THEN filename END) AS poster
                FROM (SELECT l.range_id AS id, f.filename, f.mimetype
                    FROM bitem.files f
                       JOIN model.link l ON f.id = l.domain_id
                       JOIN model.entity e ON e.id = l.range_id
                       WHERE l.property_code = 'P67'
                       AND f.mimetype IN ('3d', 'poster', 'img')
                       AND l.range_id IN (SELECT ids
                               FROM bitem.get_entities(
                           ARRAY """ + all_classes + """ , """ + root + """
                       ))) a GROUP BY a.id) b WHERE poster IS NOT NULL
    """
    g.cursor.execute(sql)
    result = g.cursor.fetchall()

    if not result:
        # Handle the case where no records are found
        return render_template("/index/index.html", message="No records found.")
    
    random_record = random.choice(result)
    model = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.model)
    poster = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.poster)

    casestudies_id = app.config['CASE_STUDIES']
    casestudies = []



    for id in casestudies_id:
        casestudy = {}
        g.cursor.execute(f'SELECT description FROM model.entity WHERE id = {id}')
        cs_description = (g.cursor.fetchone()).description
        if cs_description:
            casestudy['text'] = translate_text(cs_description, lang)

        g.cursor.execute(f"""
                    SELECT f.filename
                    FROM model.entity e
                             JOIN model.link l ON e.id = l.range_id
                             JOIN bitem.files f ON f.id = l.domain_id
                    WHERE e.openatlas_class_name = 'type'
                      AND l.property_code = 'P67'
                        AND e.id = {id} AND f.mimetype = 'img' LIMIT 1
                        """)
        cs_image = g.cursor.fetchone()
        if cs_image:
            casestudy['image'] = app.config['IIIF_URL'] + '/' + cs_image.filename + '/full/max/0/default.jpg'

        g.cursor.execute(f"""
            SELECT      jsonb_strip_nulls(jsonb_build_object('name', name,
                               'en', (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197088),
                               'de', (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197086)
            )) AS translation
                FROM model.entity e WHERE id = {id}""")
        cs_tranlations = g.cursor.fetchone().translation
        casestudy['name'] = cs_tranlations['name']
        casestudy['id'] = id
        if lang in cs_tranlations:
            casestudy['name'] = cs_tranlations[lang]
        casestudies.append(casestudy)
    print(casestudies)

    return render_template("/index/index.html", model=model, poster=poster, casestudies=casestudies)
