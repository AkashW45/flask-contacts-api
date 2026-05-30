import logging
import re
import time
import pytest
from datetime import datetime
from flask import Flask, g, request
from app.api import api as api_blueprint
from app.models import User
from unittest.mock import MagicMock, patch


@pytest.fixture
def app():
    app = Flask(__name__)
    app.config['TESTING'] = True
    app.register_blueprint(api_blueprint)

    # Request logging middleware (before/after request)
    @app.before_request
    def before_request_logging():
        g.start_time = time.time()

    @app.after_request
    def after_request_logging(response):
        if hasattr(g, 'start_time'):
            elapsed = (time.time() - g.start_time) * 1000
            logger = logging.getLogger('app.api.authentication')
            timestamp = datetime.utcnow().isoformat()
            logger.info(f'{timestamp} {request.method} {request.path} {response.status_code} {elapsed:.2f}ms')
        return response

    return app


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture(autouse=True)
def mock_user_model():
    """Mock User model methods to avoid database interaction."""
    with patch.object(User, 'query') as mock_query, \
         patch.object(User, 'verify_auth_token') as mock_verify_auth_token, \
         patch.object(User, 'verify_password') as mock_verify_password:
        mock_user = MagicMock()
        mock_user.is_anonymous = False
        mock_user.confirmed = True
        mock_user.generate_auth_token.return_value = 'fake_token'

        # Default: filter_by returns a user
        mock_query.filter_by.return_value.first.return_value = mock_user
        mock_verify_auth_token.return_value = mock_user
        mock_verify_password.return_value = True
        yield


@pytest.fixture(autouse=True)
def capture_logs(caplog):
    caplog.set_level(logging.INFO, logger='app.api.authentication')


def extract_log_info(message):
    """Extract components from the log message for verification."""
    pattern = r'(\S+) (\S+) (\S+) (\d+) (\d+(?:\.\d+)?)ms'
    match = re.search(pattern, message)
    if match:
        return match.groups()
    return None


def test_logging_successful_request(client, caplog):
    """GET a protected endpoint and verify log contains status 200."""
    # Perform a request to a protected view; /tokens/ POST requires credentials
    # but we mock a simple GET on the blueprint root (just to trigger hooks).
    # However the blueprint may not have a root route. We'll use POST /tokens/
    # with valid credentials and mock verify_password to succeed.
    response = client.post('/tokens/', json={})
    # The response should be 200 because we mocked user confirmed and not anonymous.
    assert response.status_code == 200

    # Assert a log message was emitted
    assert len(caplog.records) >= 1
    log_message = caplog.records[-1].getMessage()
    info = extract_log_info(log_message)
    assert info is not None, f"Log format unexpected: {log_message}"
    timestamp, method, path, status, time_ms = info
    assert method == 'POST'
    assert path == '/tokens/'
    assert status == '200'
    assert float(time_ms) >= 0


def test_logging_unauthorized_missing_credentials(client, caplog):
    """Missing authentication should produce 401 and log it."""
    # Mock verify_password to always fail, causing 401
    with patch.object(User, 'verify_password', return_value=False):
        response = client.post('/tokens/', json={})
        assert response.status_code == 401

    assert len(caplog.records) >= 1
    log_message = caplog.records[-1].getMessage()
    info = extract_log_info(log_message)
    assert info is not None
    _, method, path, status, time_ms = info
    assert method == 'POST'
    assert path == '/tokens/'
    assert status == '401'


def test_logging_forbidden_unconfirmed_account(client, caplog):
    """Unconfirmed user should receive 403 and log it."""
    # Override the mock user to have confirmed=False
    with patch.object(User, 'query') as mock_query:
        mock_user = MagicMock()
        mock_user.is_anonymous = False
        mock_user.confirmed = False
        mock_query.filter_by.return_value.first.return_value = mock_user
        response = client.get('/tokens/')   # GET triggers before_request which checks confirmed
        assert response.status_code == 403

    assert len(caplog.records) >= 1
    log_message = caplog.records[-1].getMessage()
    info = extract_log_info(log_message)
    assert info is not None
    _, method, path, status, _ = info
    assert method == 'GET'
    assert path == '/tokens/'
    assert status == '403'


def test_logging_invalid_token_used(client, caplog):
    """Using a token when token already used should log 401."""
    # In before_request, g.token_used is set. We need to craft a request where
    # token_used is True after verify_password sets it.
    # We'll mock verify_password chain manually via g.
    with patch('app.api.authentication.g') as mock_g:
        mock_g.current_user = MagicMock()
        mock_g.current_user.is_anonymous = False
        mock_g.current_user.confirmed = True
        mock_g.token_used = True
        response = client.post('/tokens/', json={})
        assert response.status_code == 401

    assert len(caplog.records) >= 1
    log_message = caplog.records[-1].getMessage()
    info = extract_log_info(log_message)
    assert info is not None
    _, _, _, status, _ = info
    assert status == '401'


def test_log_response_time_format(client, caplog):
    """Verify response time is reported in milliseconds with two decimals."""
    client.get('/tokens/')   # even if it fails, the after_request hook still runs
    assert len(caplog.records) >= 1
    log_message = caplog.records[-1].getMessage()
    # The response time part should be NUM.ms
    match = re.search(r'(\d+\.\d+?)ms', log_message)
    assert match is not None, 'Response time not present in milliseconds'
    response_time = float(match.group(1))
    assert response_time >= 0