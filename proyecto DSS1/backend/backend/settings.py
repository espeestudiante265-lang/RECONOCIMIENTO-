# backend/settings.py
from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# ── Básicos ─────────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-key-change-me")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# Dominio del FRONTEND (Next.js en Railway)
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "https://reconocimiento-production-d389.up.railway.app",
)

# Hosts del backend (incluye tu dominio Railway)
_allowed = os.getenv("ALLOWED_HOSTS")
if _allowed:
    ALLOWED_HOSTS = [h.strip() for h in _allowed.split(",") if h.strip()]
else:
    ALLOWED_HOSTS = [
        "reconocimiento-production-496c.up.railway.app",
        "*.up.railway.app",
        "localhost",
        "127.0.0.1",
    ]

# Para CSRF (debe llevar esquema https://)
CSRF_TRUSTED_ORIGINS = [
    "https://reconocimiento-production-496c.up.railway.app",
    "https://*.up.railway.app",
    FRONTEND_ORIGIN,
]

# ── Apps / Middleware ───────────────────────────────────────────────────────────
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",

    "core.apps.CoreConfig",
    "attendance.apps.AttendanceConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # debe ir antes de CommonMiddleware
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "backend.wsgi.application"

# ── Base de Datos (MySQL en Railway si hay variables; sino SQLite) ──────────────
if any(k in os.environ for k in ["MYSQLHOST", "MYSQL_HOST", "MYSQL_HOSTNAME"]):
    import pymysql
    pymysql.install_as_MySQLdb()

    DB_NAME = (
        os.getenv("MYSQLDATABASE")
        or os.getenv("MYSQL_DATABASE")
        or os.getenv("MYSQL_DB")
        or "railway"
    )
    DB_USER = os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER") or "root"
    DB_PASSWORD = os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD") or ""
    DB_HOST = (
        os.getenv("MYSQLHOST")
        or os.getenv("MYSQL_HOST")
        or os.getenv("MYSQL_HOSTNAME")
        or "localhost"
    )
    DB_PORT = os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT") or "3306"

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": "railway",
            "USER": "root",
            "PASSWORD": "sxqTlOcxtkTegRzNWkurjNQTvSuPbTyE",
           "HOST": "metro.proxy.rlwy.net",
           "PORT": "50273",
            "OPTIONS": {"charset": "utf8mb4"},
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

# ── Passwords / i18n ───────────────────────────────────────────────────────────
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ── Archivos estáticos ──────────────────────────────────────────────────────────
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Usuario personalizado
AUTH_USER_MODEL = "core.User"

# ── CORS / CSRF ────────────────────────────────────────────────────────────────
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    FRONTEND_ORIGIN,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",   # vite opcional
]
CORS_ALLOW_CREDENTIALS = True

CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = not DEBUG  # HTTPS en prod

# ── DRF + JWT ──────────────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# ── Parámetros globales de tu app ──────────────────────────────────────────────
PCT_ACTIVITY = 70
PCT_ATTENTION = 30
