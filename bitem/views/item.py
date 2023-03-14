from flask import render_template

from bitem import app
@app.route('/item')
def item():

    return render_template("/item/view.html")
