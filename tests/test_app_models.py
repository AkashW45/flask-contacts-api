import pytest
from flask import Flask
from app.models import ping_bp

@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(ping_bp)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_ping_returns_200_and_pong(client):
    response = client.get('/ping')
    assert response.status_code == 200
    assert response.data == b'pong'

def test_ping_content_type_text_plain(client):
    response = client.get('/ping')
    assert response.content_type == 'text/plain'

def test_ping_post_method_not_allowed(client):
    response = client.post('/ping')
    assert response.status_code == 405

def test_ping_blueprint_exists():
    assert ping_bp.name == 'ping'
    assert 'ping' in ping_bp.view_functions
    assert ping_bp.view_functions['ping'].__name__ == 'ping'