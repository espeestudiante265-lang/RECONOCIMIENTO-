# core/views_admin_professors.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

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

VALID_ROLES = ("admin", "profesor", "estudiante")

def ensure_role_groups():
    for r in VALID_ROLES:
        Group.objects.get_or_create(name=r)

class ProfessorsListView(APIView):
    """
    GET /api/admin/courses/professors/
    Devuelve [{id, username, email}] de usuarios que son profesores
    por grupo *o* por campo user.role == 'profesor'.
    """
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]

    def get(self, request):
        ensure_role_groups()
        # por grupo
        qs_group = User.objects.filter(groups__name="profesor")
        # por campo role (si existe)
        try:
            qs_role = User.objects.filter(role="profesor")
        except Exception:
            qs_role = User.objects.none()
        qs = (qs_group | qs_role).filter(is_active=True).distinct().order_by("username")
        return Response(list(qs.values("id", "username", "email")))

class SyncRoleGroupsView(APIView):
    """
    POST /api/admin/roles/sync/
    Sincroniza el campo user.role -> pertenencia a grupos (admin/profesor/estudiante).
    Útil si ya tienes 'role' en la tabla pero los grupos están vacíos.
    """
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]

    def post(self, request):
        ensure_role_groups()
        added = 0
        for u in User.objects.all():
            role = getattr(u, "role", None)
            if role in VALID_ROLES:
                # quita roles previos y asigna el actual
                for r in VALID_ROLES:
                    g = Group.objects.get(name=r)
                    u.groups.remove(g)
                g = Group.objects.get(name=role)
                u.groups.add(g); added += 1
                # staff si es admin (no superuser)
                if role == "admin" and not u.is_staff:
                    u.is_staff = True
                    u.save(update_fields=["is_staff"])
        return Response({"ok": True, "synced": added}, status=status.HTTP_200_OK)
