import json

from flask import render_template

from bitem import app
from bitem.util import mapview
@app.route('/view/<int:entity_id>')
def entity(entity_id: int):

    data = mapview.getData((entity_id,))
    if data:
        data[0]['connections'] = mapview.get_connections(entity_id)
        return json.dumps(data[0])

    return render_template("/entity/entity.html", data=data[0])
