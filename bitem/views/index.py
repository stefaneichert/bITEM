from flask import render_template

from bitem import app
import os, random


@app.route('/')
def index():

    # get random 3d model
    def randomModel():
        file = random.choice(os.listdir("bitem/static/3dmodels"))  # change dir name to whatever
        return file
    print(randomModel())

    return render_template("/index/index.html", model = randomModel())
