CREATE schema IF NOT EXISTS bitem;

-- get all ids of certain classes from one case study resp. a root case study
DROP FUNCTION IF EXISTS bitem.get_entities CASCADE;
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

DROP FUNCTION IF EXISTS bitem.find_root_type(entity_id integer, _property_code text) CASCADE;
CREATE OR REPLACE FUNCTION bitem.find_root_type(entity_id integer, _property_code text)
    RETURNS INTEGER AS
$$
DECLARE
    root_id integer;
    class TEXT;
BEGIN
    SELECT cidoc_class_code FROM model.entity WHERE id = entity_id INTO class;
    IF _property_code NOT IN ('P2', 'P127') THEN
        -- Return NULL if _property_code is not in the specified values
        RETURN NULL;
    END IF;

    IF _property_code = 'P2' THEN SELECT 'P127' INTO _property_code; END IF;

    -- Check if class is not 'E55' and return NULL
    IF class != 'E55' THEN
        RETURN NULL;
    END IF;

    -- Find the direct parent of the entity_id with the given property code
    SELECT range_id
    INTO root_id
    FROM model.link
    WHERE domain_id = entity_id
      AND property_code = _property_code;

    -- If a direct parent is found, recursively call the function to find its root parent
    IF root_id IS NOT NULL THEN
        RETURN bitem.find_root_type(root_id, _property_code);
    END IF;

    -- If no direct parent is found, return the original entity_id as it is the root
    RETURN entity_id;
