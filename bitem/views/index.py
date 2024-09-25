from pathlib import Path
from flask import render_template, g
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
    print(sql)
    g.cursor.execute(sql)
    result = g.cursor.fetchall()

    if not result:
        # Handle the case where no records are found
        return render_template("/index/index.html", message="No records found.")
    
    random_record = random.choice(result)
    model = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.model)
    poster = app.config['OPENATLAS_UPLOAD_FOLDER'] + '/' + str(random_record.poster)

    return render_template("/index/index.html", model=model, poster=poster)
