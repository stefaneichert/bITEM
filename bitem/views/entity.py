from flask import render_template, g

from bitem import app
from bitem.util import api, datamapper

@app.route('/persons')
def persons():

    data = datamapper.getlist(('person',''), (196063))

    return render_template("/entity/entities.html", data=data)

@app.route('/groups')
def groups():

    data = datamapper.getlist(('','group'), (196063))

    return render_template("/entity/entities.html", data=data)

@app.route('/events')
def events():

    data = datamapper.getlist(('acquisition','event', 'activity', 'creation', 'move', 'production'), (196063))

    return render_template("/entity/entities.html", data=data)


@app.route('/items')
def items():

    data = datamapper.getlist(('artifact',''), (196063))

    return render_template("/entity/entities.html", data=data)
