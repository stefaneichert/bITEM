from flask import render_template

from bitem import app

@app.route('/')
def index():
    return render_template("/index/index.html")
