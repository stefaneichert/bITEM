from bitem import app
import urllib.request, json

iiifUrl =  app.config['IIIF_URL']

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
            string = ','+ str(hmax)
        imgstring = iiifUrl + img + '/full/' + string + '/0/default.jpg'
        image = {}
        image['path'] = imgstring
        image['id'] = int(img)
        print(image)
        return(image)

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
        print(iiif)
        return iiif
    except Exception:
        print(iiif)
        return iiif
