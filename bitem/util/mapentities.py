from flask import g, render_template
from bitem import app
from bitem.util import datamapper, iiiftools
from flask_babel import lazy_gettext as _


def getData(selection):
    viewclasses = app.config['VIEW_CLASSES']

    for key in viewclasses:
        if key == selection:
            openAtlasClass = viewclasses[key]

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    _data = getlist(openAtlasClass, casestudies)

    csNames = datamapper.getCaseStudyNames(casestudies,openAtlasClass)

    if selection != 'places' and selection != 'view':
        return render_template("/entity/entities.html",
                           _data=_data,
                           title=_(selection),
                           csNames=csNames)
    elif selection == 'places':
        return render_template("/map/map.html",
                           _data=_data,
                           title=_(selection),
                           csNames=csNames)

def getlist(openAtlasClass, caseStudies):

    sql = """
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id,
        '_label', name,
        -- language begin
        -- add/remove the desired languages (the code e.g. DE needs to be the 
        -- same as the session language code
        '_labelDE', germanName,
        '_labelEN', englishName,
        -- language end
        'content', description,
        'first', first,
        'last', last,
        'types', type,
        'images', image,
        'geom', geometry,
        'casestudies', caseStudiesAll
               ))) as list
    FROM
(SELECT DISTINCT 
       a.id,
       a.name,
       -- language begin
       -- add/remove the desired languages (the code e.g. DE needs to be the 
       b.germanName,
       c.englishName,
       -- language end
       a.description,
       (LEAST(a.begin_from, a.begin_to)::DATE)::TEXT AS first,
       (GREATEST(a.end_from, a.end_to)::DATE)::TEXT  AS last,
       d.maintype                                    AS type,
       e.mainimage                                   AS image,
       f.caseStudiesAll                              AS caseStudiesAll,
       g.geometry
FROM (SELECT e.id, e.name, e.description, e.begin_from, e.begin_to, e.end_from, e.end_to
      FROM model.entity e
               JOIN model.link l ON e.id = l.domain_id
        WHERE e.openatlas_class_name IN %(openAtlasClass)s
        AND l.property_code = 'P2'
        AND l.range_id IN %(caseStudies)s)a

       -- language begin
       -- add/remove the desired languages (the name e.g. germanName 
       -- needs to be the same as in the query above and the id must
       -- defined in config.py 
         LEFT JOIN (SELECT range_id, description AS germanName FROM model.link WHERE domain_id = %(de)s) b
                   ON b.range_id = a.id

         LEFT JOIN (SELECT range_id, description AS englishName FROM model.link WHERE domain_id = %(en)s) c
                   ON c.range_id = a.id
        --language end
        
        LEFT JOIN (SELECT id,
               jsonb_build_object(
                   'type', 'feature',
                   'geometry', jsonb_build_object(
                       'type', 'GeometryCollection',
                       'geometries', geom
                   )) AS geometry
        FROM
         (SELECT g.id, g.name, jsonb_agg(ST_AsGeoJSON(g.geom)::jsonb) AS geom FROM
            (SELECT e.id,e.name,
                     CASE
                         WHEN g.geom_point IS NOT NULL THEN 'point'
                         WHEN g.geom_linestring IS NOT NULL THEN 'linestring'
                         WHEN g.geom_polygon IS NOT NULL THEN 'polygon'
                         END AS type,
                     CASE
                         WHEN g.geom_point IS NOT NULL THEN (g.geom_point)
                         WHEN g.geom_linestring IS NOT NULL THEN (g.geom_linestring)
                         WHEN g.geom_polygon IS NOT NULL THEN (g.geom_polygon)
                         END AS geom
              FROM model.entity e
                       JOIN model.link l ON l.domain_id = e.id
                       JOIN model.gis g ON g.entity_id = l.range_id
              WHERE l.property_code = 'P53'
                AND e.openatlas_class_name = 'place'
              UNION ALL
              SELECT e.id,e.name,
                     CASE
                         WHEN g.geom_linestring IS NOT NULL THEN 'centerpoint'
                         WHEN g.geom_polygon IS NOT NULL THEN 'centerpoint'
                         END AS type,
                     CASE
                         WHEN g.geom_linestring IS NOT NULL THEN (st_pointonsurface(g.geom_linestring))
                         WHEN g.geom_polygon IS NOT NULL THEN (st_pointonsurface(g.geom_polygon))
                         END AS geom
              FROM model.entity e
                       JOIN model.link l ON l.domain_id = e.id
                       JOIN model.gis g ON g.entity_id = l.range_id
              WHERE l.property_code = 'P53'
                  AND e.openatlas_class_name = 'place' AND g.geom_linestring IS NOT NULL
                 OR l.property_code = 'P53' AND e.openatlas_class_name = 'place' AND g.geom_polygon IS NOT NULL) g GROUP BY g.id, g.name) b) g ON g.id = a.id

         LEFT JOIN (SELECT jsonb_strip_nulls(jsonb_build_object('name', e.name, 'DE', de.description, 'EN', en.description)) AS maintype, l.domain_id
                    FROM model.entity e
                             JOIN model.link l ON e.id = l.range_id
                    LEFT JOIN (SELECT range_id, description FROM model.link WHERE domain_id = %(de)s) de
                   ON de.range_id = e.id
                    LEFT JOIN (SELECT range_id, description FROM model.link WHERE domain_id = %(en)s) en
                   ON en.range_id = e.id
                    WHERE e.id IN (WITH RECURSIVE subcategories AS (SELECT domain_id, range_id
                                                                    FROM model.link
                                                                    WHERE range_id IN
                                                                          (SELECT id from web.hierarchy WHERE category = 'standard') AND
                                                                          property_code = 'P127'
                                                                       OR range_id IN (23)

                                                                    UNION ALL

                                                                    SELECT l.domain_id, l.range_id
                                                                    FROM model.link l
                                                                             INNER JOIN subcategories s ON s.domain_id = l.range_id
                                                                    WHERE l.property_code = 'P127')
                                   SELECT caseIDS as ids
                                   FROM (SELECT domain_id AS caseIDS
                                         FROM subcategories
                                         UNION ALL
                                         SELECT range_id AS caseIDS
                                         FROM subcategories) a)
                      AND l.property_code = 'P2') d
                   ON d.domain_id = a.id

         LEFT JOIN (SELECT l.range_id as ent_id, JSONB_AGG(e.id) as mainimage
                    FROM model.entity e JOIN model.link l ON e.id = l.domain_id
                                           WHERE l.property_code = 'P67'

                        AND e.openatlas_class_name = 'file'
                    GROUP BY l.range_id) e
                   ON e.ent_id = a.id

         LEFT JOIN (SELECT id, cases AS caseStudiesAll
                      FROM (SELECT ents.id, jsonb_agg(DISTINCT t.path) as cases
                            FROM (SELECT id, entName, jsonb_array_elements(cases) AS caseid FROM (SELECT id, entName, cases FROM
        (SELECT id, entName, JSONB_AGG(typeName) AS cases
        FROM (SELECT a.id, a.name AS entName, l.domain_id, e.id AS typeName
        FROM model.entity a
               JOIN model.link l ON a.id = l.domain_id
               JOIN model.entity e ON l.range_id = e.id
        WHERE l.property_code = 'P2' AND l.range_id IN %(caseStudies)s
        ORDER BY a.id) v GROUP BY  v.id, v.entName) c) x ) AS ents
                                     JOIN (SELECT id, jsonb_array_elements(path) AS path
                                           FROM (WITH RECURSIVE my_tree AS (SELECT e2.id         AS child_id,
                                                                                   e.id          AS parent_id,
                                                                                   ARRAY [e2.id] AS path
                                                                            FROM model.entity e
                                                                                     JOIN model.link l ON e.id = l.range_id
                                                                                     JOIN model.entity e2 ON l.domain_id = e2.id
                                                                            WHERE l.property_code = 'P127'
                                                                              AND e2.id = %(root)s
                                                                            UNION ALL
                                                                            SELECT e2.id      AS child_id,
                                                                                   t.child_id AS parent_id,
                                                                                   t.path || ARRAY [e2.id]
                                                                            FROM my_tree t
                                                                                     JOIN model.link l ON t.child_id = l.range_id
                                                                                     JOIN model.entity e2 ON l.domain_id = e2.id
                                                                            WHERE l.property_code = 'P127'
                                                                              AND NOT (t.path @> ARRAY [l.domain_id]))
                                                 SELECT child_id AS id, array_to_json(path)::jsonb AS path
                                                 FROM my_tree) tree) t
                                          ON ents.caseid::INT = t.id
                           GROUP BY ents.id ) a) f
                   ON f.id = a.id) final
    """
    lan = app.config['TRANSLATION_IDS']
    g.cursor.execute(sql, {'openAtlasClass': openAtlasClass,
                           'caseStudies': caseStudies,
                           'root': app.config['CASE_STUDY'], 'de': lan['de'],
                           'en': lan['en']})
    result = g.cursor.fetchone()
    finalresult = []
    for row in result.list:
        #print(row)
        if 'images' in row:
            print (row['images'])
            print (row['id'])
            row['image'] = iiiftools.setIIIFSize((datamapper.getMainImage(row['id'], row['images'])), 300, 500)
        finalresult.append(row)
    return (finalresult)
