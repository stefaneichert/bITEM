import json

from flask import render_template

from bitem import app

from bitem.util import setup_db, api



@app.route('/about')
def about() -> str:
    #setup_db.setup_db()
    #api.api_download()
    return render_template("/about/about.html")