END;
$$ LANGUAGE plpgsql;



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
            THEN SELECT '{ "name":"' || replace(replace(replace(e.name, '', '\'), '"', '\"'), '{', '\{') ||
                        '", "id": ' || current_id::TEXT
                 FROM model.entity e
                 WHERE e.id = current_id
                 INTO final_translation;

        ELSE SELECT '{ "name":"' || replace(replace(replace(e.name, '', '\'), '"', '\"'), '{', '\{') || '"'::TEXT
             FROM model.entity e
             WHERE e.id = current_id
             INTO final_translation;
        END CASE;
    FOREACH lan IN ARRAY languages
        LOOP

            SELECT null INTO lan_label;
            SELECT null INTO return_translation;
            SELECT description FROM model.entity WHERE id = lan INTO lan_label;
            SELECT replace(replace(replace(l.description, '', '\'), '"', '\"'), '{', '\{')
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

DROP FUNCTION IF EXISTS bitem.prop_translation CASCADE;
CREATE OR REPLACE FUNCTION bitem.prop_translation(current_prop TEXT, link TEXT, languages INT[])
    RETURNS JSONB
    LANGUAGE plpgsql
AS
$$
DECLARE
    return_translation TEXT;
    final_translation  TEXT;
    lan                INT;
    lan_label          TEXT;
    text_direct        TEXT;
    text_inv           TEXT;


BEGIN
    SELECT '{ "property_code": "' || current_prop || '", "name":"' ||
           replace(replace(replace(link, '', '\'), '"', '\"'), '{', '\{') || '"'::TEXT
    INTO final_translation;
    FOREACH lan IN ARRAY languages
        LOOP

            SELECT null INTO lan_label;
            SELECT null INTO return_translation;
            SELECT LOWER(description) FROM model.entity WHERE id = lan INTO lan_label;
            SELECT text
            FROM model.property_i18n
            WHERE property_code = current_prop
              AND lan_label = language_code
            INTO text_direct;
            SELECT text_inverse
            FROM model.property_i18n
            WHERE property_code = current_prop
              AND lan_label = language_code
            INTO text_inv;
            CASE
                WHEN text_inv IS NULL
                    THEN SELECT text_direct INTO text_inv;
                ELSE NULL;
                END CASE;

            CASE
                WHEN link = (SELECT text
                             FROM model.property_i18n
                             WHERE property_code = current_prop
                               AND 'en' = language_code)
                    THEN SELECT final_translation || ',"' || UPPER(lan_label) || '":"' || text_direct || '"'
                         INTO final_translation;

                ELSE SELECT final_translation || ',"' || UPPER(lan_label) || '":"' || text_inv || '"'
                     INTO final_translation;
                END CASE;
        END LOOP;


    SELECT final_translation || '}' INTO final_translation;

    RETURN (SELECT final_translation::JSONB);
END
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
                FROM supercategories) a) b
    WHERE caseIDS != current_id
      AND caseIDS NOT IN (SELECT id FROM web.hierarchy)
    INTO supertypes;
    RETURN (SELECT supertypes::JSONB);
END;
$$;

DROP FUNCTION IF EXISTS bitem.get_maintype CASCADE;
CREATE OR REPLACE FUNCTION bitem.get_maintype(current_id INT)
    RETURNS JSONB
    LANGUAGE plpgsql
AS
$$
DECLARE
    return_maintype JSONB;
BEGIN
    SELECT bitem.translation(e.id, '{197086, 197088}') ||
           jsonb_build_object('supertypes', bitem.get_all_supertypes(e.id, '{197086, 197088}')) AS maintype
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
             jsonb_agg(ST_AsGeoJSON(ST_ForcePolygonCCW(g.geom))::jsonb) AS geom
      FROM (SELECT g.entity_id AS location_id,
                   l.domain_id AS place_id,
                   e.name      AS place_name,
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
                       WHEN g.geom_linestring IS NOT NULL THEN (st_pointonsurface(g.geom_linestring))
                       WHEN g.geom_polygon IS NOT NULL THEN (st_pointonsurface(g.geom_polygon))
                       END     AS geom
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

-- get place coordinates from children nodes
DROP FUNCTION IF EXISTS bitem.get_place_coords CASCADE;
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

DROP FUNCTION IF EXISTS bitem.get_coords CASCADE;
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
    RETURNS TABLE
            (
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


DROP FUNCTION IF EXISTS bitem.get_imgs CASCADE;
CREATE OR REPLACE FUNCTION bitem.get_imgs(current_id INT)
    RETURNS JSONB
    LANGUAGE plpgsql
AS
$$
DECLARE
    return_images JSONB;
BEGIN
    SELECT JSONB_AGG(f.filename) as images
    FROM bitem.files f
             JOIN model.link l ON f.id = l.domain_id

    WHERE l.property_code = 'P67'

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
        ELSE SELECT regexp_replace(current_text, E'[\n\r]+', ' ', 'g') INTO current_text;
             SELECT replace(replace(replace(current_text, '', '\'), '"', '\"'), '{', '\{') INTO current_text;
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
DROP FUNCTION IF EXISTS bitem.directionfunction CASCADE;
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
    class     TEXT;
BEGIN
    SELECT openatlas_class_name FROM model.entity WHERE id = current_id INTO class;
    CASE
        WHEN class = 'place'
            THEN SELECT range_id FROM model.link WHERE domain_id = current_id AND property_code = 'P53' INTO return_id;
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
             SELECT l.range_id
             INTO return_id
             FROM root_nodes r
                      JOIN parent_tree a ON a.child_id = r.child_id
                      JOIN model.link l ON r.top_level = l.domain_id
             WHERE l.domain_id = r.top_level
               AND l.property_code = 'P53';
        END CASE;
    CASE
        WHEN return_id ISNULL THEN SELECT 0 into return_id;
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


DROP FUNCTION IF EXISTS bitem.all_caseids CASCADE;
CREATE FUNCTION bitem.all_caseids(root INT, entity_id INT)
    RETURNS JSONB
    LANGUAGE plpgsql
AS
$$
DECLARE
    return_cases JSONB;

BEGIN
    WITH RECURSIVE ParentHierarchy AS (
        -- Anchor member
        SELECT domain_id, range_id, property_code
        FROM model.link
        WHERE domain_id IN (SELECT range_id
                            from model.link
                            WHERE domain_id = entity_id
                              and property_code = 'P2'
                              AND range_id IN (SELECT jsonb_array_elements(bitem.all_subtypes(root))::INT))
          AND property_code = 'P127'
        UNION
        -- Recursive member
        SELECT ln.domain_id, ln.range_id, ln.property_code
        FROM model.link ln
                 INNER JOIN ParentHierarchy ch ON ln.domain_id = ch.range_id AND ln.property_code = 'P127')
    SELECT jsonb_agg(DISTINCT id)
    FROM (SELECT DISTINCT domain_id as id
          FROM ParentHierarchy) i
    INTO return_cases;

    RETURN return_cases;
END ;
$$;

DROP FUNCTION IF EXISTS bitem.get_eventplaces CASCADE;
CREATE OR REPLACE FUNCTION bitem.get_eventplaces(current_id INT)
    RETURNS TABLE
            (
                id INT
            )
    LANGUAGE plpgsql
AS
$$
BEGIN
    RETURN QUERY
        SELECT DISTINCT g.location_id
        FROM model.link l
                 JOIN model.entity e ON e.id IN (l.domain_id, l.range_id)
                 JOIN model.link l2 ON e.id IN (l2.domain_id, l2.range_id)
                 JOIN bitem.geometries g
                      ON g.location_id IN (l2.range_id, l2.domain_id)
        WHERE l.property_code IN ('P11', 'P14', 'P22', 'P23', 'P25', 'P31', 'P108', 'P24')
          AND e.openatlas_class_name IN
              ('acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification')
          AND current_id IN (l.domain_id, l.range_id)
          AND l2.property_code IN ('P7', 'P26', 'P27');

END;
$$;

DROP FUNCTION IF EXISTS bitem.get_subevent_ents CASCADE;
CREATE OR REPLACE FUNCTION bitem.get_subevent_ents(current_id INT)
    RETURNS TABLE
            (
                id INT
            )
    LANGUAGE plpgsql
AS
$$
DECLARE
    class TEXT;
BEGIN
    SELECT openatlas_class_name FROM model.entity a WHERE a.id = current_id INTO class;

    IF class IN ('acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification') THEN
        RETURN QUERY
            SELECT DISTINCT e.id
            FROM model.entity e
                     JOIN model.link l ON e.id IN (l.domain_id, l.range_id)
            WHERE current_id IN (l.domain_id, l.range_id)
              AND e.id != current_id;
    ELSE
        RETURN;
    END IF;
END;
$$;

DROP FUNCTION IF EXISTS bitem.get_involvement CASCADE;
CREATE FUNCTION bitem.get_involvement(origin INT, target_id INT, current_property_code TEXT)
    RETURNS JSONB
    LANGUAGE plpgsql
AS
$$
DECLARE
    return_cases JSONB;
    links        JSONB;

BEGIN
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
            'invbegin', (LEAST(l.begin_from, l.begin_to)::DATE)::TEXT,
            'invend', (GREATEST(l.end_from, l.end_to)::DATE)::TEXT,
            'info', NULLIF(l.description, ''),
            'qualifier', (CASE
                              WHEN l.type_id IN (SELECT type_id FROM model.link WHERE property_code != 'OA7')
                                  THEN bitem.translation(l.type_id, '{197086, 197088}') ||
                                       jsonb_build_object('supertypes',
                                                          bitem.get_all_supertypes(l.type_id, '{197086, 197088}'))
                              WHEN l.type_id IN (SELECT type_id FROM model.link WHERE property_code = 'OA7')
                                  THEN jsonb_build_object('name',
                                                          bitem.directionfunction(origin, target_id,
                                                                                  (SELECT name FROM model.entity WHERE id = l.type_id),
                                                                                  l.type_id))
                END),
            'qualifierID', l.type_id))) specification
    FROM (SELECT *
          FROM model.link
          WHERE domain_id = origin
            AND range_id = target_id
            AND property_code = current_property_code
          UNION ALL
          SELECT *
          FROM model.link
          WHERE range_id = origin
            AND domain_id = target_id
            AND property_code = current_property_code) l
    INTO return_cases;
    RETURN return_cases;
END;
$$;

DROP FUNCTION IF EXISTS bitem.get_connection_ids CASCADE;
CREATE OR REPLACE FUNCTION bitem.get_connection_ids(current_id INT)
    RETURNS TABLE
            (
                origin               TEXT,
                origin_id            INT,
                openatlas_class_name TEXT,
                name                 TEXT,
                description          TEXT,
                mainfirst            TEXT,
                mainlast             TEXT,
                id                   INT,
                property_code        TEXT,
                property             TEXT
            )
    LANGUAGE plpgsql
AS
$$
DECLARE
    current_name TEXT;
BEGIN

    SELECT y.name FROM model.entity y WHERE y.id = current_id INTO current_name;
    RETURN QUERY
        --direkt connection ids
        SELECT DISTINCT current_name,
                        current_id,
                        e.openatlas_class_name,
                        e.name,
                        e.description,
                        (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT AS mainfirst,
                        (GREATEST(e.end_from, e.end_to)::DATE)::TEXT  AS mainlast,
                        e.id,
                        p.code,
                        CASE
                            WHEN l.range_id = e.id AND p.name_inverse IS NOT NULL THEN p.name_inverse
                            ELSE p.name
                            END                                          property
        FROM model.entity e
                 JOIN model.link l ON e.id IN (l.domain_id, l.range_id)
                 JOIN model.property p ON l.property_code = p.code
        WHERE current_id IN (l.domain_id, l.range_id)
          AND e.id != current_id
        UNION ALL
        -- subevent connection ids
        SELECT DISTINCT (SELECT x.name FROM model.entity x WHERE x.id = l1.range_id) AS origin,
                        l1.range_id                                                  AS origin_id,
                        e.openatlas_class_name,
                        e.name,
                        e.description,
                        (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT                AS mainfirst,
                        (GREATEST(e.end_from, e.end_to)::DATE)::TEXT                 AS mainlast,
                        e.id,
                        p.code,
                        CASE
                            WHEN l2.range_id = e.id AND p.name_inverse IS NOT NULL THEN p.name_inverse
                            ELSE p.name
                            END                                                         property
        FROM model.link l1
                 JOIN model.link l2 ON l1.range_id IN (l2.domain_id, l2.range_id)
                 JOIN model.entity e ON e.id IN (l2.domain_id, l2.range_id)
                 JOIN model.property p ON l2.property_code = p.code
        WHERE l1.domain_id = current_id
          AND l1.property_code = 'P9'
          AND current_id NOT IN (l2.domain_id, l2.range_id)
          AND l1.range_id != e.id;
END;
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
                       'id', a.id,
                       'spatialinfo', bitem.get_coords(a.id),
                       '_label', bitem.translation(a.id, '{197086, 197088}'),
                       'type', bitem.get_maintype(a.id),
                       'root_type', bitem.translation((bitem.find_root_type(id, 'P2')), '{197086, 197088}'),
                       'content', bitem.desc_translation(a.description, '{197086, 197088}'),
                       'images', a.image,
                       'begin', a.mainfirst,
                       'end', a.mainlast,
                       'involvement', NULLIF(a.connections, '[{}]')
                   )))                as connections
        FROM (SELECT DISTINCT c.*, i.image
              FROM (SELECT DISTINCT openatlas_class_name,
                                    name,
                                    id,
                                    NULLIF(description, '') AS description,
                                    mainfirst,
                                    mainlast,
                                    JSONB_AGG(jsonb_strip_nulls(jsonb_build_object('_label',
                                                                                   bitem.translation(id, '{197086, 197088}'),
                                                                                   'property',
                                                                                   bitem.prop_translation(property_code, property, '{197086, 197088}'),
                                                                                   'origin',
                                                                                   bitem.translation(origin_id, '{197086, 197088}'),
                                                                                   'origin_id',
                                                                                   origin_id,
                                                                                    'begin', (SELECT (LEAST(begin_from, begin_to)::DATE)::TEXT FROM model.entity WHERE id = origin_id),
                                                                                    'end', (SELECT (LEAST(end_from, end_to)::DATE)::TEXT FROM model.entity WHERE id = origin_id),
                                                                                   'root_type', bitem.translation(
                                                                                           (bitem.find_root_type(id, property_code)),
                                                                                           '{197086, 197088}'),
                                                                                   'specification',
                                                                                   NULLIF(bitem.get_involvement(origin_id, id, property_code), '[{}]')
                                        )))                    connections
                    FROM bitem.get_connection_ids(current_id)
                    GROUP BY openatlas_class_name, description, name, id, mainfirst, mainlast
                    ORDER BY openatlas_class_name, id) c
                       LEFT JOIN (SELECT l.range_id as ent_id, JSONB_AGG(fi.filename) as image
                                  FROM model.entity f
                                           JOIN model.link l ON f.id = l.domain_id JOIN bitem.files fi ON fi.id = l.domain_id

                                  WHERE l.property_code = 'P67'

                                    AND f.openatlas_class_name = 'file'
                                  GROUP BY l.range_id) i
                                 ON i.ent_id = c.id) a
        GROUP BY openatlas_class_name;
END;
$$;

DROP VIEW IF EXISTS bitem.allitems;
CREATE VIEW bitem.allitems AS
SELECT e.id,
       bitem.all_caseids(196063, e.id)                       AS casestudies,
       CASE
           WHEN e.openatlas_class_name IN ('artifact') THEN JSONB_AGG(bitem.get_place_coords(e.id))::jsonb
           WHEN e.openatlas_class_name IN ('place') THEN (SELECT JSONB_AGG(bitem.get_coords(range_id))
                                                          FROM model.link
                                                          WHERE domain_id = e.id
                                                            AND property_code = 'P53')
           WHEN e.openatlas_class_name IN
                ('acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification')
               THEN (SELECT JSONB_AGG(bitem.get_coords(range_id))::jsonb
                     FROM model.link
                     WHERE domain_id = e.id
                       AND property_code IN ('P7', 'P26', 'P27'))
           WHEN e.openatlas_class_name IN ('person', 'group')
               THEN (SELECT DISTINCT JSONB_AGG(bitem.get_coords(range_id))::jsonb
                     FROM model.link
                     WHERE domain_id = e.id
                       AND property_code IN ('OA8', 'OA9', 'P74'))
           END                                               AS geometry,
       e.name,
       bitem.translation(e.id, '{197086, 197088}'),
       e.openatlas_class_name,
       e.description,
       bitem.get_imgs(e.id)                                  AS images,
       (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT         AS begin,
       (GREATEST(e.end_from, e.end_to)::DATE)::TEXT          AS end,
       (SELECT jsonb_agg(jsonb_build_object('class',
                                            (CASE WHEN class_ = 'object_location' THEN 'place' ELSE class_ END),
                                            'nodes', connections)) c1
        FROM (SELECT * FROM bitem.get_connections(e.id)) c2) AS connections


FROM model.entity e

WHERE e.id IN (SELECT ids
               FROM bitem.get_entities(
                       ARRAY ['person', 'group', 'artifact', 'place', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'],
                       196063
                   ))
GROUP BY e.id, e.name, e.openatlas_class_name, e.description, (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT,
         (GREATEST(e.end_from, e.end_to)::DATE)::TEXT;


DROP TABLE IF EXISTS bitem.tbl_allitems;
CREATE TABLE bitem.tbl_allitems (id INT, openatlas_class_name TEXT, data JSONB);


DROP TABLE IF EXISTS bitem.checkaccess;
CREATE TABLE bitem.checkaccess
(
    id          serial PRIMARY KEY,
    access_time timestamp with time zone NOT NULL DEFAULT now()::timestamp with time zone,
    entity_id   INT,
    access_type TEXT
);

CREATE OR REPLACE FUNCTION bitem.catch_updates()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF NEW.id IN (SELECT ids
                  FROM bitem.get_entities(
                          ARRAY ['acquisition', 'activity', 'artifact', 'group', 'modification', 'move', 'person', 'place', 'production', 'event', 'creation'],
                          196063
                      )) THEN
        INSERT INTO bitem.checkaccess (access_type, entity_id, access_time)
        VALUES ('update', new.id, NOW()::timestamp with time zone);
    END IF;
    RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS update_catcher ON model.entity;
CREATE TRIGGER update_catcher
    AFTER UPDATE OR INSERT
    ON model.entity
    FOR EACH ROW
EXECUTE PROCEDURE bitem.catch_updates();

CREATE OR REPLACE FUNCTION bitem.catch_deletes()
    RETURNS TRIGGER
    LANGUAGE plpgsql
AS
$$
BEGIN
    IF OLD.id IN (SELECT id FROM bitem.tbl_allitems) THEN
        DELETE FROM bitem.tbl_allitems WHERE id = OLD.id;
    END IF;
    RETURN NULL;
END
$$;

DROP TRIGGER IF EXISTS delete_catcher ON model.entity;
CREATE TRIGGER delete_catcher
    AFTER DELETE
    ON model.entity
    FOR EACH ROW
EXECUTE PROCEDURE bitem.catch_deletes();