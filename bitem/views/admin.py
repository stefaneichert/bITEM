from bitem import app
from bitem.util import iiiftools, data_mapper
from flask import render_template
from flask_login import login_required


@app.route('/admin')
@login_required
def admin() -> str:
    return render_template("/admin/admin.html")

@app.route('/admin/synchronise')
@login_required
def synchronise() -> str:
    iiiftools.makeFileList()
    data_mapper.makeGeomTable()
    data_mapper.makeItemTable()
    return render_template("/admin/admin.html")
