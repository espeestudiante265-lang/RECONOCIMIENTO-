# core/views_attendance.py
from django.utils import timezone
from django.db import transaction
from django.db.models import Avg, Count, Max
from rest_framework import viewsets, status, permissions, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from .models import AttendanceSession, ActivityAttempt, Course, Enrollment
from .utils import recompute_final_grade_for

# === roles helpers ===
VALID_ROLES = {"admin", "profesor", "estudiante"}

def get_current_role(user):
    g = set(user.groups.values_list("name", flat=True)) & VALID_ROLES
    if g:
        return next(iter(g))
    return getattr(user, "role", "") or ""

def _course_belongs_to_prof(course, user):
    """
    Valida que el curso pertenezca al profesor.
    Intenta varios nombres de campo comunes sin romper si no existen.
    """
    for attr in ("professor_id", "owner_id", "created_by_id", "teacher_id"):
        if getattr(course, attr, None) == user.id:
            return True
    return user.is_superuser or user.is_staff


# === Serializer liviano (0..1 a 0..100) ===
class AttendanceSessionSerializer(serializers.ModelSerializer):
    attention_percent = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            "id",
            "student",
            "started_at",
            "ended_at",
            "average_score",       # 0..1 en DB
            "attention_percent",   # 0..100 derivado (solo lectura)
        ]
    read_only_fields = ["student", "started_at", "ended_at", "attention_percent"]

    def get_attention_percent(self, obj):
        return round((obj.average_score or 0.0) * 100.0, 2)


class AttendanceViewSet(viewsets.GenericViewSet):
    """
    Endpoints principales de asistencia/monitoreo:
      - GET  /api/attendance/mine/
      - POST /api/attendance/start/    (opcional attempt_id para ligar)
      - POST /api/attendance/stop/     (acepta average_score (0..1) o average_score_100 (0..100))
      - POST /api/attendance/sample/   (opcional, devuelve 204)
    """
    permission_classes = [permissions.IsAuthenticated]
    queryset = AttendanceSession.objects.select_related("student").order_by("-started_at")

    # -------- LISTADO DEL ALUMNO --------
    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request):
        qs = AttendanceSession.objects.filter(student=request.user).order_by("-started_at")
        out = []
        for s in qs:
            course_name = None
            try:
                att = s.activity_attempts.select_related("activity__module__course").first()
                if att and att.activity and att.activity.module and att.activity.module.course:
                    course_name = att.activity.module.course.name
            except Exception:
                pass

            pct = round((s.average_score or 0.0) * 100.0, 2)
            out.append({
                "id": s.id,
                "created_at": s.started_at,
                "started_at": s.started_at,
                "ended_at": s.ended_at,
                "score": pct,                    # para tus UIs
                "attention": pct,
                "attention_score": pct,
                "present": pct >= 50.0,
                "course_name": course_name,
            })
        return Response(out, status=200)

    # -------- START (con enlace opcional a attempt) --------
    @action(detail=False, methods=["post"], url_path="start")
    @transaction.atomic
    def start(self, request):
        attempt_id = request.data.get("attempt_id")

        sess = AttendanceSession.objects.create(
            student=request.user,
            started_at=timezone.now()
        )

        attempt_payload = None
        if attempt_id:
            try:
                attempt = ActivityAttempt.objects.select_related("activity").get(
                    id=int(attempt_id),
                    student=request.user
                )
                if attempt.monitoring_id is None:
                    attempt.monitoring = sess
                    attempt.save(update_fields=["monitoring"])
                attempt_payload = {"id": attempt.id, "activity": attempt.activity_id}
            except (ActivityAttempt.DoesNotExist, ValueError):
                pass
        else:
            # best-effort: intenta enlazar con un intento abierto sin monitoreo
            attempt = (
                ActivityAttempt.objects
                .select_related("activity")
                .filter(student=request.user, ended_at__isnull=True, monitoring__isnull=True)
                .order_by("-started_at")
                .first()
            )
            if attempt:
                attempt.monitoring = sess
                attempt.save(update_fields=["monitoring"])
                attempt_payload = {"id": attempt.id, "activity": attempt.activity_id}

        data = {
            "session": AttendanceSessionSerializer(sess).data,
            "attempt": attempt_payload
        }
        return Response(data, status=status.HTTP_201_CREATED)

    # -------- STOP (guarda promedio y recalcula 70/30) --------
    @action(detail=False, methods=["post"], url_path="stop")
    @transaction.atomic
    def stop(self, request):
        s = (
            AttendanceSession.objects
            .filter(student=request.user, ended_at__isnull=True)
            .order_by("-started_at")
            .first()
        )
        if not s:
            return Response({"detail": "No hay sesión abierta."}, status=400)

        avg01 = request.data.get("average_score", None)
        avg100 = request.data.get("average_score_100", None)

        try:
            if avg100 is not None and avg01 is None:
                avg01 = float(avg100) / 100.0
            avg01 = float(avg01 if avg01 is not None else 0.0)
        except Exception:
            avg01 = 0.0

        avg01 = max(0.0, min(1.0, avg01))

        s.average_score = avg01
        s.ended_at = timezone.now()
        s.save(update_fields=["average_score", "ended_at"])

        # ¿hay attempt enlazado?
        attempt = (
            ActivityAttempt.objects
            .select_related("activity")
            .filter(monitoring_id=s.id, student=request.user)
            .order_by("-started_at")
            .first()
        )
        attempt_payload = None
        if attempt:
            attempt.monitoring_score = round(avg01 * 100.0, 2)
            attempt.save(update_fields=["monitoring_score"])

            # recalcular 70/30 con Parameters o settings (utils)
            recompute_final_grade_for(request.user.id, attempt.activity_id)
            attempt.refresh_from_db()

            attempt_payload = {
                "id": attempt.id,
                "activity": attempt.activity_id,
                "monitoring_score": attempt.monitoring_score or 0.0,
                "evaluation_grade": attempt.evaluation_grade or 0.0,
                "final_grade": attempt.final_grade or 0.0,
            }

        return Response({
            "session": AttendanceSessionSerializer(s).data,
            "attempt": attempt_payload
        }, status=200)

    # -------- Opcional: samples (no persiste) --------
    @action(detail=False, methods=["post"], url_path="sample")
    def sample(self, request):
        return Response(status=204)


