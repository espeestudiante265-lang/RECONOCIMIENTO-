# core/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_professor_courses import ProfessorCourseViewSet
from .views_prof_enrollments import ProfessorEnrollmentViewSet
from .views_admin_professors import ProfessorsListView, SyncRoleGroupsView
from .views import (
    RegisterView, LoginView, HomeView, MeView, UserView,
    UserViewSet, CourseViewSet, ModuleViewSet,
    ActivityViewSet, SubmissionViewSet, EnrollmentViewSet,
    AdminUserListCreateView, AdminUserDetailView,
    AdminCourseViewSet, AdminParametersView, EvaluationViewSet, AdminUserViewSet
)

# View(s) de asistencia
from .views_attendance import (
    AttendanceViewSet, AttendanceReportView, ProfessorAttendanceReportView
)

router = DefaultRouter()

def safe_register(r: DefaultRouter, prefix: str, viewset, basename: str) -> None:
    existing_basenames = {bn for (_, __, bn) in r.registry}
    base = basename
    i = 2
    while basename in existing_basenames:
        basename = f"{base}-v{i}"
        i += 1
    r.register(prefix, viewset, basename=basename)

# ====== Router principal ======
safe_register(router, r'users',        UserViewSet,        basename='user')
safe_register(router, r'courses',      CourseViewSet,      basename='course')
safe_register(router, r'modules',      ModuleViewSet,      basename='module')
safe_register(router, r'activities',   ActivityViewSet,    basename='activity')
safe_register(router, r'submissions',  SubmissionViewSet,  basename='submission')
safe_register(router, r'enrollments',  EnrollmentViewSet,  basename='enrollment')
safe_register(router, r'evaluations',  EvaluationViewSet,  basename='evaluation')
router.register(r'api/admin/users', AdminUserViewSet, basename='admin-users')
# asistencia base
safe_register(router, r'attendance', AttendanceViewSet, basename='attendance')

# (opcional) reporte admin como ViewSet
_attendance_report_is_viewset = hasattr(AttendanceReportView, 'get_extra_actions')
try:
    if _attendance_report_is_viewset:
        safe_register(router, r'attendance-report', AttendanceReportView, basename='attendance-report')
except Exception:
    _attendance_report_is_viewset = False

# Rutas “prof”
safe_register(router, r'prof/courses',     ProfessorCourseViewSet,     basename='prof-courses')
safe_register(router, r'prof/enrollments', ProfessorEnrollmentViewSet, basename='prof-enrollments')

# ====== Router para admin ======
admin_router = DefaultRouter()
safe_register(admin_router, r'courses', AdminCourseViewSet, basename='admin-course')

urlpatterns = [
    # AUTH
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/',    LoginView.as_view(),    name='login'),
    path('auth/me/',       MeView.as_view(),       name='me'),

    # Otros endpoints simples
    path('home/', HomeView.as_view(), name='home'),
    path('user/', UserView.as_view(), name='user'),

    # API base (router sin prefijo; backend/urls.py agrega '/api/')
    path('', include(router.urls)),

    # ADMIN extra
    path('admin/users/',          AdminUserListCreateView.as_view(), name='admin-user-list-create'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(),     name='admin-user-detail'),
    path('admin/',                include(admin_router.urls)),
    path('admin/parameters/',     AdminParametersView.as_view(),     name='admin-parameters'),

    # utilidades admin
    path('admin/courses/professors/', ProfessorsListView.as_view()),
    path('admin/roles/sync/',         SyncRoleGroupsView.as_view()),

    # 👇 reporte de profesor (ARRAY plano para el frontend)
    path('attendance/professor-report/', ProfessorAttendanceReportView.as_view(),
         name='attendance-professor-report'),
]

# Si el reporte admin NO es un ViewSet, exponlo como APIView aquí.
if not _attendance_report_is_viewset:
    urlpatterns += [
        path('attendance-report/', AttendanceReportView.as_view(), name='attendance-report'),
    ]
