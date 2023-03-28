from flask import g
from bitem import app


def getCases(root_):
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

    g.cursor.execute(sql, {'root_': root_})
    result = (g.cursor.fetchone())
    caseStudies = tuple(result.ids)
    return caseStudies


def getlist(openAtlasClass, caseStudies):

    sql = """
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id,
        '_label', name,
        '_labelDE', germanName,
        '_labelEN', englishName,
        'content', description,
        'first', first,
        'last', last,
        'types', type,
        'images', image,
        'casestudies', caseStudiesAll
               ))) as list
    FROM
(SELECT DISTINCT 
       a.id,
       a.name,
       b.germanName,
       c.englishName,
       a.description,
       (LEAST(a.begin_from, a.begin_to)::DATE)::TEXT AS first,
       (GREATEST(a.end_from, a.end_to)::DATE)::TEXT  AS last,
       d.maintype                                    AS type,
       e.mainimage                                   AS image,
       f.caseStudiesAll                              AS caseStudiesAll
FROM (SELECT e.id, e.name, e.description, e.begin_from, e.begin_to, e.end_from, e.end_to
      FROM model.entity e
               JOIN model.link l ON e.id = l.domain_id
        WHERE e.openatlas_class_name IN %(openAtlasClass)s
        AND l.property_code = 'P2'
        AND l.range_id IN %(caseStudies)s )a

         LEFT JOIN (SELECT range_id, description AS germanName FROM model.link WHERE domain_id = 197086) b
                   ON b.range_id = a.id

         LEFT JOIN (SELECT range_id, description AS englishName FROM model.link WHERE domain_id = 197091) c
                   ON c.range_id = a.id

         LEFT JOIN (SELECT e.name AS maintype, l.domain_id
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

    g.cursor.execute(sql, {'openAtlasClass': openAtlasClass, 'caseStudies': caseStudies, 'root': app.config['CASE_STUDY']})
    result = g.cursor.fetchone()
    return(result.list)

def caseStudyNames(casestudies, openAtlasClass):

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
      WHERE id IN %(casestudies)s
    )
    SELECT *
    FROM case_data
    WHERE id IN (SELECT DISTINCT jsonb_array_elements(cases)::INT AS caseStudiesAll
                      FROM (SELECT ents.id, jsonb_agg(DISTINCT t.path) as cases
                            FROM (SELECT id, entName, jsonb_array_elements(cases) AS caseid FROM (SELECT id, entName, cases FROM
        (SELECT id, entName, JSONB_AGG(typeName) AS cases
        FROM (SELECT a.id, a.name AS entName, e.id AS typeName
        FROM model.entity a
               JOIN model.link l ON a.id = l.domain_id
               JOIN model.entity e ON l.range_id = e.id
        WHERE l.property_code = 'P2' AND l.range_id IN %(casestudies)s AND a.openatlas_class_name IN %(openAtlasClass)s
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

    g.cursor.execute(sql, {'casestudies': casestudies, 'root_': root_, 'openAtlasClass': openAtlasClass})

    result = g.cursor.fetchall()
    return(result)

