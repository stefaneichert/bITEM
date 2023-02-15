from flask import render_template

from bitem import app
@app.route('/map')
def map():

    # get random 3d model
    return render_template("/map/map.html")
