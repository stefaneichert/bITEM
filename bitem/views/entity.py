import json

from flask import render_template

from bitem import app
from bitem.util import api

@app.route('/persons')

def persons():
    query_params = ['person', 196063]
    return render_template("/entity/entities.html", query_params=query_params)


@app.route('/items')

def items():
    query_params = ['artifact', 196063]
    return render_template("/entity/entities.html", query_params=query_params)