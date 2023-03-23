from flask import render_template
from flask_babel import lazy_gettext as _

from bitem import app
from bitem.util import datamapper



@app.route('/persons')
def persons():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('persons')

    data = datamapper.getlist(('person',''), casestudies)

    csNames = datamapper.caseStudyNames()

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)

@app.route('/groups')
def groups():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('groups')

    data = datamapper.getlist(('','group'), casestudies)

    csNames = datamapper.caseStudyNames()

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)

@app.route('/events')
def events():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('events')

    data = datamapper.getlist(('acquisition','event', 'activity', 'creation', 'move', 'production'), casestudies)

    csNames = datamapper.caseStudyNames()

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)


@app.route('/items')
def items():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])
    
    title = _('items')

    data = datamapper.getlist(('artifact',''), casestudies)

    csNames = datamapper.caseStudyNames()

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)
