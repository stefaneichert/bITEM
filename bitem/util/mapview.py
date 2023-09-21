from flask import g, render_template
from bitem import app
from bitem.util import data_mapper, iiiftools
from flask_babel import lazy_gettext as _


def getData(id):

    data = g.cursor.fetchone()

    return (data)


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
                    data_mapper.getMainImage(connection['id'],
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
