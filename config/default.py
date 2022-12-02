import os
DEBUG = False

# Database
DATABASE_NAME = 'openatlas'
DATABASE_USER = 'openatlas'
DATABASE_HOST = 'localhost'
DATABASE_PORT = 5432
DATABASE_PASS = 'CHANGE ME'

SECRET_KEY = 'CHANGE ME'

# Path
WEB_FOLDER_PATH = '/static/images/entities'
JPG_FOLDER_PATH = '/static/images/jpgs'
UPLOAD_FOLDER_PATH = os.path.dirname(__file__) + '/../bitem' + WEB_FOLDER_PATH
UPLOAD_JPG_FOLDER_PATH = os.path.dirname(__file__) + '/../bitem' + JPG_FOLDER_PATH

OPENATLAS_URL = 'https://thanados.openatlas.eu/update/'

API_URL = 'https://thanados.openatlas.eu/api/0.2/entity/'
API_FILE_DISPLAY = 'https://thanados.openatlas.eu/api/display/'

GEONAMES_USERNAME = 'yourgeonamesusername'

META_RESOLVE_URL = 'https://bitem.at'
META_PUBLISHER = 'bITEM'
META_ORGANISATION = 'Natural History Museum Vienna'
META_ORG_URL = 'https://nhm-wien.ac.at'
META_ORG_WD = 'https://www.wikidata.org/wiki/Q688704'
META_LICENSE = 'https://creativecommons.org/licenses/by/4.0/'



