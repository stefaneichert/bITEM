from bitem import app
from bitem.util import iiiftools, data_mapper


@app.route('/admin')
def admin() -> str:
    #iiiftools.makeFileList()
    data_mapper.makeItemTable()
