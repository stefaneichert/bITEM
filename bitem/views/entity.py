from flask import render_template
from flask_babel import lazy_gettext as _

from bitem import app
from bitem.util import datamapper



@app.route('/persons')
def persons():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('persons')

    openAtlasClass = ('person','')

    data = datamapper.getlist(openAtlasClass, casestudies)

    csNames = datamapper.caseStudyNames(casestudies, openAtlasClass)

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)

@app.route('/groups')
def groups():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('groups')

    openAtlasClass = ('','group')

    data = datamapper.getlist(openAtlasClass, casestudies)

    csNames = datamapper.caseStudyNames(casestudies, openAtlasClass)

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)

@app.route('/events')
def events():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])

    title = _('events')

    openAtlasClass = ('acquisition','event', 'activity', 'creation', 'move', 'production')

    data = datamapper.getlist(openAtlasClass, casestudies)

    csNames = datamapper.caseStudyNames(casestudies, openAtlasClass)

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)


@app.route('/items')
def items():

    casestudies = datamapper.getCases(app.config['CASE_STUDY'])
    
    title = _('items')

    openAtlasClass = ('artifact','')

    data = datamapper.getlist(openAtlasClass, casestudies)

    csNames = datamapper.caseStudyNames(casestudies, openAtlasClass)

    return render_template("/entity/entities.html", _data=data, title=title, csNames = csNames)
