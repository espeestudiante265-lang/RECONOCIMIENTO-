from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

from .models import Course, Enrollment
from .serializers import EnrollmentSerializer  # ya lo tienes
from .views_professor_courses import IsProfessor, get_current_role  # reutilizamos

User = get_user_model()

class ProfessorEnrollmentViewSet(viewsets.ModelViewSet):
    """
    /api/prof/enrollments/ (GET/POST)
    - GET ?course=<id> -> lista alumnos del curso (Enrollment)
    - POST {course, student} -> crea matrícula si el curso es del profesor
    """
    permission_classes = [permissions.IsAuthenticated, IsProfessor]
    serializer_class = EnrollmentSerializer
    queryset = Enrollment.objects.all()

    def get_queryset(self):
        u = self.request.user
        qs = super().get_queryset()
        # filtra por curso del profesor (si no es admin)
        if not (u.is_superuser or u.is_staff or get_current_role(u) == "admin"):
            qs = qs.filter(course__owner=u)
        # filtro opcional por ?course=
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs

    def create(self, request, *args, **kwargs):
        course_id = request.data.get("course")
        student_id = request.data.get("student")

        if not course_id or not student_id:
            return Response({"detail": "Faltan campos: course, student"}, status=400)

        # valida que el curso sea del profesor (si no es admin)
        course = get_object_or_404(Course, pk=course_id)
        u = request.user
        if not (u.is_superuser or u.is_staff or get_current_role(u) == "admin"):
            if course.owner_id != u.id:
                return Response({"detail": "No puedes matricular en cursos de otros profesores."}, status=403)

        # evita duplicados
        if Enrollment.objects.filter(course=course, student_id=student_id).exists():
            return Response({"detail": "El estudiante ya está matriculado en este curso."}, status=400)

        # usa el serializer existente (que ya maneja created_at gracefully)
        data = {"course": course.id, "student": student_id}
        ser = self.get_serializer(data=data, context={"request": request})
        ser.is_valid(raise_exception=True)
        self.perform_create(ser)
        return Response(ser.data, status=status.HTTP_201_CREATED)
