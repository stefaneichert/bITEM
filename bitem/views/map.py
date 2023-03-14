from flask import render_template

from bitem import app
@app.route('/map')
def map():

    return render_template("/map/map.html")
