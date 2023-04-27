from flask import render_template

from bitem import app
from bitem.util import datamapper
@app.route('/map')
def map():
    data = datamapper.getPlaces()
    print(data)
    return render_template("/map/map.html", data=data)
