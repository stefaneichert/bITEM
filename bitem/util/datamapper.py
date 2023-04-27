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

    if result.ids:
        caseStudies = tuple(result.ids)
    else:
        caseStudies = (root_,)
    return caseStudies


def getCaseStudyNames(casestudies, openAtlasClass):
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

    g.cursor.execute(sql, {'casestudies': casestudies, 'root_': root_,
                           'openAtlasClass': openAtlasClass})

    result = g.cursor.fetchall()
    if result:
        return result
    else:
        sql = """
        SELECT 
        id,
        name,
        (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197088) AS en,
        (SELECT description FROM model.link WHERE range_id = e.id AND domain_id = 197086) AS de,
        CASE id WHEN %(root_)s THEN 1 ELSE 2 END AS sortorder
      FROM model.entity e
      WHERE id IN %(casestudies)s
        """
        g.cursor.execute(sql, {'casestudies': casestudies, 'root_': root_,
                               'openAtlasClass': openAtlasClass})
        result = g.cursor.fetchall()

    return (result)

def getSubProps(props):

    sql = """
        WITH RECURSIVE property_tree(id, super_code, sub_code, level, path) AS (
            SELECT pi.id, pi.super_code, pi.sub_code, 1, ARRAY[pi.super_code, pi.sub_code]
            FROM model.property_inheritance pi
            WHERE pi.super_code IN %(props)s
        
            UNION ALL
        
            SELECT pi.id, pi.super_code, pi.sub_code, pt.level + 1, pt.path || pi.sub_code
            FROM model.property_inheritance pi
            JOIN property_tree pt ON pt.sub_code = pi.super_code
        )
        SELECT json_agg(DISTINCT sub_code) AS props FROM property_tree;
    """

    g.cursor.execute(sql, {'props': props})
    result = g.cursor.fetchone()
    return tuple(result.props)

def getMainImage(entId, images):
    g.cursor.execute(f'SELECT image_id FROM web.entity_profile_image WHERE entity_id = {entId}')
    result = g.cursor.fetchone()
    if result:
        mainImage = result.image_id
        return mainImage
    else:
        return images[0]
