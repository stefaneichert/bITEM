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

REFERENCE_SYSTEMS = [
    {'id': 155980, 'url': 'https://www.geonames.org/'},
    {'id': 158071, 'url': 'http://vocab.getty.edu/page/aat/'},
    {'id': 196361, 'url': 'https://d-nb.info/gnd/'},
    {'id': 156149, 'url': 'https://www.wikidata.org/entity/'}
]

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
    'actors': ('person', 'group'),
    'entities': ('artifact', 'acquisition', 'event', 'activity', 'creation', 'move', 'production', 'modification', 'person', 'group', 'place')
}

MEDIA_EXTENSION = ['.png', '.bmp', '.jpg', '.jpeg', '.glb', '.webp']
IMAGE_EXTENSION = ['.png', '.bmp', '.jpg', '.jpeg']

# Paths
JPG_FOLDER_PATH = '/static/images/jpgs'
ROOT_PATH = os.path.dirname(__file__) + '/../bitem'

OPENATLAS_UPLOAD_FOLDER = '/static/images/entities'

OPENATLAS_URL = 'https://thanados.openatlas.eu/update/'

IIIF_BASE = 'https://iiif.bitem.at/iiif/'
IIIF_VERSION = '3'
IIIF_URL = IIIF_BASE + IIIF_VERSION + '/'
FILETYPE_API = '/licensed_file_overview/'

API_URL = 'https://thanados.openatlas.eu/api/'
API_SUFFIX = '&format=loud'
API_FILE_DISPLAY = 'https://thanados.openatlas.eu/api/display/'

META_RESOLVE_URL = 'https://bitem.at'
META_PUBLISHER = 'bITEM'
META_ORGANISATION = 'Natural History Museum Vienna'
META_ORG_URL = 'https://nhm-wien.ac.at'
META_ORG_WD = 'https://www.wikidata.org/wiki/Q688704'
META_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'

CASE_STUDY = 12345
HIDDEN_ONES = (222268,) #ids of case studies not to be shown, eg. for a "hidden" tag
STORY_THRESHOLD = 2 #minimum count of child or succeeding events necessary to show a story map