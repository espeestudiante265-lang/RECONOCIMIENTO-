# core/auth.py
from django.contrib.auth.models import Group
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class TokenObtainPairWithRoleSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        return super().get_token(user)

    def validate(self, attrs):
        data = super().validate(attrs)
        # añade role (primer grupo válido de los nuestros)
        VALID_ROLES = {"admin", "profesor", "estudiante"}
        user = self.user
        user_groups = set(user.groups.values_list("name", flat=True))
        role = next(iter(VALID_ROLES & user_groups), "")
        data["role"] = role
        data["username"] = user.username
        return data

class TokenObtainPairWithRoleView(TokenObtainPairView):
    serializer_class = TokenObtainPairWithRoleSerializer
