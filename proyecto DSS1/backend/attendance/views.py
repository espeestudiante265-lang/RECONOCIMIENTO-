from django.utils import timezone
from django.conf import settings
from django.db.models import Avg, Count
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes as drf_permission_classes
from rest_framework.exceptions import PermissionDenied

# --- Permisos (usa los tuyos; si faltan, fallback seguro) ---
try:
    from attendance.permissions import IsRoleAdmin, IsSuperUser
except Exception:
    class IsSuperUser(permissions.BasePermission):
        def has_permission(self, request, view):
            return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

    class IsRoleAdmin(permissions.BasePermission):
        def has_permission(self, request, view):
            u = request.user
            return bool(
                u and u.is_authenticated and (
                    u.is_superuser or u.is_staff or getattr(u, "role", "") == "admin" or
                    u.groups.filter(name="admin").exists()
                )
            )

from .models import AttendanceSession, AttentionSample, SystemConfig
from .serializers import (
    AttendanceSessionSerializer,
    AttentionSampleSerializer,
    SystemConfigSerializer,
    AttentionSampleCreateSerializer,   # nuevo
    StopSessionPayloadSerializer,      # nuevo
)

User = get_user_model()
VALID_ROLES = {"admin", "profesor", "estudiante"}

# ---------- Gestión de roles (solo superusuario) ----------
@api_view(["POST"])
@drf_permission_classes([IsSuperUser])
def set_user_role(request):
    username = request.data.get("username")
    role = request.data.get("role")

    if not username or not role:
        return Response({"detail": "username y role son requeridos."}, status=400)
    if role not in VALID_ROLES:
        return Response({"detail": "Rol inválido."}, status=400)

    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return Response({"detail": "Usuario no existe."}, status=404)

    for r in VALID_ROLES:
        Group.objects.get_or_create(name=r)
    for r in VALID_ROLES:
        grp = Group.objects.get(name=r)
        user.groups.remove(grp)

    grp = Group.objects.get(name=role)
    user.groups.add(grp)
    user.is_staff = (role == "admin")
    user.save(update_fields=["is_staff"])

    return Response({"ok": True, "username": user.username, "role": role}, status=200)


# ---------- Sesiones y muestreos ----------
class StartSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Cierra cualquier sesión abierta previa (defensivo)
        AttendanceSession.objects.filter(student=request.user, ended_at__isnull=True).update(
            ended_at=timezone.now()
        )
        ses = AttendanceSession.objects.create(student=request.user)
        return Response({'id': ses.id}, status=status.HTTP_201_CREATED)


class SampleCreateView(APIView):
    """
    Opción A: no exige 'session' en el body.
    Toma la sesión abierta del usuario y crea la muestra.
    Body:
      { score: 0..100, absent?: bool, reason?: str, ear?: float, mar?: float, yaw?: float }
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ses = (
            AttendanceSession.objects
            .filter(student=request.user, ended_at__isnull=True)
            .order_by("-id").first()
        )
        if not ses:
            return Response({"detail": "no open session"}, status=200)  # silencioso

        ser = AttentionSampleCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        d = ser.validated_data

        AttentionSample.objects.create(
            session=ses,
            score=int(d["score"]),
            absent=bool(d.get("absent", False)),
            reason=(d.get("reason") or "")[:64],
            ear=d.get("ear"),
            mar=d.get("mar"),
            yaw=d.get("yaw"),
        )
        return Response({"ok": True}, status=201)


class StopSessionView(APIView):
    """
    Opción A: cierra la sesión ABIERTA y guarda promedio FINAL **sobre 20**.
    Acepta cualquiera de:
      - time_adjusted_avg (0..100)
      - average_score_100 (0..100)
      - average_score (0..1)
    Si no llega ninguno, calcula del promedio de samples (score 0..100).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ses = (
            AttendanceSession.objects
            .filter(student=request.user, ended_at__isnull=True)
            .order_by("-id").first()
        )
        if not ses:
            return Response({'detail': 'no open session'}, status=400)

        payload = StopSessionPayloadSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        v = payload.validated_data

        avg100 = None
        if v.get("time_adjusted_avg") is not None:
            avg100 = int(v["time_adjusted_avg"])               # 0..100
        elif v.get("average_score_100") is not None:
            avg100 = int(v["average_score_100"])               # 0..100
        elif v.get("average_score") is not None:
            try:
                avg100 = int(round(float(v["average_score"]) * 100))  # 0..1 -> 0..100
            except (TypeError, ValueError):
                avg100 = None

        if avg100 is None:
            agg = ses.samples.aggregate(val=Avg("score"))
            avg100 = int(round(agg.get("val") or 0.0))

        # Convertimos a escala /20 y guardamos
        avg100 = max(0, min(100, avg100))
        avg20  = round(avg100 * 0.20, 2)

        ses.ended_at = timezone.now()
        ses.average_score = float(avg20)   # SIEMPRE 0..20
        ses.save(update_fields=['ended_at', 'average_score'])

        return Response({'ok': True, 'average_20': ses.average_score}, status=200)


