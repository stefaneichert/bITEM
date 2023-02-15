from flask import render_template

from bitem import app
@app.route('/item')
def item():

    # get random 3d model
    return render_template("/item/view.html")
