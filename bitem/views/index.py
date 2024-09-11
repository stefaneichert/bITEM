import random

from flask import render_template, g, session, request

from bitem import app


@app.route('/')
def index():
    def translate_text(text, lang):
        start_marker = f"##{lang}_##"
        end_marker = f"##_{lang}##"

        start_index = text.find(start_marker)
        end_index = text.find(end_marker)

        if start_index != -1 and end_index != -1:
            return text[start_index + len(start_marker):end_index].strip()

        parts = text.split("##")
        fallback_text = " ".join(part.strip() for i, part in enumerate(parts) if i % 2 == 0 and part.strip())

        return fallback_text

    # get random 3d model
    classes = app.config['VIEW_CLASSES']
    root = str(app.config['CASE_STUDY'])
    all_classes = (classes['actors'] + classes['items'] + classes['places'] +
                   classes['events'])
    all_classes = str(list(all_classes))

    sql = """
            SELECT x.*, y.description AS description, z.description AS copyright FROM (SELECT * FROM (SELECT id,
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
                           ))) a GROUP BY a.id) b WHERE poster IS NOT NULL) x JOIN model.entity y ON x.id::TEXT = y.id::TEXT JOIN model.entity z ON z.id::TEXT = replace(x.model, '.glb', '')"""

    g.cursor.execute(sql)
    result = g.cursor.fetchall()

    if not result:
        # Handle the case where no records are found
        return render_template("/index/index.html", message="No records found.")

    CURRENT_LANGUAGE = session.get(
        'language',
        request.accept_languages.best_match(
            app.config['LANGUAGES'].keys()))

    random_record = random.choice(result)
    model = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.model)
    poster = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.poster)
    description = str(random_record.description)
    description = translate_text(description, CURRENT_LANGUAGE)
    copyright = str(random_record.copyright)
    copyright = translate_text(copyright, CURRENT_LANGUAGE)
    id = str(random_record.id)



    print(description, copyright, id)
    print(CURRENT_LANGUAGE)

    return render_template("/index/index.html", model=model, poster=poster, description=description, copyright=copyright, id=id)

