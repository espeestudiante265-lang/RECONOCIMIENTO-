from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from .serializers import UserAdminSerializer, get_current_role
from attendance.permissions import IsRoleAdmin

User = get_user_model()

class AdminUsersListCreate(generics.ListCreateAPIView):
    permission_classes = [IsRoleAdmin]
    serializer_class = UserAdminSerializer

    def get_queryset(self):
        qs = User.objects.all().order_by("username")
        # Si NO es superuser, no puede ver superusers ni usuarios con rol admin
        if not self.request.user.is_superuser:
            ids_excluir = [
                u.id for u in qs if (u.is_superuser or get_current_role(u) == "admin")
            ]
            qs = qs.exclude(id__in=ids_excluir)
        return qs

class AdminUsersDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsRoleAdmin]
    serializer_class = UserAdminSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        qs = User.objects.all()
        if not self.request.user.is_superuser:
            ids_excluir = [
                u.id for u in qs if (u.is_superuser or get_current_role(u) == "admin")
            ]
            qs = qs.exclude(id__in=ids_excluir)
        return qs

    def perform_destroy(self, instance):
        # admin (no superuser) no puede borrar superusers ni usuarios con rol admin
        if not self.request.user.is_superuser:
            role = get_current_role(instance)
            if instance.is_superuser or role == "admin":
                raise PermissionDenied("No tienes permisos para esta acción.")
        instance.delete()
