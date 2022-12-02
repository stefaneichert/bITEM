import json

import psycopg2.extras
from flask import Flask, g, request
from flask_wtf.csrf import CSRFProtect
from flask_login import current_user

app = Flask(__name__, instance_relative_config=True)
csrf = CSRFProtect(app)  # Make sure all forms are CSRF protected
csrf.init_app(app)

app.config.from_object('config.default')  # Load config/INSTANCE_NAME.py
app.config.from_pyfile('production.py')  # Load instance/INSTANCE_NAME.py

from bitem.views import (
    index)


def connect():
    try:
        connection_ = psycopg2.connect(
            database=app.config['DATABASE_NAME'],
            user=app.config['DATABASE_USER'],
            password=app.config['DATABASE_PASS'],
            port=app.config['DATABASE_PORT'],
            host=app.config['DATABASE_HOST'])
        connection_.autocommit = True
        return connection_
    except Exception as e:  # pragma: no cover
        print("Database connection error.")
        raise Exception(e)


@app.before_request
def before_request():
    g.db = connect()
    g.cursor = g.db.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor)

@app.teardown_request
def teardown_request(exception):
    g.db.close()
