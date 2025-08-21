# attendance/apps.py
from django.apps import AppConfig

class AttendanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "attendance"

    def ready(self):
        # Importa señales sin tocar la BD directamente aquí
        from . import signals  # noqa: F401
