# core/views_admin_courses.py
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.contrib.auth.models import Group

from .models import Course, Module

# Usa los serializers compartidos con admin
try:
    from .serializers_admin_courses import (
        CourseAdminSerializer, ModuleLiteSerializer, get_current_role
    )
except Exception:
    from .serializers import (  # type: ignore
        CourseAdminSerializer, ModuleLiteSerializer, get_current_role
    )

User = get_user_model()

# -------- Permiso admin (fallback seguro) --------
class IsRoleAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(
            u and u.is_authenticated and (
                u.is_superuser or u.is_staff or
                getattr(u, "role", "") == "admin" or
                u.groups.filter(name="admin").exists()
            )
        )

# -------- util: asegurar grupos (admin/profesor/estudiante) --------
VALID_ROLES = ("admin", "profesor", "estudiante")
def ensure_role_groups():
    for r in VALID_ROLES:
        Group.objects.get_or_create(name=r)

class AdminCourseViewSet(viewsets.ModelViewSet):
    """
    /api/admin/courses/               (GET, POST)
    /api/admin/courses/{id}/          (GET, PUT/PATCH, DELETE)
    /api/admin/courses/{id}/add_module/          (POST {name})
    /api/admin/courses/{id}/modules/{mid}/       (DELETE)
    /api/admin/courses/{id}/assign_professor/    (POST {professor_id})
    /api/admin/courses/professors/               (GET)
    """
    serializer_class = CourseAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]
    queryset = Course.objects.all().select_related("professor")
    pagination_class = None  # el front espera array simple

    def get_queryset(self):
        qs = super().get_queryset()
        try:
            role = get_current_role(self.request.user)
        except Exception:
            role = None
        if role == "profesor":
            return qs.filter(professor=self.request.user)
        return qs

    def create(self, request, *args, **kwargs):
        code  = (request.data.get("code")  or "").strip()
        title = (request.data.get("title") or request.data.get("name") or "").strip()
        if not code or not title:
            return Response({"detail": "code y title son requeridos"}, status=400)

        fields = {"code": code}
        if hasattr(Course, "title"):
            fields["title"] = title
        elif hasattr(Course, "name"):
            fields["name"] = title

        obj = Course.objects.create(**fields)
        return Response(self.get_serializer(obj).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def add_module(self, request, pk=None):
        course = self.get_object()
        name = (request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "name requerido"}, status=400)
        m = Module.objects.create(course=course, name=name)
        return Response(ModuleLiteSerializer(m).data, status=201)

    @action(detail=True, methods=["delete"], url_path=r"modules/(?P<module_id>\d+)")
    def delete_module(self, request, pk=None, module_id=None):
        course = self.get_object()
        mod = get_object_or_404(Module, id=module_id, course=course)
        mod.delete()
        return Response(status=204)

    @action(detail=True, methods=["post"])
    def assign_professor(self, request, pk=None):
        course = self.get_object()
        prof_id = request.data.get("professor_id")
        if prof_id in ("", None):
            course.professor = None
            course.save(update_fields=["professor"])
            return Response(self.get_serializer(course).data)
        prof = get_object_or_404(User, id=prof_id)
        course.professor = prof
        course.save(update_fields=["professor"])
        return Response(self.get_serializer(course).data)

    @action(detail=False, methods=["get"])
    def professors(self, request):
        """
        Devuelve [{id, username, email}] de usuarios con:
        - group 'profesor'  OR
        - campo user.role == 'profesor' (si existe)
        Crea los grupos base si faltan.
        """
        ensure_role_groups()

        # por grupo
        qs_group = User.objects.filter(groups__name="profesor")
        # por campo role, si existe
        try:
            qs_role = User.objects.filter(role="profesor")
        except Exception:
            qs_role = User.objects.none()

        qs = (qs_group | qs_role).filter(is_active=True).distinct().order_by("username")
        data = list(qs.values("id", "username", "email"))
        return Response(data)
