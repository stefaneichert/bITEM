import json

from flask import render_template

from bitem import app
from bitem.util import map_entities


@app.route('/storymap/<int:entity_id>')
def storymap(entity_id: int):
    data = map_entities.getlist(None, entity_id)[0]
    return render_template("/story/storymap.html", data=data)
