from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Course, Enrollment
from .serializers import UserBasicSerializer
from .serializers import CourseWriteSerializer, CourseReadSerializer  # usa los tuyos

User = get_user_model()

VALID_ROLES = {"admin", "profesor", "estudiante"}

class IsProfessor(permissions.BasePermission):
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser or u.is_staff:
            return True
        # por campo role o grupo
        if getattr(u, "role", "") in ("profesor", "admin"):
            return True
        return u.groups.filter(name__in=["profesor", "admin"]).exists()

def get_current_role(user):
    g = set(user.groups.values_list("name", flat=True)) & VALID_ROLES
    if g:
        return next(iter(g))
    return getattr(user, "role", "") or ""

def _students_base_qs():
    """
    QS de usuarios con rol/grupo 'estudiante'
    """
    # por grupo
    qs_group = User.objects.filter(groups__name="estudiante")
    # por campo role (si existe)
    try:
        qs_role = User.objects.filter(role="estudiante")
    except Exception:
        qs_role = User.objects.none()
    return (qs_group | qs_role).filter(is_active=True).distinct()

class ProfessorCourseViewSet(viewsets.ModelViewSet):
    """
    /api/prof/courses/           (GET/POST)
    /api/prof/courses/{id}/      (GET/PATCH/DELETE)
    /api/prof/courses/{id}/students/    (GET)
    /api/prof/courses/{id}/candidates/  (GET)
    """
    permission_classes = [permissions.IsAuthenticated, IsProfessor]
    queryset = Course.objects.all()

    # usa read/write serializers que ya tienes
    def get_serializer_class(self):
        if self.action in ["list", "retrieve"]:
            return CourseReadSerializer
        return CourseWriteSerializer

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        # si es profesor (no admin), solo sus cursos
        if not (u.is_superuser or u.is_staff or get_current_role(u) == "admin"):
            qs = qs.filter(owner=u)
        return qs

    @action(detail=True, methods=["get"], url_path="students")
    def students(self, request, pk=None):
        course = get_object_or_404(self.get_queryset(), pk=pk)
        ids = Enrollment.objects.filter(course=course).values_list("student_id", flat=True)
        students = User.objects.filter(id__in=ids)
        return Response(UserBasicSerializer(students, many=True).data)

    @action(detail=True, methods=["get"], url_path="candidates")
    def candidates(self, request, pk=None):
        course = get_object_or_404(self.get_queryset(), pk=pk)
        enrolled_ids = set(Enrollment.objects.filter(course=course).values_list("student_id", flat=True))
        qs = _students_base_qs().exclude(id__in=enrolled_ids)

        # fallback defensivo si aún no tienes roles/grupos sincronizados
        if not qs.exists():
            qs = User.objects.filter(is_active=True, is_staff=False, is_superuser=False) \
                             .exclude(id__in=enrolled_ids) \
                             .exclude(id=course.owner_id)

        qs = qs.order_by("first_name", "last_name", "username").distinct()
        return Response(UserBasicSerializer(qs, many=True).data)
