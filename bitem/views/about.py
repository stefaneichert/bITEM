import json

from flask import render_template

from bitem import app

from bitem.util import setup_db, api, iiiftools, data_mapper



@app.route('/about')
def about() -> str:
    #setup_db.setup_db()
    #api.api_download()
    iiiftools.makeFileList()
    #data_mapper.makeItemTable()
    return render_template("/about/about.html")
