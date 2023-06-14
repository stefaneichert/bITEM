import inspect

from bitem import app
from bitem.util import map_entities, data_mapper


@app.route('/persons')
def persons() -> str:
    template = map_entities.get_data(inspect.stack()[0][3])
    data_mapper.mark_access(0)
    return template

@app.route('/groups')
def groups() -> str:
    template = map_entities.get_data(inspect.stack()[0][3])
    data_mapper.mark_access(0)
    return template

@app.route('/events')
def events() -> str:
    template = map_entities.get_data(inspect.stack()[0][3])
    data_mapper.mark_access(0)
    return template

@app.route('/items')
def items() -> str:
    template = map_entities.get_data(inspect.stack()[0][3])
    data_mapper.mark_access(0)
    return template

@app.route('/places')
def places() -> str:
    template = map_entities.get_data(inspect.stack()[0][3])
    data_mapper.mark_access(0)
    return template
