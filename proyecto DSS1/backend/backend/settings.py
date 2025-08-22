# backend/settings.py
from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# 🔐 Variables base
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-key-change-me")
DEBUG = os.getenv("DEBUG", "False").lower() == "true"

# --- Hosts permitidos (no dupliques más abajo) ---
_ALLOWED = os.getenv("ALLOWED_HOSTS")  # ej: "reconocimiento-production-496c.up.railway.app,localhost"
if _ALLOWED:
    ALLOWED_HOSTS = [h.strip() for h in _ALLOWED.split(",") if h.strip()]
else:
    # ⚠️ Cambia el dominio del backend si es diferente
    ALLOWED_HOSTS = [
        "reconocimiento-production-496c.up.railway.app",
        "*.up.railway.app",
        "localhost",
        "127.0.0.1",
    ]

# Dominio del FRONTEND (para CSRF/CORS). Puedes sobreescribir por env.
FRONTEND_ORIGIN = os.getenv(
    "FRONTEND_ORIGIN",
    "https://reconocimiento-production-d389.up.railway.app",
)

# Para admin/formularios/CSRF (debe llevar esquema https://)
CSRF_TRUSTED_ORIGINS = [
    FRONTEND_ORIGIN,
    "https://*.up.railway.app",
]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "corsheaders",
    "rest_framework",
    "rest_framework_simplejwt",   # ⬅️ NUEVO
    "djoser",                       # ⬅️ NUEVO

    "core.apps.CoreConfig",
    "attendance.apps.AttendanceConfig",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # debe ir arriba de CommonMiddleware
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

# ✅ DB: Railway MySQL si hay variables; si no, SQLite
if os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST"):
    try:
        import pymysql
        pymysql.install_as_MySQLdb()
    except Exception:
        pass

    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("MYSQLDATABASE") or os.getenv("MYSQL_DB", ""),
            "USER": os.getenv("MYSQLUSER") or os.getenv("MYSQL_USER", ""),
            "PASSWORD": os.getenv("MYSQLPASSWORD") or os.getenv("MYSQL_PASSWORD", ""),
            "HOST": os.getenv("MYSQLHOST") or os.getenv("MYSQL_HOST", ""),
            "PORT": os.getenv("MYSQLPORT") or os.getenv("MYSQL_PORT", "3306"),
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

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"  # necesario en deploy

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Usuario personalizado
AUTH_USER_MODEL = "core.User"

# ---- CORS / CSRF ----
# Si usas JWT puro no necesitas cookies, pero dejamos credenciales por si cambias a sesiones.
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [FRONTEND_ORIGIN]
CORS_ALLOW_CREDENTIALS = True

# Cookies seguras detrás del proxy de Railway
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# DRF + JWT
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

# Parámetros globales
PCT_ACTIVITY = 70
PCT_ATTENTION = 30

MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
