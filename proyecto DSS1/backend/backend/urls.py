from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path("admin/", admin.site.urls),

    # API principal (core)
    path("api/", include("core.urls")),

    # Rutas admin específicas si tienes core.admin_urls (lo mantengo tal cual indicaste)
    path("api/admin/", include("core.admin_urls")),
    path('api/prof/', include('core.prof_urls')),

    # Módulo de asistencia
    path("api/attendance/", include("attendance.urls")),

    # JWT
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # Redirect a /api/home/ si navegan al root
    path("", RedirectView.as_view(url="/api/home/", permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)