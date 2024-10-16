from bitem import app
from bitem.util import mapentities
import inspect

@app.route('/persons')
def persons():
    template = mapentities.getData(inspect.stack()[0][3])
    return template

@app.route('/groups')
def groups():
    template = mapentities.getData(inspect.stack()[0][3])
    return template

@app.route('/events')
def events():
    template = mapentities.getData(inspect.stack()[0][3])
    return template

@app.route('/items')
def items():
    template = mapentities.getData(inspect.stack()[0][3])
    return template

@app.route('/places')
def places():
    template = mapentities.getData(inspect.stack()[0][3])
    return template