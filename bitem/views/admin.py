from bitem import app
from bitem.util import iiiftools, data_mapper
from flask import render_template
from flask_login import login_required
from typing import Optional


@app.route('/admin')
@login_required
def admin() -> str:
    return render_template("/admin/admin.html")

@app.route('/admin/synchronise')
@app.route('/admin/synchronise/<id>')
@app.route('/admin/synchronise/<id>/<prop>')
@login_required
def synchronise(id: Optional[int] = None, prop: Optional[str] = None) -> str:
    iiiftools.makeFileList()
    data_mapper.makeGeomTable()
    data_mapper.makeItemTable(id, prop)
    return render_template("/admin/admin.html")
