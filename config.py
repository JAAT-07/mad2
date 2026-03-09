"""Configuration for Placement Portal Application."""
import os

from dotenv import load_dotenv
load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY") or "placement-portal-secret-key-2025"
    DATABASE_PATH = os.path.join(BASE_DIR, "instance", "placement.db")
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max for resume uploads
    UPLOAD_FOLDER = os.path.join(BASE_DIR, "instance", "uploads")

    # Redis / Celery configuration for caching and background jobs
    REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", REDIS_URL)
    CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", REDIS_URL)

    # Basic mail settings used by background jobs (configure via env for real emails)
    MAIL_SERVER = os.environ.get("MAIL_SERVER", "")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", "587"))
    MAIL_USE_TLS = os.environ.get("MAIL_USE_TLS", "1") == "1"
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "")
    MAIL_SENDER = os.environ.get("MAIL_SENDER", "no-reply@placement-portal.local")
    ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@institute.edu")
