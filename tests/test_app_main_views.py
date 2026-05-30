import io
import logging
import pytest
from flask import Flask

from app.main import main as main_blueprint


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.config['FLASKY_SLOW_DB_QUERY_TIME'] = 0.1  # seconds
    app.register_blueprint(main_blueprint)
    app.logger.setLevel(logging.INFO)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def log_stream(app):
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setLevel(logging.INFO)
    app.logger.addHandler(handler)
    yield stream
    app.logger.removeHandler(handler)


def test_log_middleware_logs_request_info(client, log_stream):
    client.get('/')
    log_output = log_stream.getvalue()
    assert 'GET' in log_output
    assert '/' in log_output
    assert '200' in log_output


def test_log_middleware_logs_404_error(client, log_stream):
    client.get('/nonexistent')
    log_output = log_stream.getvalue()
    assert '404' in log_output


def test_slow_query_logs_warning(client, app, log_stream, monkeypatch):
    from app.main import views as main_views

    fake_query = type('FakeQuery', (object,), {
        'duration': 0.5,
        'statement': 'SELECT * FROM slow',
        'parameters': {},
        'context': 'test'
    })()

    monkeypatch.setattr(main_views, 'get_debug_queries', lambda: [fake_query])
    client.get('/')
    log_output = log_stream.getvalue()
    assert 'Slow query:' in log_output
    assert 'SELECT * FROM slow' in log_output


def test_log_includes_response_time(client, log_stream):
    client.get('/')
    log_output = log_stream.getvalue()
    import re
    assert re.search(r'\[\d+ms\]', log_output), "Response time log should contain a duration in ms"


def test_after_request_returns_response(client):
    response = client.get('/')
    assert response.status_code == 200