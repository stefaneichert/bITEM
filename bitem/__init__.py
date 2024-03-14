from typing import Any, Optional

import psycopg2.extras
from flask import Flask, g, redirect, request, session
from flask_babel import Babel
from flask_wtf.csrf import CSRFProtect
from psycopg2.extensions import connection
from werkzeug.wrappers import Response

app = Flask(__name__, instance_relative_config=True)
babel = Babel(app)

csrf = CSRFProtect(app)  # Make sure all forms are CSRF protected
csrf.init_app(app)

app.config.from_object('config.default')
app.config.from_pyfile('production.py')

from bitem.views import index, about, login, entities, entity, iiif, admin, story
from bitem.util.util import uc_first


@babel.localeselector
def get_locale() -> str:
    if 'language' in session:
        return session['language']
    best_match = request.accept_languages.best_match(app.config['LANGUAGES'])
    return best_match or 'en'


def connect() -> connection:
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
def before_request() -> None:
    g.db = connect()
    g.cursor = g.db.cursor(cursor_factory=psycopg2.extras.NamedTupleCursor)
    session['language'] = get_locale()


@app.teardown_request
def teardown_request(_exception: Optional[Exception]) -> None:
    g.db.close()


@app.route('/language/<language>')
def set_language(language: str) -> Response:
    session['language'] = language
    return redirect(request.referrer)


@app.context_processor
def inject_conf_var() -> dict[str, Any]:
    return dict(
        AVAILABLE_LANGUAGES=app.config['LANGUAGES'],
        CURRENT_LANGUAGE=session.get(
            'language',
            request.accept_languages.best_match(
                app.config['LANGUAGES'].keys())),
        IIIF_URL=app.config['IIIF_URL'],
        IIIF_BASE=app.config['IIIF_BASE'],
        REFERENCE_SYSTEMS=app.config['REFERENCE_SYSTEMS'],
        UPLOAD_FOLDER=app.config['OPENATLAS_UPLOAD_FOLDER'],
        IMAGE_EXTENSION=app.config['IMAGE_EXTENSION'],
        TRANSLATION_IDS=app.config['TRANSLATION_IDS'],
        STORY_THRESHOLD=app.config['STORY_THRESHOLD'], )
