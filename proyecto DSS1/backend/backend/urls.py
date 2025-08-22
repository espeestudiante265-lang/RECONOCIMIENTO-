from django.contrib import admin
from django.urls import path, include
from django.views.generic import RedirectView
from django.conf import settings
from django.conf.urls.static import static

# SimpleJWT
from rest_framework_simplejwt.views import (
    TokenObtainPairView,   # crea {access, refresh}
    TokenRefreshView,      # refresca {access}
    TokenVerifyView,       # opcional: verifica access
)

urlpatterns = [
    path("admin/", admin.site.urls),

    # API principal
    path("api/", include("core.urls")),
    path("api/admin/", include("core.admin_urls")),
    path("api/prof/", include("core.prof_urls")),
    path("api/attendance/", include("attendance.urls")),

    # --- SimpleJWT (rutas canónicas que usará el frontend) ---
    path("api/auth/jwt/create/",  TokenObtainPairView.as_view(), name="jwt-create"),
    path("api/auth/jwt/refresh/", TokenRefreshView.as_view(),   name="jwt-refresh"),
    path("api/auth/jwt/verify/",  TokenVerifyView.as_view(),    name="jwt-verify"),  # opcional

    # --- Alias de compatibilidad (por si algo usa /api/token/...) ---
    path("api/token/",            TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/",    TokenRefreshView.as_view(),    name="token_refresh"),

    # Redirige raíz a alguna vista pública de tu API
    path("", RedirectView.as_view(url="/api/home/", permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