class MySessionsListView(generics.ListAPIView):
    """Lista de sesiones del usuario autenticado"""
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AttendanceSessionSerializer

    def get_queryset(self):
        return AttendanceSession.objects.filter(student=self.request.user)


class LastAttentionView(APIView):
    """Devuelve el último promedio de atención del usuario (0..20)"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        ses = (
            AttendanceSession.objects
            .filter(student=request.user, average_score__isnull=False)
            .order_by('-started_at')
            .first()
        )
        return Response({'average_20': ses.average_score if ses else None})


# ---------- Cálculo de nota final ----------
class ComputeFinalGradeView(APIView):
    """
    final = actividad*(pct_activity/100) + atencion*(pct_attention/100)
    *actividad* y *atencion* se asumen en escala 0..20.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            actividad = float(request.data.get('actividad', 0))
        except (TypeError, ValueError):
            return Response({'detail': 'actividad debe ser numérica'}, status=400)

        cfg = SystemConfig.objects.first()
        if cfg:
            pct_act, pct_att = cfg.pct_activity, cfg.pct_attention
        else:
            pct_act = getattr(settings, 'PCT_ACTIVITY', 70)
            pct_att = getattr(settings, 'PCT_ATTENTION', 30)

        last = (
            AttendanceSession.objects
            .filter(student=request.user, average_score__isnull=False)
            .order_by('-started_at')
            .first()
        )
        atencion = float(last.average_score) if last else 0.0

        final = actividad * (pct_act / 100.0) + atencion * (pct_att / 100.0)
        return Response({
            'actividad': actividad,
            'atencion': atencion,
            'pct_activity': pct_act,
            'pct_attention': pct_att,
            'final_20': round(final, 2),
        })


# ---------- Configuración (solo rol admin) ----------
class SystemConfigView(APIView):
    permission_classes = [IsRoleAdmin]

    def get_object(self):
        obj, _ = SystemConfig.objects.get_or_create(id=1)
        return obj

    def get(self, request):
        cfg = self.get_object()
        return Response(SystemConfigSerializer(cfg).data)

    def put(self, request):
        cfg = self.get_object()
        ser = SystemConfigSerializer(cfg, data=request.data)
        ser.is_valid(raise_exception=True)
        cfg = ser.save()
        return Response(SystemConfigSerializer(cfg).data)


# ---------- Reporte (solo rol admin) ----------
class AttendanceReportView(APIView):
    permission_classes = [IsRoleAdmin]

    def get(self, request):
        from_date = request.query_params.get("from")
        to_date   = request.query_params.get("to")

        qs = AttendanceSession.objects.all()
        if from_date:
            qs = qs.filter(started_at__date__gte=from_date)
        if to_date:
            qs = qs.filter(started_at__date__lte=to_date)

        sessions = list(qs.values(
            "id", "student__username", "started_at", "ended_at", "average_score"  # /20
        ))

        summary = list(
            qs.values("student__username")
              .annotate(avg_attention=Avg("average_score"), sessions=Count("id"))  # /20
              .order_by("-avg_attention")
        )

        return Response({"sessions": sessions, "summary": summary})
