from bitem import app
from bitem.util import datamapper
import inspect

@app.route('/persons')
def persons():
    template = datamapper.getData(inspect.stack()[0][3])
    return template

@app.route('/groups')
def groups():
    template = datamapper.getData(inspect.stack()[0][3])
    return template

@app.route('/events')
def events():
    template = datamapper.getData(inspect.stack()[0][3])
    return template

@app.route('/items')
def items():
    template = datamapper.getData(inspect.stack()[0][3])
    return template

@app.route('/places')
def places():
    template = datamapper.getData(inspect.stack()[0][3])
    return template