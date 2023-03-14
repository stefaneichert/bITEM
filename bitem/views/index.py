from flask import render_template
from flask_babel import lazy_gettext as _
from bitem import app
import os, random

@app.route('/')
def index():
    # get random 3d model
    file = random.choice(os.listdir("bitem/static/3dmodels"))

    return render_template("/index/index.html", model=file)
