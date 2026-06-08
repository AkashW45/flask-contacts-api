import pytest
from app import app

@pytest.fixture
def client():
    with app.test_client() as client:
        yield client

def test_ping_get_returns_pong(client):
    """Happy path: GET /ping returns 200, plain text 'pong', and text/plain content type."""
    resp = client.get('/ping')
    assert resp.status_code == 200
    assert resp.data.decode('utf-8') == 'pong'
    assert resp.content_type == 'text/plain'

def test_ping_post_method_not_allowed(client):
    """Error path: POST /ping should return 405 Method Not Allowed."""
    resp = client.post('/ping')
    assert resp.status_code == 405

def test_ping_put_method_not_allowed(client):
    """Error path: PUT /ping should return 405 Method Not Allowed."""
    resp = client.put('/ping')
    assert resp.status_code == 405

def test_ping_head_returns_headers_no_body(client):
    """Edge case: HEAD /ping returns 200 with Content-Type header and empty body."""
    resp = client.head('/ping')
    assert resp.status_code == 200
    assert resp.data == b''
    assert resp.content_type == 'text/plain'

def test_ping_options_returns_allow_header(client):
    """Edge case: OPTIONS /ping returns 200 and includes Allow header."""
    resp = client.options('/ping')
    assert resp.status_code == 200
    assert 'Allow' in resp.headers