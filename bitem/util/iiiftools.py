from bitem import app
import urllib.request, json

iiifUrl = app.config['IIIF_URL']
filetypeJson = app.config['API_URL'] + app.config['FILETYPE_API']


def setIIIFSize(img, wmax, hmax):
    img = str(img)
    w = returnIIIFMeta(img)['w']
    h = returnIIIFMeta(img)['h']
    string = 'max'
    if w > wmax and h > hmax:
        string = '^!' + str(wmax) + ',' + str(hmax)
    if w > wmax and h < hmax:
        string = str(wmax) + ','
    if w < wmax and h > hmax:
        string = ',' + str(hmax)
    imgstring = iiifUrl + img + '/full/' + string + '/0/default.jpg'
    image = {}
    image['path'] = imgstring
    image['id'] = str(img)
    return (image)


def returnIIIFMeta(id):
    img = str(id)
    iiif = {}
    iiif['w'] = 1000
    iiif['h'] = 1000
    try:
        with urllib.request.urlopen(iiifUrl + img) as url:
            info = json.load(url)
            iiif['w'] = info['width']
            iiif['h'] = info['height']
        return iiif
    except Exception:
        return iiif


def makeFileList():
    from flask import g
    import urllib, json

    sql1 = """
            DROP TABLE IF EXISTS bitem.files;
            CREATE TABLE bitem.files (id INT, extension TEXT, filename TEXT);
    """
    g.cursor.execute(sql1)

    with urllib.request.urlopen(
            filetypeJson) as url:
        filedata = json.loads(url.read().decode())
        for file_id, data in filedata.items():
            extension = data['extension']
            if extension:
                license = data['license']
                print("ID:", file_id)
                print("Extension:", extension)
                print("License:", license)

                sql = """
                        INSERT INTO bitem.files (id, extension, filename) VALUES (%(file_id)s, %(extension)s, %(filename)s)
                """
                g.cursor.execute(sql, {'file_id': file_id, 'extension': extension, 'filename': str(file_id) + extension})
