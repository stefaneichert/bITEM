from typing import Any

from flask import g
from bitem import app


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
        id,int
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
                                                          SELECT 
            id,
            name,
            (SELECT description FROM model.link
                WHERE range_id = e.id AND domain_id = 197088) AS en,
            (SELECT description FROM model.link
                WHERE range_id = e.id AND domain_id = 197086) AS de,
            CASE id WHEN %(root_)s THEN 1 ELSE 2 END AS sortorder
          FROM model.entity e
          WHERE id IN %(case_studies)s                            AND NOT (t.path @> ARRAY [l.domain_id]))
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


def getMainImage(entity_id, images):
    g.cursor.execute("""
        SELECT image_id
        FROM web.entity_profile_image
        WHERE entity_id = %(id)s
    """, {'id': entity_id})
    result = g.cursor.fetchone()
    return result.image_id if result else images[0]

