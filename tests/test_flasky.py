import pytest
from flasky import app as flask_app

@pytest.fixture
def client():
    with flask_app.test_client() as client:
        yield client

def test_health_endpoint_returns_status_ok_200(client):
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ok'

def test_ping_endpoint_returns_pong_200(client):
    response = client.get('/ping')
    assert response.status_code == 200
    assert response.data.decode('utf-8') == 'pong'

def test_ping_endpoint_content_type_is_text_plain(client):
    response = client.get('/ping')
    assert response.content_type == 'text/plain'

def test_nonexistent_endpoint_returns_404(client):
    response = client.get('/nonexistent')
    assert response.status_code == 404