import psycopg2.extras
from flask import Flask, g, request, session, redirect
from flask_wtf.csrf import CSRFProtect
from flask_babel import Babel

app = Flask(__name__, instance_relative_config=True)
babel = Babel(app)



csrf = CSRFProtect(app)  # Make sure all forms are CSRF protected
csrf.init_app(app)

app.config.from_object('config.default')  # Load config/INSTANCE_NAME.py
app.config.from_pyfile('production.py')  # Load instance/INSTANCE_NAME.py

from bitem.views import (
    index, about, map, item, entity)

from bitem.util.util import uc_first



@babel.localeselector
def get_locale() -> str:
    if 'language' in session:
        return session['language']
    best_match = request.accept_languages.best_match(app.config['LANGUAGES'])
    return best_match

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
    session['language'] = get_locale()

@app.teardown_request
def teardown_request(exception):
    g.db.close()

@app.route('/language/<language>')
def set_language(language=None):
    session['language'] = language
    return redirect(request.referrer)

@app.context_processor
def inject_conf_var():
    return dict(AVAILABLE_LANGUAGES=app.config['LANGUAGES'], CURRENT_LANGUAGE=session.get('language', request.accept_languages.best_match(app.config['LANGUAGES'].keys())))