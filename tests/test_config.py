import os
import pytest
from config import (
    Config,
    DevelopmentConfig,
    TestingConfig,
    ProductionConfig,
    HerokuConfig,
    DockerConfig,
    UnixConfig,
    config as config_dict
)


class TestConfig:
    """Tests for the base Config class and its subclasses."""

    def test_base_config_defaults(self, monkeypatch):
        """Verify that Config class attributes have expected default values."""
        # clean env variables that affect Config
        for key in list(os.environ.keys()):
            if key.startswith(('SECRET_KEY', 'MAIL_', 'FLASKY_ADMIN', 'DEV_DATABASE_URL',
                               'TEST_DATABASE_URL', 'DATABASE_URL', 'SERVER_NAME', 'DYNO')):
                monkeypatch.delenv(key, raising=False)

        # ensure SECRET_KEY is set to default if env not set
        cfg = Config()
        assert cfg.SECRET_KEY == 'hard to guess string'

        assert cfg.MAIL_SERVER == 'smtp.googlemail.com'
        assert cfg.MAIL_PORT == 587
        assert cfg.MAIL_USE_TLS is True
        assert cfg.MAIL_USERNAME is None
        assert cfg.MAIL_PASSWORD is None
        assert cfg.FLASKY_MAIL_SUBJECT_PREFIX == '[Flasky]'
        assert cfg.FLASKY_MAIL_SENDER == 'Flasky Admin <flasky@example.com>'
        assert cfg.FLASKY_ADMIN is None
        assert cfg.SSL_REDIRECT is False
        assert cfg.SQLALCHEMY_TRACK_MODIFICATIONS is False
        assert cfg.SQLALCHEMY_RECORD_QUERIES is True
        assert cfg.FLASKY_POSTS_PER_PAGE == 20
        assert cfg.FLASKY_FOLLOWERS_PER_PAGE == 50
        assert cfg.FLASKY_COMMENTS_PER_PAGE == 30
        assert cfg.FLASKY_SLOW_DB_QUERY_TIME == 0.5

    def test_production_config_server_name_default(self, monkeypatch):
        """Ensure SERVER_NAME defaults to empty string without env var, no KeyError."""
        monkeypatch.delenv('SERVER_NAME', raising=False)
        # ProductionConfig should now use default ''
        cfg = ProductionConfig()
        assert cfg.SERVER_NAME == ''

    def test_production_config_with_env_var(self, monkeypatch):
        """SERVER_NAME gets value from environment variable."""
        monkeypatch.setenv('SERVER_NAME', 'example.com')
        cfg = ProductionConfig()
        assert cfg.SERVER_NAME == 'example.com'

    def test_mail_use_tls_parsing(self, monkeypatch):
        """MAIL_USE_TLS should be True for common truthy strings."""
        for val in ('true', 'True', 'TRUE', 'on', 'On', '1'):
            monkeypatch.setenv('MAIL_USE_TLS', val)
            cfg = Config()
            assert cfg.MAIL_USE_TLS is True, f"failed for value {val}"

        # test false values
        for val in ('false', 'False', 'off', '0', 'no'):
            monkeypatch.setenv('MAIL_USE_TLS', val)
            cfg = Config()
            assert cfg.MAIL_USE_TLS is False, f"failed for value {val}"

    def test_dev_config_sqlite_uri_fallback(self, monkeypatch):
        """DevelopmentConfig uses sqlite:///data-dev.sqlite if no env var set."""
        monkeypatch.delenv('DEV_DATABASE_URL', raising=False)
        cfg = DevelopmentConfig()
        expected_path = 'sqlite:///' + os.path.join(os.path.abspath(os.path.dirname(__file__)), '..', 'data-dev.sqlite')
        assert cfg.SQLALCHEMY_DATABASE_URI == expected_path

    def test_config_dict_contains_all_keys(self):
        """The config dictionary should have all expected names and the default key."""
        expected_keys = {
            'development', 'testing', 'production',
            'heroku', 'docker', 'unix', 'default'
        }
        assert set(config_dict.keys()) == expected_keys
        assert config_dict['default'] is DevelopmentConfig
        assert config_dict['production'] is ProductionConfig
        assert config_dict['heroku'] is HerokuConfig
        assert config_dict['docker'] is DockerConfig
        assert config_dict['unix'] is UnixConfig
        assert config_dict['testing'] is TestingConfig