# =======================
#  REPORTE (ADMIN GLOBAL)
# =======================
class AttendanceReportView(viewsets.ViewSet):
    """
    Admin:
      GET /api/attendance/report/?from=YYYY-MM-DD&to=YYYY-MM-DD
    """
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]

    def list(self, request):
        qs = AttendanceSession.objects.select_related("student").all()
        date_from = request.query_params.get("from")
        date_to = request.query_params.get("to")
        if date_from:
            qs = qs.filter(started_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(started_at__date__lte=date_to)

        sessions = [{
            "id": s.id,
            "student_id": s.student_id,
            "student__username": getattr(s.student, "username", None),
            "started_at": s.started_at,
            "ended_at": s.ended_at,
            "average_score": round((s.average_score or 0.0) * 100.0, 2),  # en 0..100
        } for s in qs.order_by("-started_at")]

        summary_qs = qs.values("student_id", "student__username").annotate(
            avg_attention=Avg("average_score"),  # 0..1 en DB
            sessions=Count("id")
        )
        summary = [{
            "student_id": r["student_id"],
            "student__username": r["student__username"],
            "avg_attention": round((r["avg_attention"] or 0.0) * 100.0, 2),  # 0..100
            "sessions": r["sessions"],
        } for r in summary_qs]

        return Response({"sessions": sessions, "summary": summary}, status=200)


# ============================
#  REPORTE (PROFESOR x CURSO)
# ============================
class ProfessorAttendanceReportView(APIView):
    """
    Profesor/Admin:
      GET /api/attendance/professor-report/?course=<course_id>

    Devuelve ARRAY plano (no paginado) con:
      - student_id
      - student_username
      - sessions
      - avg_attention (0..100)
      - last_started_at
      - last_ended_at
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        role = get_current_role(request.user)
        if role not in ("profesor", "admin") and not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("No autorizado")

        course_id = request.query_params.get("course")
        if not course_id:
            return Response([], status=200)

        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"detail": "Curso no existe"}, status=404)

        if role == "profesor" and not _course_belongs_to_prof(course, request.user):
            raise PermissionDenied("Curso no pertenece al profesor")

        # alumnos inscritos al curso
        student_ids = list(
            Enrollment.objects.filter(course_id=course.id).values_list("student_id", flat=True)
        )
        if not student_ids:
            return Response([], status=200)

        # sesiones con intento enlazado a actividades de este curso
        qs = (
            AttendanceSession.objects
            .select_related("student")
            .filter(
                student_id__in=student_ids,
                activity_attempts__activity__module__course_id=course.id
            )
        )

        agg = qs.values("student_id", "student__username").annotate(
            sessions=Count("id", distinct=True),
            avg_attention=Avg("average_score"),
            last_started_at=Max("started_at"),
            last_ended_at=Max("ended_at"),
        ).order_by("student__username")

        data = [{
            "student_id": r["student_id"],
            "student_username": r["student__username"] or f"#{r['student_id']}",
            "sessions": r["sessions"] or 0,
            "avg_attention": round((r["avg_attention"] or 0.0) * 100.0, 2),
            "last_started_at": r["last_started_at"],
            "last_ended_at": r["last_ended_at"],
        } for r in agg]

        return Response(data, status=200)
