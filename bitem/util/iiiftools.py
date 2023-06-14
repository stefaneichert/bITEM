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
        imgstring = iiifUrl + img + '.jpg/full/' + string + '/0/default.jpg'
        image = {}
        image['path'] = imgstring
        image['id'] = int(img)
        return(image)

def returnIIIFMeta(id):
    img = str(id)
    iif = {}
    iif['w'] = 1000
    iif['h'] = 1000
    try:
        with urllib.request.urlopen(iiifUrl + img + '.jpg') as url:
            info = json.load(url)
            iif['w'] = info['width']
            iif['h'] = info['height']
        return iif
    except Exception:
        return iif
