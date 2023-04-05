import json

from flask import render_template

from bitem import app
from bitem.util import api
@app.route('/view/<int:entity_id>')
def entity(entity_id: int):

    data = api.query_ids(entity_id)
    #if data:
    #    return json.dumps(data)

    return render_template("/entity/entity.html", data=data)
