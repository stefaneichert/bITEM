from flask import render_template, g
from flask_babel import lazy_gettext as _

from bitem import app
from bitem.util import datamapper


def getCaseStudies(topparent):

    sql = """"""

@app.route('/persons')
def persons():

    title = _('persons')

    data = datamapper.getlist(('person',''), (196063))

    return render_template("/entity/entities.html", _data=data, title=title)

@app.route('/groups')
def groups():
    
    title = _('groups')

    data = datamapper.getlist(('','group'), (196063))

    return render_template("/entity/entities.html", _data=data, title=title)

@app.route('/events')
def events():
    
    title = _('events')

    data = datamapper.getlist(('acquisition','event', 'activity', 'creation', 'move', 'production'), (196063))

    return render_template("/entity/entities.html", _data=data, title=title)


@app.route('/items')
def items():
    
    title = _('items')

    data = datamapper.getlist(('artifact',''), (196063))

    return render_template("/entity/entities.html", _data=data, title=title)
