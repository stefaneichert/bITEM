from flask import g
from bitem import app


def setup_db():
    languages = app.config['TRANSLATION_IDS']
    classes = app.config['VIEW_CLASSES']
    root = str(app.config['CASE_STUDY'])
    print('root: ' + str(root))
    print(type(root))

    all_classes = (classes['actors'] + classes['items'] + classes['places'] + classes['events'])

    actors = str(classes['actors']).replace(',)', ')')
    print('actors: ')
    print(actors)

    artifact = str(classes['items']).replace(',)', ')')
    print('artifact: ')
    print(artifact)
    place = str(classes['places']).replace(',)', ')')
    print('place: ')
    print(place)
    events = str(classes['events']).replace(',)', ')')
    print('events:')
    print(events)


    all_classes = str(list(all_classes))
    print(all_classes)

    language_ids = []
    for value in languages.values():
        language_ids.append(value)
    language_ids = str(language_ids).replace('[', '{')
    language_ids = str(language_ids).replace(']', '}')

    print(language_ids)
    print(type(language_ids))
    
    sql = """
    DROP SCHEMA IF EXISTS bitem CASCADE;
    CREATE SCHEMA bitem;

    -- get all ids of certain classes from one case study resp. a root case study
    DROP FUNCTION IF EXISTS bitem.get_entities(classes TEXT[], root INT);
    CREATE OR REPLACE FUNCTION bitem.get_entities(classes TEXT[], root INT)
        RETURNS TABLE
                (
                    ids INT
                )
        LANGUAGE plpgsql
    AS
    $$
    BEGIN
        RETURN QUERY
            SELECT e.id
            FROM model.entity e
                     JOIN model.link l ON e.id = l.domain_id
            WHERE e.openatlas_class_name = ANY (classes)
              AND l.property_code = 'P2'
              AND l.range_id = ANY (WITH RECURSIVE subcategories AS (SELECT domain_id, range_id
                                                                     FROM model.link
                                                                     WHERE range_id = root
                                                                       AND property_code = 'P127'

                                                                     UNION ALL

                                                                     SELECT l.domain_id, l.range_id
                                                                     FROM model.link l
                                                                              INNER JOIN subcategories s ON s.domain_id = l.range_id
                                                                     WHERE l.property_code = 'P127')
                                    SELECT caseids AS ids
                                    FROM (SELECT domain_id AS caseIDS
                                          FROM subcategories
                                          UNION ALL
                                          SELECT range_id AS caseIDS
                                          FROM subcategories) a);
    END;
    $$;
    
    DROP FUNCTION IF EXISTS bitem.translation CASCADE;
    CREATE OR REPLACE FUNCTION bitem.translation(current_id INT, languages INT[])
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_translation TEXT;
        final_translation  TEXT;
        lan                INT;
        lan_label          TEXT;
        crm_class          TEXT;


    BEGIN
        SELECT cidoc_class_code FROM model.entity WHERE id = current_id INTO crm_class;
        CASE 
            WHEN crm_class = 'E55'
                THEN SELECT '{ "name":"' || replace(replace(replace(e.name, '\', '\\'), '"', '\\"'), '{', '\{') || '", "id": '|| current_id::TEXT FROM model.entity e WHERE e.id = current_id INTO final_translation;
        
            ELSE SELECT '{ "name":"' || replace(replace(replace(e.name, '\', '\\'), '"', '\\"'), '{', '\{') || '"'::TEXT FROM model.entity e WHERE e.id = current_id INTO final_translation;
        END CASE;
        FOREACH lan IN ARRAY languages
            LOOP

                SELECT null INTO lan_label;
                SELECT null INTO return_translation;
                SELECT description FROM model.entity WHERE id = lan INTO lan_label;
                SELECT replace(replace(replace(l.description, '\', '\\'), '"', '\\"'), '{', '\{')
                FROM model.link l
                WHERE l.domain_id = lan
                  AND l.range_id = current_id
                INTO return_translation;

                CASE
                    WHEN return_translation IS NOT NULL
                        THEN SELECT final_translation || ',"' || lan_label || '":"' || return_translation || '"'
                             INTO final_translation;

                    ELSE SELECT final_translation INTO final_translation;
                    END CASE;
            END LOOP;


        SELECT final_translation || '}' INTO final_translation;

        RETURN (SELECT final_translation::JSONB);
    END;
    $$;
    
    DROP FUNCTION IF EXISTS bitem.get_all_supertypes CASCADE;
    CREATE OR REPLACE FUNCTION bitem.get_all_supertypes(current_id INT, languages INT[])
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        supertypes JSONB;
    BEGIN

    WITH RECURSIVE supercategories AS (SELECT domain_id, range_id
                                       FROM model.link
                                       WHERE domain_id = current_id
                                         AND property_code = 'P127'
    
                                       UNION ALL
    
                                       SELECT l.domain_id, l.range_id
                                       FROM model.link l
                                                INNER JOIN supercategories s ON s.range_id = l.domain_id
                                       WHERE l.property_code = 'P127')
    SELECT jsonb_agg(bitem.translation(caseIDS, languages)) AS ids
    FROM (SELECT DISTINCT caseIDS
          FROM (SELECT range_id AS caseIDS
                FROM supercategories
                UNION ALL
                SELECT domain_id AS caseIDS
                FROM supercategories
                ) a) b  WHERE caseIDS != current_id AND caseIDS NOT IN (SELECT id FROM web.hierarchy) INTO supertypes;
            RETURN (SELECT supertypes::JSONB);
        END;
        $$;

    
    CREATE OR REPLACE FUNCTION bitem.get_maintype(current_id INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_maintype JSONB;
    BEGIN
        SELECT bitem.translation(e.id, '""" + language_ids + """') || jsonb_build_object('supertypes', bitem.get_all_supertypes(e.id, '""" + language_ids + """')) AS maintype
        FROM model.entity e
                 JOIN model.link l ON e.id = l.range_id
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
          AND l.property_code = 'P2'
          AND l.domain_id = current_id
        INTO return_maintype;

        RETURN return_maintype;
    END;
    $$;


    -- predefined view of GeoJSON geometries per location id
    DROP TABLE IF EXISTS bitem.geometries;
    CREATE TABLE bitem.geometries AS
    SELECT location_id,
           place_id,
           place_name,
           jsonb_build_object(
                   'type', 'Feature',
                   'properties', jsonb_build_object('id', location_id, 'place_id', place_id, '_label', bitem.translation(place_id, '""" + language_ids + """'), 'type', bitem.get_maintype(place_id)),
                   'geometry', jsonb_build_object(
                           'type', 'GeometryCollection',
                           'geometries', geom
                       )) AS geometry
    FROM (SELECT g.location_id, g.place_id, g.place_name, jsonb_agg(ST_AsGeoJSON(ST_ForcePolygonCCW(g.geom))::jsonb) AS geom
          FROM (SELECT g.entity_id AS location_id,
                       l.domain_id AS place_id,
                       e.name AS place_name,
                       CASE
                           WHEN g.geom_point IS NOT NULL THEN 'point'
                           WHEN g.geom_linestring IS NOT NULL THEN 'linestring'
                           WHEN g.geom_polygon IS NOT NULL THEN 'polygon'
                           END     AS type,
                       CASE
                           WHEN g.geom_point IS NOT NULL THEN (g.geom_point)
                           WHEN g.geom_linestring IS NOT NULL THEN (g.geom_linestring)
                           WHEN g.geom_polygon IS NOT NULL THEN (g.geom_polygon)
                           END     AS geom
                FROM model.gis g JOIN model.link l ON g.entity_id = l.range_id JOIN model.entity e ON e.id = l.domain_id
                WHERE l.property_code = 'P53'
                UNION ALL
                SELECT g.entity_id AS location_id,
                       l.domain_id AS place_id,
                       e.name AS place_name,
                       CASE
                           WHEN g.geom_linestring IS NOT NULL THEN 'point'
                           WHEN g.geom_polygon IS NOT NULL THEN 'point'
                           END     AS type,
                       CASE
                           WHEN g.geom_linestring IS NOT NULL THEN (st_pointonsurface(g.geom_linestring))
                           WHEN g.geom_polygon IS NOT NULL THEN (st_pointonsurface(g.geom_polygon))
                           END     AS geom
                FROM model.gis g JOIN model.link l ON g.entity_id = l.range_id JOIN model.entity e ON e.id = l.domain_id

                WHERE g.geom_linestring IS NOT NULL AND l.property_code = 'P53'
                   OR g.geom_polygon IS NOT NULL AND l.property_code = 'P53') g
          GROUP BY g.location_id, g.place_id, g.place_name) b WHERE place_id IN (SELECT ids
                   FROM bitem.get_entities(
                           ARRAY """ + all_classes + """,
                           """ + root + """
                       ));

    -- get place coordinates from children nodes
    CREATE OR REPLACE FUNCTION bitem.get_place_coords(current_id INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        location        INT;
        return_geometry JSONB;
    BEGIN
        WITH RECURSIVE
            parent_tree AS (SELECT p.parent_id, p.child_id, ARRAY [p.child_id] AS path, 1 AS depth
                            FROM (SELECT domain_id as parent_id, range_id as child_id
                                  FROM model.link
                                  WHERE property_code = 'P46') p
                            WHERE p.child_id = current_id
                            UNION ALL
                            SELECT t.parent_id, t.child_id, pt.path || ARRAY [t.child_id], pt.depth + 1
                            FROM (SELECT domain_id as parent_id, range_id as child_id
                                  FROM model.link
                                  WHERE property_code = 'P46') t
                                     JOIN parent_tree pt ON pt.parent_id = t.child_id),
            root_nodes AS (SELECT DISTINCT ON (path[1]) path[1] AS child_id, parent_id AS top_level
                           FROM parent_tree
                           WHERE parent_id IS NOT NULL
                           ORDER BY path[1], depth DESC)
        SELECT l.range_id
        INTO location
        FROM root_nodes r
                 JOIN parent_tree a ON a.child_id = r.child_id
                 JOIN model.link l ON r.top_level = l.domain_id
        WHERE l.domain_id = r.top_level
          AND l.property_code = 'P53';

        SELECT geometry
        INTO return_geometry
        FROM bitem.geometries g
        WHERE g.location_id = location
          AND location IN (SELECT location_id FROM bitem.geometries);
        RETURN return_geometry;
    END;
    $$;


    CREATE OR REPLACE FUNCTION bitem.get_coords(current_id INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_geometry JSONB;
    BEGIN
        SELECT geometry
        INTO return_geometry
        FROM bitem.geometries g
        WHERE g.location_id = current_id
          AND current_id IN (SELECT location_id FROM bitem.geometries);

        RETURN return_geometry;
    END;
    $$;


    DROP FUNCTION IF EXISTS bitem.all_cases CASCADE;
    CREATE OR REPLACE FUNCTION bitem.all_cases(root INT)
        RETURNS TABLE (
            ids INT
                      )
        LANGUAGE plpgsql
    AS
    $$    
    DECLARE
        cases JSONB;
    BEGIN
        RETURN QUERY
        WITH RECURSIVE subcategories AS (SELECT domain_id, range_id
                                         FROM model.link
                                         WHERE range_id = root
                                           AND property_code = 'P127'
    
                                         UNION ALL
    
                                         SELECT l.domain_id, l.range_id
                                         FROM model.link l
                                                  INNER JOIN subcategories s ON s.domain_id = l.range_id
                                         WHERE l.property_code = 'P127')
        SELECT DISTINCT caseids AS ids
        FROM (SELECT domain_id AS caseIDS
              FROM subcategories
              UNION ALL
              SELECT range_id AS caseIDS
              FROM subcategories) a;
    
    END;
    $$;


    CREATE OR REPLACE FUNCTION bitem.get_imgs(current_id INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_images JSONB;
    BEGIN
        SELECT JSONB_AGG(f.id) as images
        FROM model.entity f
                 JOIN model.link l ON f.id = l.domain_id

        WHERE l.property_code = 'P67'

          AND f.openatlas_class_name = 'file'
          AND l.range_id = current_id
        INTO return_images;
        RETURN return_images;
    END;
    $$;
    
    
    DROP FUNCTION IF EXISTS bitem.desc_translation CASCADE;
    CREATE OR REPLACE FUNCTION bitem.desc_translation(current_text text, languages INT[])
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_translation TEXT;
        final_translation  TEXT;
        lan                INT;
        lan_label          TEXT;
        lan_string         TEXT;
    BEGIN
        CASE
            WHEN current_text IS NULL THEN return NULL;
            ELSE SELECT regexp_replace(current_text, E'[\\n\\r]+', ' ', 'g') INTO current_text;
                 SELECT replace(replace(replace(current_text, '\', '\\'), '"', '\\"'), '{', '\{') INTO current_text;
                 SELECT '{ "description":"' || current_text
                 INTO final_translation;
                 FOREACH lan IN ARRAY languages
                     LOOP
                         SELECT null INTO lan_label;
                         SELECT null INTO return_translation;
                         SELECT LOWER(description) FROM model.entity WHERE id = lan INTO lan_label;
                         SELECT '##' || lan_label || '_##(.*?)##_' || lan_label || '##'::text INTO lan_string;
                         SELECT substring(current_text, lan_string) INTO return_translation;
                         CASE
                             WHEN return_translation IS NOT NULL
                                 THEN SELECT final_translation || '","' || lan_label || '":"' || TRIM(return_translation)
                                      INTO final_translation;
                             ELSE SELECT final_translation INTO final_translation;
                             END CASE;
                     END LOOP;

                 SELECT final_translation || '"}' INTO final_translation;
            END CASE;
        RETURN (SELECT final_translation)::JSONB;
    END;
    $$;
    
    


    -- get function name if directed property in OA7
    CREATE OR REPLACE FUNCTION bitem.directionfunction(current_id INT, target_id INT, function TEXT, current_type_id INT)
        RETURNS TEXT
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_direction TEXT;
        left_            TEXT;
        right_           TEXT;


    BEGIN
        CASE
            WHEN function LIKE '%)' THEN SELECT split_part(function, ' (', 1) INTO left_;
                                         SELECT split_part(function, '(', 2) INTO right_;
                                         SELECT replace(right_, ')', '') INTO right_;
                                         SELECT right_ INTO return_direction;
                                         CASE
                                             WHEN EXISTS (SELECT domain_id, range_id
                                                          FROM model.link
                                                          WHERE domain_id = current_id
                                                            AND range_id = target_id
                                                            AND property_code = 'OA7'
                                                            AND type_id = current_type_id)
                                                 THEN SELECT left_ INTO return_direction;
                                             ELSE SELECT right_ INTO return_direction;
                                             END CASE;
            ELSE SELECT function INTO return_direction;
            END CASE;
        RETURN return_direction;
    END;
    $$;

    
    DROP FUNCTION IF EXISTS bitem.get_toplocationid CASCADE;
    CREATE OR REPLACE FUNCTION bitem.get_toplocationid(current_id INT)
        RETURNS INT
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_id INT;
        class TEXT;
    BEGIN
        SELECT openatlas_class_name FROM model.entity WHERE id = current_id INTO class;
        CASE WHEN class = 'place' THEN
            SELECT range_id FROM model.link WHERE domain_id = current_id AND property_code = 'P53' INTO return_id;
            ELSE WITH RECURSIVE
            parent_tree AS (SELECT p.parent_id, p.child_id, ARRAY [p.child_id] AS path, 1 AS depth
                            FROM (SELECT domain_id as parent_id, range_id as child_id
                                  FROM model.link
                                  WHERE property_code = 'P46') p
                            WHERE p.child_id = current_id
                            UNION ALL
                            SELECT t.parent_id, t.child_id, pt.path || ARRAY [t.child_id], pt.depth + 1
                            FROM (SELECT domain_id as parent_id, range_id as child_id
                                  FROM model.link
                                  WHERE property_code = 'P46') t
                                     JOIN parent_tree pt ON pt.parent_id = t.child_id),
            root_nodes AS (SELECT DISTINCT ON (path[1]) path[1] AS child_id, parent_id AS top_level
                           FROM parent_tree
                           WHERE parent_id IS NOT NULL
                           ORDER BY path[1], depth DESC)
        SELECT l.range_id INTO return_id
        FROM root_nodes r
                 JOIN parent_tree a ON a.child_id = r.child_id
                 JOIN model.link l ON r.top_level = l.domain_id
        WHERE l.domain_id = r.top_level
          AND l.property_code = 'P53';
        END CASE;
        CASE WHEN return_id ISNULL THEN SELECT 0 into return_id;
        ELSE SELECT return_id INTO return_id;
        END CASE;
        RETURN return_id;
    END;
    $$;
    
    DROP FUNCTION IF EXISTS bitem.all_subtypes CASCADE;
    CREATE OR REPLACE FUNCTION bitem.all_subtypes(root INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_cases JSONB;
    
    BEGIN
        WITH RECURSIVE ChildHierarchy AS (
            -- Anchor member
            SELECT domain_id, range_id, property_code
            FROM model.link
            WHERE range_id = root
              AND property_code = 'P127'
            UNION
            -- Recursive member
            SELECT ln.domain_id, ln.range_id, ln.property_code
            FROM model.link ln
                     INNER JOIN ChildHierarchy ch ON ln.range_id = ch.domain_id AND ln.property_code = 'P127')
        SELECT jsonb_agg(DISTINCT id)
        FROM (SELECT DISTINCT domain_id as id
              FROM ChildHierarchy
              UNION ALL
              SELECT root as id) i
        INTO return_cases;
    
        RETURN return_cases;
    END ;
    $$;
    
    

    CREATE FUNCTION bitem.all_caseids(root INT, entity_id INT)
        RETURNS JSONB
        LANGUAGE plpgsql
    AS
    $$
    DECLARE
        return_cases JSONB;
        location_id INT;
    
    BEGIN
        WITH RECURSIVE ParentHierarchy AS (
            -- Anchor member
            SELECT domain_id, range_id, property_code
            FROM model.link
            WHERE domain_id IN (SELECT range_id
    from model.link
    WHERE domain_id = entity_id
      and property_code = 'P2' AND range_id IN (SELECT jsonb_array_elements(bitem.all_subtypes(root))::INT))
              AND property_code = 'P127'
            UNION
            -- Recursive member
            SELECT ln.domain_id, ln.range_id, ln.property_code
            FROM model.link ln
                     INNER JOIN ParentHierarchy ch ON ln.domain_id = ch.range_id AND ln.property_code = 'P127')
        SELECT jsonb_agg(DISTINCT id)
        FROM (SELECT DISTINCT domain_id as id
              FROM ParentHierarchy
              ) i
        INTO return_cases;
    
        RETURN return_cases;
    END ;
    $$;

    DROP FUNCTION IF EXISTS bitem.get_connections(current_id INT) CASCADE;
    CREATE OR REPLACE FUNCTION bitem.get_connections(current_id INT)
        RETURNS TABLE
                (
                    class_      TEXT,
                    connections JSONB

                )
        LANGUAGE plpgsql
    AS
    $$
    BEGIN
        RETURN QUERY
            SELECT a.openatlas_class_name as class_,
                   jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                           'link', a.link || ' - ' || a.link_name,
                           'id', a.id,
                           'geometry', bitem.get_coords(a.id),
                           '_label', bitem.translation(a.id, '""" + language_ids + """'),
                            'type', bitem.get_maintype(a.id),
                           'content', bitem.desc_translation(a.descr, '""" + language_ids + """'),
                           'images', a.image,
                           'begin', a.mainfirst,
                           'end', a.mainlast,
                           'involvement', NULLIF(a.involvement, '[{}]')
                       )))                as connections
            FROM (SELECT DISTINCT e.id,
                                  l.property_code                               AS link,
                                  CASE
                                      WHEN l.domain_id = e.id THEN c.name_inverse
                                      WHEN l.range_id = e.id THEN c.name
                                      END                                          link_name,

                                  e.name,
                                  NULLIF(e.description, '')                     AS descr,
                                  e.openatlas_class_name,
                                  (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT AS mainfirst,
                                  (GREATEST(e.end_from, e.end_to)::DATE)::TEXT  AS mainlast,
                                  g.image                                       AS image,
                                  jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                                          'invbegin', (LEAST(l.begin_from, l.begin_to)::DATE)::TEXT,
                                          'invend', (GREATEST(l.end_from, l.end_to)::DATE)::TEXT,
                                          'info', NULLIF(l.description, ''),
                                          'qualifier', (CASE
                                                            WHEN fu.id IN (SELECT type_id FROM model.link WHERE property_code != 'OA7')
                                                                THEN bitem.translation(fu.id, '""" + language_ids + """') || jsonb_build_object('supertypes', bitem.get_all_supertypes(fu.id, '""" + language_ids + """')) 
                                                            WHEN fu.id IN (SELECT type_id FROM model.link WHERE property_code = 'OA7')
                                                                THEN jsonb_build_object('name',
                                                                                        bitem.directionfunction(current_id, e.id, fu.function, fu.id))
                                              END),
                                          'qualifierID', fu.id)))                  involvement
                  FROM model.entity e
                           JOIN model.link l ON e.id IN (l.range_id, l.domain_id)
                           JOIN model.property c ON c.code = l.property_code
                           LEFT JOIN (SELECT l.range_id as ent_id, JSONB_AGG(f.id) as image
                                      FROM model.entity f
                                               JOIN model.link l ON f.id = l.domain_id

                                      WHERE l.property_code = 'P67'

                                        AND f.openatlas_class_name = 'file'
                                      GROUP BY l.range_id) g
                                     ON g.ent_id = e.id
                           LEFT JOIN (SELECT DISTINCT fe.id, fe.name as function
                                      FROM model.entity fe
                                               JOIN model.link l2 ON fe.id IN (l2.domain_id, l2.range_id)) fu
                                     ON fu.id = l.type_id
                  WHERE current_id IN (l.domain_id, l.range_id) AND e.id != current_id 
                  OR (SELECT bitem.get_toplocationid(current_id)) IN (l.domain_id, l.range_id) AND e.openatlas_class_name != 'place'
                  OR (SELECT range_id FROM model.link WHERE domain_id = current_id AND property_code = 'P53') IN (l.domain_id, l.range_id) AND e.openatlas_class_name NOT IN ('place', 'feature', 'stratigraphic_unit', 'artifact', 'human_remains') 
                  GROUP BY e.id, link_name, e.description, l.property_code, e.name, g.image, e.openatlas_class_name,
                           (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT, (GREATEST(e.end_from, e.end_to)::DATE)::TEXT) a
            GROUP BY openatlas_class_name;
    END;
    $$;

    DROP VIEW IF EXISTS bitem.allitems;
    CREATE VIEW bitem.allitems AS
    SELECT e.id,
           bitem.all_caseids(""" + root + """, e.id) AS casestudies,
           CASE
               WHEN e.openatlas_class_name IN """ + artifact + """ THEN JSONB_AGG(bitem.get_place_coords(e.id))::jsonb
               WHEN e.openatlas_class_name IN """ + place + """ THEN (SELECT JSONB_AGG(bitem.get_coords(range_id))
                                                              FROM model.link
                                                              WHERE domain_id = e.id
                                                                AND property_code = 'P53')
               WHEN e.openatlas_class_name IN
                    """ + events + """
                   THEN (SELECT JSONB_AGG(bitem.get_coords(range_id))::jsonb
                         FROM model.link
                         WHERE domain_id = e.id
                           AND property_code IN ('P7', 'P26', 'P27'))
               WHEN e.openatlas_class_name IN """ + actors + """
                   THEN (SELECT DISTINCT JSONB_AGG(bitem.get_coords(range_id))::jsonb
                         FROM model.link
                         WHERE domain_id = e.id
                           AND property_code IN ('OA8', 'OA9', 'P74'))
               END                                               AS geometry,
           e.name,
           bitem.translation(e.id, '""" + language_ids + """'),
           e.openatlas_class_name,
           e.description,
           bitem.get_imgs(e.id)                                  AS images,
           (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT         AS begin,
           (GREATEST(e.end_from, e.end_to)::DATE)::TEXT          AS end,
           (SELECT jsonb_agg(jsonb_build_object('class',
                                                (CASE WHEN class_ = 'object_location' THEN 'place' ELSE class_ END),
                                                'connections', connections)) c1
            FROM (SELECT * FROM bitem.get_connections(e.id)) c2) AS connections


    FROM model.entity e

    WHERE e.id IN (SELECT ids
                   FROM bitem.get_entities(
                           ARRAY """ + all_classes + """,
                           """ + root + """
                       ))
    GROUP BY e.id, e.name, e.openatlas_class_name, e.description, (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT,
             (GREATEST(e.end_from, e.end_to)::DATE)::TEXT;

    DROP TABLE IF EXISTS bitem.tbl_allitems;
    CREATE TABLE bitem.tbl_allitems AS
    SELECT id,
           openatlas_class_name,
           jsonb_strip_nulls(jsonb_build_object(
                   'id', id,
                   'casestudies', casestudies,
                   '_class', openatlas_class_name,
                   '_label', bitem.translation(id, '""" + language_ids + """'),
                   'type', bitem.get_maintype(id),
                   'content', bitem.desc_translation(description, '""" + language_ids + """'),
                   'start', begin,
                   'end', "end",
                   'images', images,
                   'geometry', geometry,
                   'connections', connections
               )) AS data
    FROM bitem.allitems;
    """
    print(sql)
    g.cursor.execute(sql)
