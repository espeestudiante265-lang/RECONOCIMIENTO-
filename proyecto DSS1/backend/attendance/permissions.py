# attendance/permissions.py
from rest_framework.permissions import BasePermission

VALID_ROLES = {"admin", "profesor", "estudiante"}

def get_role(user):
    g = set(user.groups.values_list("name", flat=True)) & VALID_ROLES
    if g:
        return next(iter(g))
    return getattr(user, "role", "") or ""

class IsRoleAdmin(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and (u.is_superuser or get_role(u) == "admin"))

class IsProfessor(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and get_role(u) == "profesor")

class IsSuperUser(BasePermission):
    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.is_superuser)
