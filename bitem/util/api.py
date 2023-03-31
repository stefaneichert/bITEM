from bitem import app
import requests
import json

api_url = app.config['API_URL']
api_suffix = app.config['API_SUFFIX']


def query_ids(id):

    request_string = f'{api_url}entity/{str(id)}?format=loud'
    print(request_string)
    response_API = requests.get(request_string)
    data = response_API.text
    parse_json = json.loads(data)
    return parse_json

