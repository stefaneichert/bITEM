from pathlib import Path

from flask import render_template
from bitem import app
import os, random

@app.route('/')
def index():
    # get random 3d model
    path = Path(app.root_path) / 'static' / '3dmodels'
    file = random.choice(os.listdir(path))
    #file = random.choice(os.listdir("tests/bitem/static/3dmodels"))

    return render_template("/index/index.html", model=file)
