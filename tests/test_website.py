import unittest

from flask import url_for

from bitem import app


class TestBaseCase(unittest.TestCase):

    def setUp(self) -> None:
        app.testing = True
        app.config['SERVER_NAME'] = 'local.host'
        self.app = app.test_client()


class WebsiteTests(TestBaseCase):

    def test_sites(self) -> None:
        with app.app_context():
            assert b'learn more' in self.app.get('/').data
