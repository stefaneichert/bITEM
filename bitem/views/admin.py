from bitem import app
from bitem.util import iiiftools, data_mapper
from flask import render_template, g
from flask_login import login_required
from typing import Optional


@app.route('/admin')
@login_required
def admin() -> str:

    g.cursor.execute('SELECT DISTINCT story_id, story_name FROM bitem.stories')
    stories = g.cursor.fetchall()

    return render_template("/admin/admin.html", stories=stories)

@app.route('/admin/synchronise')
@app.route('/admin/synchronise/<id>')
@app.route('/admin/synchronise/<id>/<prop>')
@login_required
def synchronise(id: Optional[int] = None, prop: Optional[str] = None) -> str:
    if not id:
        iiiftools.makeFileList()
        data_mapper.makeGeomTable()
    data_mapper.makeItemTable(id, prop)
    return render_template("/admin/admin.html")
