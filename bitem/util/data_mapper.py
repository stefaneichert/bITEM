from typing import Any

from flask import g

from bitem import app


def mark_access(id: int):
    g.cursor.execute(
        """
            INSERT INTO bitem.checkaccess 
                (access_type, entity_id) VALUES 
                ('access', %(id)s)""", {'id': id})


def get_cases(root: int) -> tuple[Any]:
    sql = """
        WITH RECURSIVE subcategories AS (
              SELECT domain_id, range_id
              FROM model.link
              WHERE range_id = %(root_)s AND property_code = 'P127'

              UNION ALL

              SELECT l.domain_id, l.range_id
              FROM model.link l
              INNER JOIN subcategories s ON s.domain_id = l.range_id
              WHERE l.property_code = 'P127'
            )
            SELECT jsonb_agg(caseids) AS ids
            FROM (
              SELECT domain_id AS caseIDS FROM subcategories
              UNION ALL
              SELECT range_id AS caseIDS FROM subcategories
            ) a
    """
    g.cursor.execute(sql, {'root_': root})
    result = g.cursor.fetchone()
    return tuple(result.ids) if result.ids else (root,)


def get_case_study_names(case_studies: tuple[Any], openatlas_class: str):
    root_ = app.config['CASE_STUDY']
    sql = """
    WITH case_data AS (
      SELECT 
        id,
        name,
        (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197088) AS en,
        (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197086) AS de,
        CASE id WHEN %(root_)s THEN 1 ELSE 2 END AS sortorder
      FROM model.entity e
      WHERE id IN %(case_studies)s
    )
    SELECT *
    FROM case_data
    WHERE id IN (SELECT DISTINCT jsonb_array_elements(cases)::INT AS case_studiesAll
                      FROM (SELECT ents.id, jsonb_agg(DISTINCT t.path) as cases
                            FROM (SELECT id, entName, jsonb_array_elements(cases) AS caseid FROM (SELECT id, entName, cases FROM
        (SELECT id, entName, JSONB_AGG(typeName) AS cases
        FROM (SELECT a.id, a.name AS entName, e.id AS typeName
        FROM model.entity a
               JOIN model.link l ON a.id = l.domain_id
               JOIN model.entity e ON l.range_id = e.id
        WHERE l.property_code = 'P2' AND l.range_id IN %(case_studies)s AND a.openatlas_class_name IN %(openAtlasClass)s
        ORDER BY a.id) v GROUP BY  v.id, v.entName) c) x ) AS ents
                                     JOIN (SELECT id, jsonb_array_elements(path) AS path
                                           FROM (WITH RECURSIVE my_tree AS (SELECT e2.id         AS child_id,
                                                                                   e.id          AS parent_id,
                                                                                   ARRAY [e2.id] AS path
                                                                            FROM model.entity e
                                                                                     JOIN model.link l ON e.id = l.range_id
                                                                                     JOIN model.entity e2 ON l.domain_id = e2.id
                                                                            WHERE l.property_code = 'P127'
                                                                              AND e2.id = 196063
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
                           GROUP BY ents.id ) a)
    ORDER BY sortorder;
    
    """
    g.cursor.execute(sql, {
        'case_studies': case_studies,
        'root_': root_,
        'openAtlasClass': openatlas_class})
    if result := g.cursor.fetchall():
        return result
    g.cursor.execute("""
        SELECT 
            id,
            name,
            (SELECT description FROM model.link
                WHERE range_id = e.id AND domain_id = 197088) AS en,
            (SELECT description FROM model.link
                WHERE range_id = e.id AND domain_id = 197086) AS de,
            CASE id WHEN %(root_)s THEN 1 ELSE 2 END AS sortorder
          FROM model.entity e
          WHERE id IN %(case_studies)s
        """, {'case_studies': case_studies, 'root_': root_})
    return g.cursor.fetchall()


def getMainImage(entity_id, images):
    g.cursor.execute("""
        SELECT f.filename, w.image_id
        FROM web.entity_profile_image w JOIN bitem.files f ON f.id = w.image_id
        WHERE w.entity_id = %(id)s
    """, {'id': entity_id})
    result = g.cursor.fetchone()
    return result.filename if result else images[0]

