from flask import g, render_template
from bitem import app
from bitem.util import datamapper, iiiftools
from flask_babel import lazy_gettext as _


def getData(ids):
    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    sql = """
    SELECT jsonb_strip_nulls(jsonb_build_object(
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
               )) as item
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
      FROM model.entity e WHERE e.id IN %(ids)s )a

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
    g.cursor.execute(sql, {'caseStudies': casestudies,
                           'root': app.config['CASE_STUDY'], 'de': lan['de'],
                           'en': lan['en'],
                           'ids': ids})
    result = g.cursor.fetchone()
    if 'images' in result[0]:
        images = result[0]['images']
        result[0]['image'] = iiiftools.setIIIFSize(
            datamapper.getMainImage(result[0]['id'], images), 1000, 2000)
        allimages = []
        for image in images:
            allimages.append(iiiftools.setIIIFSize(image, 1000, 2000))
        result[0]['allimages'] = allimages
    return (result)


def get_connections(id):
    sql_query = """
        SELECT a.openatlas_class_name as class_,
               jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'link', a.link || ' - ' || a.link_name,
                   'id', a.id,
                   'name', a.name,
                   'description', a.descr,
                   'images', a.image,
                   'begin', a.mainfirst,
                   'end', a.mainlast,
                   'involvement', NULLIF(a.involvement, '[{}]')
               ))) as connections
        FROM (
            SELECT DISTINCT e.id,
                             l.property_code AS link,
                             CASE
                                WHEN l.domain_id = e.id THEN c.name_inverse
                                WHEN l.range_id = e.id THEN c.name
                                 END link_name,

                             e.name,
                             NULLIF(e.description, '') AS descr,
                             e.openatlas_class_name,
                             (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT AS mainfirst,
                             (GREATEST(e.end_from, e.end_to)::DATE)::TEXT  AS mainlast,
                             g.image AS image,
                             jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                             'invbegin', (LEAST(l.begin_from, l.begin_to)::DATE)::TEXT,
                             'invend', (GREATEST(l.end_from, l.end_to)::DATE)::TEXT,
                             'info', NULLIF(l.description, ''),
                             'qualifier', fu.function,
                             'qualifierID', fu.id))) involvement
            FROM model.entity e
                JOIN model.link l ON e.id IN (l.range_id, l.domain_id)
                JOIN model.property c ON c.code = l.property_code
            LEFT JOIN (SELECT l.range_id as ent_id, JSONB_AGG(f.id) as image
                    FROM model.entity f JOIN model.link l ON f.id = l.domain_id

                                           WHERE l.property_code = 'P67'

                        AND f.openatlas_class_name = 'file'
                    GROUP BY l.range_id) g
                   ON g.ent_id = e.id
            LEFT JOIN (SELECT DISTINCT fe.id, fe.name as function FROM model.entity fe JOIN model.link l2 ON fe.id IN (l2.domain_id, l2.range_id)) fu ON fu.id = l.type_id
            WHERE %(id)s IN (l.domain_id, l.range_id) AND e.id != %(id)s AND e.openatlas_class_name != 'object_location' GROUP BY e.id, link_name, e.description, l.property_code, e.name, g.image, e.openatlas_class_name, (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT, (GREATEST(e.end_from, e.end_to)::DATE)::TEXT
        ) a GROUP BY openatlas_class_name
    """

    cursor = g.cursor
    cursor.execute(sql_query, {'id': id})
    result = cursor.fetchall()

    translations = get_translations()

    data = {}
    for row in result:
        connections = row.connections
        for connection in connections:

            placenodes = get_places(connection['id'])
            if placenodes:
                connection['placenodes'] = placenodes
            if connection['id'] in translations:
                translation_data = get_languages(connection['id'])
                if len(translation_data) > 0:
                    for entry in translation_data:
                        for tkey in entry:
                            connection[tkey] = entry[tkey]
            if 'involvement' in connection:
                for entry in connection['involvement']:
                    if 'qualifierID' in entry:
                        translation_data = get_languages(entry['qualifierID'])
                    if len(translation_data) > 0:
                        for language in translation_data:
                            for tkey in language:
                                entry[tkey] = language[tkey]
            if 'images' in connection:
                connection['image'] = iiiftools.setIIIFSize(
                    datamapper.getMainImage(connection['id'],
                                            connection['images']), 300, 500)
        data[row.class_] = connections
    return data


def get_translations():
    cursor = g.cursor
    lan = app.config['TRANSLATION_IDS']
    transents = tuple(lan.values())
    cursor.execute(
        f'SELECT jsonb_agg(range_id) AS translated FROM model.link WHERE domain_id IN {transents}')
    translations_ = cursor.fetchone()
    return tuple(translations_.translated)


def get_languages(id):
    cursor = g.cursor
    lan = app.config['TRANSLATION_IDS']
    translations = []
    for key, value in lan.items():
        cursor.execute(
            f"SELECT l.description AS name from model.link l WHERE l.range_id = {id} AND l.domain_id = {value}")
        result = cursor.fetchone()
        if result and result.name:
            translations.append({key: result.name})
    return translations


def get_places(id):
    sql = """
        SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'geom', geometry,
            'name', placename,
            'involvement', property_code || ' - ' || property,
            'GeomId', GeomId
            ))) AS placenodes FROM (SELECT
                e.id    AS GeomId,
                geo.geometry,
               e3.id   AS PlaceId,
               e3.name AS placename,
               l.property_code,
               CASE
                   WHEN l.domain_id = e.id THEN p.name_inverse
                   WHEN l.range_id = e.id THEN p.name
                   END    property,
               e2.name,
               e2.id
        FROM model.entity e
                 JOIN model.link l ON e.id IN (l.domain_id, l.range_id)
                 JOIN model.property p ON l.property_code = p.code
                 JOIN model.entity e2 ON e2.id in (l.domain_id, l.range_id)
                 JOIN model.link l2 ON e.id = l2.range_id
                 JOIN model.entity e3 ON e3.id = l2.domain_id
                 JOIN ((SELECT entity_id      AS id,
                               jsonb_build_object(
                                       'type', 'feature',
                                       'geometry', jsonb_build_object(
                                               'type', 'GeometryCollection',
                                               'geometries', geom
                                           )) AS geometry
                        FROM (SELECT entity_id, jsonb_agg(ST_AsGeoJSON(g.geom)::jsonb) AS geom
                              FROM (SELECT g.entity_id,
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
                                    FROM model.gis g
                                    UNION ALL
                                    SELECT g.entity_id,
                                           CASE
                                               WHEN g.geom_linestring IS NOT NULL THEN 'centerpoint'
                                               WHEN g.geom_polygon IS NOT NULL THEN 'centerpoint'
                                               END AS type,
                                           CASE
                                               WHEN g.geom_linestring IS NOT NULL THEN (st_pointonsurface(g.geom_linestring))
                                               WHEN g.geom_polygon IS NOT NULL THEN (st_pointonsurface(g.geom_polygon))
                                               END AS geom
                                    FROM model.gis g
                                    WHERE g.geom_linestring IS NOT NULL
                                       OR g.geom_polygon IS NOT NULL) g
                              GROUP BY g.entity_id) b)) geo ON geo.id = e.id
        WHERE e.cidoc_class_code = 'E53'
          AND e.openatlas_class_name = 'object_location'
          AND e.id != e2.id
          AND l2.property_code = 'P53'
          AND e2.id = %(id)s) places        
    """

    sqltest = """
        SELECT e.id FROM model.entity e JOIN model.link l ON e.id IN (l.domain_id, l.range_id) JOIN model.entity e2 ON e2.id IN (l.domain_id, l.range_id)
                                              WHERE e2.openatlas_class_name = 'object_location' AND e.id = %(id)s
    """
    g.cursor.execute(sqltest, {'id':id})
    result = g.cursor.fetchone()
    if result:
        g.cursor.execute(sql, {'id': id})
        resultfinal = g.cursor.fetchone()
        print(resultfinal.placenodes)
        return resultfinal.placenodes
    else:
        print(str(id))
        return
