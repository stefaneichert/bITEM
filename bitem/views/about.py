from flask import render_template

from bitem import app
@app.route('/about')
def about():

    # get random 3d model
    return render_template("/about/about.html")
