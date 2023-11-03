from flask import render_template

from bitem import app
from bitem.util import data_mapper
@app.route('/map')
def map():
    data = data_mapper.getPlaces()
    return render_template("/map/map.html", data=data)