def makeGeomTable():

    sql = """
DROP TABLE IF EXISTS bitem.geometries;
CREATE TABLE bitem.geometries AS
SELECT location_id,
       place_id,
       place_name,
       jsonb_build_object(
               'type', 'Feature',
               'properties', jsonb_build_object('id', location_id, 'place_id', place_id, '_label',
                                                (SELECT bitem.translation(place_id, '{197086, 197088}')), 'type',
                                                bitem.get_maintype(place_id)),
               'geometry', jsonb_build_object(
                       'type', 'GeometryCollection',
                       'geometries', geom
                           )) AS geometry
FROM (SELECT g.location_id,
             g.place_id,
             g.place_name,
             jsonb_agg(ST_AsGeoJSON(ST_ForcePolygonCCW(g.geom))::jsonb ||
    jsonb_build_object('geomtype', geomtype) || jsonb_build_object('name', name) || jsonb_build_object('description', description)) AS geom
      FROM (SELECT g.entity_id AS location_id,
                   l.domain_id AS place_id,
                   e.name      AS place_name,
                   CASE
                       WHEN g.geom_point IS NOT NULL THEN 'point'
                       WHEN g.geom_linestring IS NOT NULL THEN 'linestring'
                       WHEN g.geom_polygon IS NOT NULL THEN 'polygon'
                       END     AS type,
                   CASE
                       WHEN g.geom_point IS NOT NULL THEN 'direct_geom'
                       WHEN g.geom_linestring IS NOT NULL THEN 'direct_geom'
                       WHEN g.geom_polygon IS NOT NULL THEN 'direct_geom'
                       END     AS geomtype,                                
                   CASE
                       WHEN g.geom_point IS NOT NULL THEN (g.geom_point)
                       WHEN g.geom_linestring IS NOT NULL THEN (g.geom_linestring)
                       WHEN g.geom_polygon IS NOT NULL THEN (g.geom_polygon)
                       END     AS geom,
                   g.description,
                   g.name
            FROM model.gis g
                     JOIN model.link l ON g.entity_id = l.range_id
                     JOIN model.entity e ON e.id = l.domain_id
            WHERE l.property_code = 'P53'
              AND l.domain_id IN (SELECT ids
                                  FROM bitem.get_entities(
                                          ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                                          196063
                                       ))
            UNION ALL
            SELECT g.entity_id AS location_id,
                   l.domain_id AS place_id,
                   e.name      AS place_name,
                   CASE
                       WHEN g.geom_linestring IS NOT NULL THEN 'point'
                       WHEN g.geom_polygon IS NOT NULL THEN 'point'
                       END     AS type,
                   CASE
                       WHEN g.geom_linestring IS NOT NULL THEN 'derived_point'
                       WHEN g.geom_polygon IS NOT NULL THEN 'derived_point'
                       END     AS geomtype,
                   CASE
                       WHEN g.geom_linestring IS NOT NULL THEN (st_pointonsurface(g.geom_linestring))
                       WHEN g.geom_polygon IS NOT NULL THEN (st_pointonsurface(g.geom_polygon))
                       END     AS geom,
                   g.description,
                   g.name
            FROM model.gis g
                     JOIN model.link l ON g.entity_id = l.range_id
                     JOIN model.entity e ON e.id = l.domain_id

            WHERE g.geom_linestring IS NOT NULL AND l.property_code = 'P53' AND l.domain_id IN (SELECT ids
                                                                                                FROM bitem.get_entities(
                                                                                                        ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                                                                                                        196063
                                                                                                     ))
               OR g.geom_polygon IS NOT NULL AND l.property_code = 'P53' AND l.domain_id IN (SELECT ids
                                                                                             FROM bitem.get_entities(
                                                                                                     ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                                                                                                     196063
                                                                                                  ))) g
      GROUP BY g.location_id, g.place_id, g.place_name) b
WHERE place_id IN (SELECT ids
                   FROM bitem.get_entities(
                           ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                           196063
                        ));   
    """
    g.cursor.execute(sql)

def makeItemTable():
    import json
    from bitem.util import data_mapper, iiiftools
    sql = """
            SELECT ids
               FROM bitem.get_entities(
                       --ARRAY ['group', 'person'],
                       ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                       196063
                   )
    """

    g.cursor.execute(sql)
    #g.cursor.execute('select id AS ids from model.entity WHERE id in (196952)')

    ids = g.cursor.fetchall()

    for row in ids:
        g.cursor.execute(f'SELECT images FROM bitem.allitems WHERE id = {row.ids}')
        images = g.cursor.fetchone()
        mainimage = None
        imagearray = None
        if images.images:
            finalimages = []
            mainimage = iiiftools.setIIIFSize((data_mapper.getMainImage(row.ids, images.images)), 300, 500)
            print('mainimage: ' + str(mainimage))
            for img in images.images:
                print(img)
                finalimages.append(iiiftools.setIIIFSize(img, 400, 700))
            imagearray = finalimages


        print(imagearray)



        sql_insert = """
            DELETE FROM bitem.tbl_allitems WHERE id = %(id)s;
            INSERT INTO bitem.tbl_allitems (id, openatlas_class_name, data) (SELECT id,
       openatlas_class_name,
       jsonb_strip_nulls(jsonb_build_object(
               'id', id,
               'casestudies', casestudies,
               '_class', openatlas_class_name,
               '_label', bitem.translation(id, '{197086, 197088}'),
               'type', bitem.get_maintype(id),
               'content', bitem.desc_translation(description, '{197086, 197088}'),
               'start', begin,
               'end', "end",
               'image', (NULLIF(%(mainimage)s, 'Null'))::JSONB, 
               'images', (NULLIF(%(imagearray)s, 'Null'))::JSONB,
               'models', models,
               'geometry', geometry,
               'connections', connections
           )) AS data
        FROM bitem.allitems WHERE id = %(id)s)
        """

        g.cursor.execute(sql_insert, {'id': row.ids, 'mainimage': json.dumps(mainimage), 'imagearray': json.dumps(imagearray)})
