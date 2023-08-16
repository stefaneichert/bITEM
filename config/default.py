import os
DEBUG = False

# Database
DATABASE_NAME = 'openatlas_thanados'
DATABASE_USER = 'openatlas'
DATABASE_HOST = 'localhost'
DATABASE_PORT = 5432
DATABASE_PASS = 'CHANGE ME'

SECRET_KEY = 'CHANGE ME'
# add to your app.config or config.py file

LANGUAGES = {
    'en': 'English',
    'de': 'Deutsch'
}

TRANSLATION_IDS = {
    'de': 197086,
    'en': 197088
}

VIEW_CLASSES = {
    'persons': ('person',),
    'items': ('artifact',),
    'groups': ('group',),
    'events': ('acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification'),
    'places': ('place',),
    'actors': ('person', 'group')
}

MEDIA_EXTENSION = ['.png', '.bmp', '.jpg', '.jpeg', '.glb', '.webp']

# Paths
JPG_FOLDER_PATH = '/static/images/jpgs'
ROOT_PATH = os.path.dirname(__file__) + '/../bitem'

OPENATLAS_URL = 'https://thanados.openatlas.eu/update/'

IIIF_BASE = 'http://127.0.0.1:8182/iiif/'
IIIF_VERSION = '3'
IIIF_URL = IIIF_BASE + IIIF_VERSION + '/'

API_URL = 'http://thanados.openatlas.eu/api/'
API_SUFFIX = '&format=loud'
API_FILE_DISPLAY = 'https://thanados.openatlas.eu/api/display/'

META_RESOLVE_URL = 'https://bitem.at'
META_PUBLISHER = 'bITEM'
META_ORGANISATION = 'Natural History Museum Vienna'
META_ORG_URL = 'https://nhm-wien.ac.at'
META_ORG_WD = 'https://www.wikidata.org/wiki/Q688704'
META_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'

CASE_STUDY = 12345



