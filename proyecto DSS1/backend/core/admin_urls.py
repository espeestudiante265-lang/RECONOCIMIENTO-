# core/admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# --- Cursos (ViewSet) ---
try:
    from .views_admin_courses import AdminCourseViewSet
except Exception:
    from .views import AdminCourseViewSet  # type: ignore

# --- Usuarios (endpoints admin, si existen) ---
AdminUserListCreateView = None
AdminUserDetailView = None
try:
    from .views_admin_users import AdminUserListCreateView, AdminUserDetailView  # type: ignore
except Exception:
    try:
        from .views import AdminUserListCreateView, AdminUserDetailView  # type: ignore
    except Exception:
        pass

# --- Parámetros globales (si existe) ---
AdminParametersView = None
try:
    from .views_admin_params import AdminParametersView  # type: ignore
except Exception:
    try:
        from .views import AdminParametersView  # type: ignore
    except Exception:
        pass

# --- Profesores (APIView independiente) ---
ProfessorsListView = None
SyncRoleGroupsView = None
try:
    from .views_admin_professors import ProfessorsListView, SyncRoleGroupsView
except Exception:
    pass

router = DefaultRouter()
router.register(r'courses', AdminCourseViewSet, basename='admin-courses')

urlpatterns = []

# Usuarios
if AdminUserListCreateView and AdminUserDetailView:
    urlpatterns += [
        path('users/', AdminUserListCreateView.as_view(), name='admin-users'),
        path('users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    ]

# Parámetros
if AdminParametersView:
    urlpatterns += [
        path('parameters/', AdminParametersView.as_view(), name='admin-parameters'),
    ]

# Profesores (lo que necesita el modal del admin)
if ProfessorsListView:
    urlpatterns += [
        path('courses/professors/', ProfessorsListView.as_view(), name='admin-courses-professors'),
    ]
if SyncRoleGroupsView:
    urlpatterns += [
        path('roles/sync/', SyncRoleGroupsView.as_view(), name='admin-roles-sync'),
    ]

# Cursos (panel admin) + acciones del ViewSet
urlpatterns += [
    path('', include(router.urls)),
]
