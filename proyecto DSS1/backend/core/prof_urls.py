from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_professor_courses import ProfessorCourseViewSet

router = DefaultRouter()
router.register(r"courses", ProfessorCourseViewSet, basename="prof-courses")

urlpatterns = [
    path("", include(router.urls)),
]
