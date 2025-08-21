# core/serializers_admin_courses.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Course, Module

User = get_user_model()

class ModuleLiteSerializer(serializers.ModelSerializer):
  class Meta:
    model = Module
    fields = ("id", "name")

class CourseAdminSerializer(serializers.ModelSerializer):
  # Compatibilidad con title/name
  title = serializers.SerializerMethodField()
  name  = serializers.SerializerMethodField()

  professor_id = serializers.SerializerMethodField()
  professor_username = serializers.SerializerMethodField()

  modules = serializers.SerializerMethodField()

  class Meta:
    model  = Course
    fields = (
      "id", "code", "title", "name",
      "professor_id", "professor_username",
      "modules",
    )

  def get_title(self, obj):
    return getattr(obj, "title", None) or getattr(obj, "name", None) or str(obj)

  def get_name(self, obj):
    return getattr(obj, "name", None) or getattr(obj, "title", None) or str(obj)

  def get_professor_id(self, obj):
    prof = getattr(obj, "professor", None)
    return getattr(prof, "id", None)

  def get_professor_username(self, obj):
    prof = getattr(obj, "professor", None)
    return getattr(prof, "username", None)

  def get_modules(self, obj):
    rel = getattr(obj, "modules", None) or getattr(obj, "module_set", None)
    qs = rel.all() if rel is not None else Module.objects.none()
    return ModuleLiteSerializer(qs, many=True).data

# Fallback util si no tienes get_current_role ya definido
def get_current_role(user):
  try:
    # si tienes grupos admin/profesor/estudiante
    g = set(user.groups.values_list("name", flat=True))
    for r in ("admin", "profesor", "estudiante"):
      if r in g: return r
  except Exception:
    pass
  # atributos directos
  return getattr(user, "role", None)
