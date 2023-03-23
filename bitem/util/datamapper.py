from flask import g
from bitem import app


def getCases(root_):
    sql = """
            SELECT jsonb_agg(caseids) AS ids FROM (

            SELECT domain_id as caseIDS FROM (

            with recursive subcategories as (
                select domain_id, range_id
                from model.link
                where range_id = %(root_)s and property_code = 'P127'

                union
                    select l.domain_id, l.range_id
                    from model.link l
                    inner join subcategories subs on subs.domain_id = l.range_id
                    WHERE l.property_code = 'P127'
            ) select * from subcategories) a

            UNION DISTINCT
            SELECT DISTINCT range_id as caseIDS FROM (

            with recursive subcategories as (
                select domain_id, range_id
                from model.link
                where range_id = %(root_)s and property_code = 'P127'

                union
                    select l.domain_id, l.range_id
                    from model.link l
                    inner join subcategories subs on subs.domain_id = l.range_id
                    WHERE l.property_code = 'P127'
            ) select * from subcategories) a) b        
    """

    g.cursor.execute(sql, {'root_': root_})
    result = (g.cursor.fetchone())
    caseStudies = tuple(result.ids)
    return caseStudies

def getlist(class_, caseStudies):

    sql = """
    CREATE SCHEMA IF NOT EXISTS bitem;
    
    DROP TABLE IF EXISTS bitem.list;
    
    CREATE TABLE bitem.list AS SELECT DISTINCT * FROM (
    SELECT e.id,
           e.name,
           NULL::text AS germanName,
           NULL::text AS englishName,
           e.description,
           (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT AS first,
           (GREATEST(e.end_from, e.end_to)::DATE)::TEXT  AS last,
           NULL::JSONB                                   AS types,
           NULL::JSONB                                   AS images,
           NULL::JSONB                                   AS caseStudies
    FROM model.entity e
             JOIN model.link l ON e.id = l.domain_id
    WHERE e.openatlas_class_name IN %(class_)s
      AND l.range_id IN %(types)s) g;
    
    UPDATE bitem.list li
        SET germanName = r.germanName 
        FROM (SELECT l.id, l.name, t.description AS germanName, l.description  FROM bitem.list l JOIN model.link t ON l.id = t.range_id WHERE t.domain_id = 197086) r
        WHERE li.id = r.id;
        
    UPDATE bitem.list li
        SET englishName = r.englishName 
        FROM (SELECT l.id, l.name, t.description AS englishName, l.description  FROM bitem.list l JOIN model.link t ON l.id = t.range_id WHERE t.domain_id = 197088) r
        WHERE li.id = r.id;
        
    UPDATE bitem.list li
        SET caseStudies =
        (SELECT cases FROM
        (SELECT id, entName, JSONB_AGG(typeName) AS cases
        FROM (SELECT a.id, a.name AS entName, l.domain_id, e.name AS typeName
        FROM model.entity a
               JOIN model.link l ON a.id = l.domain_id
               JOIN model.entity e ON l.range_id = e.id
        WHERE l.property_code = 'P2' AND l.range_id IN (197085, 197087, 196063)
        ORDER BY a.id) c
        GROUP BY id, entName) x WHERE li.id = x.id);
        
        
    UPDATE bitem.list li
    SET images = i.image_ids
    FROM (SELECT t.id, t.name, JSONB_AGG(e.id) AS image_ids
          FROM bitem.list t
                   JOIN model.link l ON l.range_id = t.id
                   JOIN model.entity e ON e.id = l.domain_id
          WHERE e.openatlas_class_name = 'file'
          GROUP BY t.name, t.id) i
    WHERE i.id = li.id;
    
    UPDATE bitem.list li
    SET types = i.types
    FROM (SELECT li.id, JSONB_AGG(jsonb_build_object(
                'id', l.range_id,
                'type', e.name)) AS types
      FROM model.link l
               JOIN bitem.list li ON li.id = l.domain_id
               JOIN model.entity e ON e.id = l.range_id
      WHERE l.property_code = 'P2'
        AND l.range_id NOT IN %(types)s
          GROUP BY li.id) i
    WHERE i.id = li.id;
    
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id,
        '_label', name,
        '_labelDE', germanName,
        '_labelEN', englishName,
        'content', description,
        'first', first,
        'last', last,
        'types', types,
        'images', images,
        'casestudies', caseStudies
               ))) as list
    FROM bitem.list
    """

    g.cursor.execute(sql, {'class_': class_, 'types': caseStudies})
    result = g.cursor.fetchone()
    return(result.list)

def caseStudyNames():

    root_ = app.config['CASE_STUDY']
    casestudies = getCases(root_)

    sql = """
    DROP table IF EXISTS bitem.cases;
    CREATE table bitem.cases AS
    SELECT 
            id,
            name,
            NULL::TEXT AS EN,
            NULL::TEXT AS DE,
            NULL::INT AS sortorder
    FROM model.entity WHERE id in %(casestudies)s;
    
    UPDATE bitem.cases SET sortorder = 1 WHERE id = %(root_)s;
    UPDATE bitem.cases SET sortorder = 2 WHERE id != %(root_)s;
    
    UPDATE bitem.cases c SET EN = (SELECT l.description FROM model.link l WHERE l.range_id = c.id AND l.domain_id = 197088);  
    UPDATE bitem.cases c SET DE = (SELECT l.description FROM model.link l WHERE l.range_id = c.id AND l.domain_id = 197086); 
    
    SELECT * FROM bitem.cases ORDER BY sortorder; 
    
    """

    g.cursor.execute(sql, {'casestudies': casestudies, 'root_': root_})

    result = g.cursor.fetchall()
    return(result)

def getNameTranslation(id, languageID):
    g.cursor.execute(f'SELECT description from model.link WHERE range_id = {id} AND domain_id = {languageID}')
    translation = g.cursor.fetchone()
    return translation.description

