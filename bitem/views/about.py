from flask import render_template

from bitem import app
@app.route('/about')
def about():

    return render_template("/about/about.html")
