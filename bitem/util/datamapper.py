from flask import g

def getlist(class_, types):
    sql = """
    DROP SCHEMA IF EXISTS bitem CASCADE;
    
    CREATE SCHEMA bitem;
    
    DROP TABLE IF EXISTS bitem.list;
    
    CREATE TABLE bitem.list AS
    SELECT e.id,
           e.name,
           e.description,
           (LEAST(e.begin_from, e.begin_to)::DATE)::TEXT AS first,
           (GREATEST(e.end_from, e.end_to)::DATE)::TEXT  AS last,
           NULL::JSONB                                   AS types,
           NULL::JSONB                                   AS images
    FROM model.entity e
             JOIN model.link l ON e.id = l.domain_id
    WHERE e.openatlas_class_name IN %(class_)s
      AND l.range_id IN (%(types)s);
    
    
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
        AND l.range_id NOT IN (%(types)s)
          GROUP BY li.id) i
    WHERE i.id = li.id;
    
    SELECT jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', id,
        '_label', name,
        'content', description,
        'first', first,
        'last', last,
        'types', types,
        'images', images
               ))) as list
    FROM bitem.list
    """

    g.cursor.execute(sql, {'class_': class_, 'types': types})
    result = g.cursor.fetchone()
    return(result.list)