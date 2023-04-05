from bitem import app
from flask import request, render_template, session

def getManifest(img_id):

    path = request.base_url

    from iiif_prezi3 import Manifest, config

    print(session['language'])

    config.configs['helpers.auto_fields.AutoLang'].auto_lang = session['language']

    manifest = Manifest(
        id=path,
        label="myimage3")
    canvas = manifest.make_canvas_from_iiif(
        url=app.config['IIIF_URL'] + str(img_id) + ".jpg")

    return manifest.json(indent=2)

@app.route('/iiif/<int:img_id>.json')
def iiif(img_id: int):
    return getManifest(img_id)

@app.route('/iiif/<int:img_id>')
def view(img_id: int):
    return render_template("/iiif/iiif.html", img_id=str(img_id), img_manifest=request.base_url + '.json')
