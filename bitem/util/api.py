import json
import os

import requests
from flask import g

from bitem import app
from PIL import Image, ImageChops
from shutil import copy

api_url = app.config['API_URL']
api_suffix = app.config['API_SUFFIX']


def query_ids(id):

    request_string = f'{api_url}entity/{str(id)}?format=loud'
    print(request_string)
    response_API = requests.get(request_string)
    data = response_API.text
    parse_json = json.loads(data)
    return parse_json




def remove_transparency(im, bg_colour=(255, 255, 255)):

    if im.mode in ('RGBA', 'LA') or (
            im.mode == 'P' and 'transparency' in im.info):
        alpha = im.convert('RGBA').split()[-1]
        bg = Image.new("RGBA", im.size, bg_colour + (255,))
        bg.paste(im, mask=alpha)
        return bg

    else:
        return im

def api_download():

    print('Downloading images/files')
    sql_files = """
        SELECT DISTINCT id 
        FROM model.entity 
        WHERE openatlas_class_name = 'file' 
            AND id IN (
                SELECT domain_id FROM model.link 
                WHERE range_id IN 
                (SELECT id FROM thanados.types_all WHERE topparent = '12935')
                AND property_code = 'P2')
            """
    g.cursor.execute(sql_files)
    licensed_file_entities = g.cursor.fetchall()

    for row in licensed_file_entities:
        print(row.id)
        gefunden = False
        file_name = f'{row.id}'
        path = f'thanados{app.config["JPG_FOLDER_PATH"]}/{file_name}'
        if os.path.isfile(path):
            message = f'{file_name} already exists'
            found = True

        if not gefunden:
            file_name = f'{row.id}'
            newimage = (app.config["JPG_FOLDER_PATH"] + '/' + str(
                    row.id)
                            + '.jpg')
            try:
                print(app.config["API_FILE_DISPLAY"] + file_name)
                r = requests.get(app.config["API_FILE_DISPLAY"] + file_name)
                if r.status_code == 200:
                    path = \
                        f'bitem{app.config["JPG_FOLDER_PATH"]}/' \
                        f'{file_name}'
                    with open(path, 'wb') as f:
                        f.write(r.content)
                    message = f'downloaded: {file_name}'
                    print(message)
            except Exception:
                print('Error with ' + str(row.id))
