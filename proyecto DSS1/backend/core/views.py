from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from rest_framework import generics, viewsets, permissions, status, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated as DRFIsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.viewsets import ModelViewSet


from .models import (
    Course, Module, Activity, Submission, Enrollment,
    AttendanceSession, ActivityAttempt, Parameters, Evaluation
)
from .serializers import (
    RegisterSerializer, UserSerializer, UserAdminSerializer,
    CourseSerializer, ModuleSerializer, ActivitySerializer,
    SubmissionSerializer, EnrollmentSerializer,
    CourseAdminSerializer, CourseReadSerializer, ActivityAttemptSerializer,
    EvaluationSerializer, EvaluationReadSerializer, AdminUserSerializer
)
from .utils import recompute_final_grade_for, percent

User = get_user_model()
VALID_ROLES = {"admin", "profesor", "estudiante"}


def get_current_role(user):
    g = set(user.groups.values_list("name", flat=True)) & VALID_ROLES
    return next(iter(g)) if g else ""


def is_role_admin(user) -> bool:
    if not (user and user.is_authenticated):
        return False
    if getattr(user, "role", "") == "admin":
        return True
    if user.is_superuser or user.is_staff:
        return True
    try:
        return user.groups.filter(name__in=["admin"]).exists()
    except Exception:
        return False


def _is_owner_or_admin(user, course: Course) -> bool:
    return bool(user.is_authenticated and (is_role_admin(user) or course.owner_id == user.id))


class FallbackIsRoleAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and is_role_admin(request.user))


# Usa tu IsRoleAdmin si existe; si no, el fallback
try:
    from .permissions import IsRoleAdmin  # type: ignore
except Exception:
    IsRoleAdmin = FallbackIsRoleAdmin


# ---------- AUTH ----------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(APIView):
    """
    Login por correo (o username) + contraseña -> SimpleJWT (access/refresh),
    y devuelve además 'role' y 'user'.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""

        if email and not username:
            try:
                u = User.objects.get(email__iexact=email)
                username = u.username
            except User.DoesNotExist:
                return Response({"detail": "Credenciales inválidas."}, status=400)

        if not username or not password:
            return Response({"detail": "Correo y contraseña son obligatorios."}, status=400)

        # usamos el serializer de SimpleJWT directamente
        ser = TokenObtainPairSerializer(data={"username": username, "password": password})
        if not ser.is_valid():
            return Response({"detail": "Credenciales inválidas."}, status=400)

        tokens = ser.validated_data  # {"refresh": "...", "access": "..."}
        try:
            user = User.objects.get(username=username)
            payload = {
                **tokens,
                "role": get_current_role(user),
                "user": UserSerializer(user).data,
            }
        except Exception:
            payload = {**tokens, "role": "", "user": None}

        return Response(payload, status=200)


class HomeView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"ok": True, "service": "core"})


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserView(MeView):
    pass


# ---------- USERS (ADMIN) ----------
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    permission_classes = [permissions.IsAdminUser]

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return UserSerializer
        return UserAdminSerializer


class AdminUserListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]
    serializer_class = UserAdminSerializer

    def get_queryset(self):
        return User.objects.all().order_by("id")

    def create(self, request, *args, **kwargs):
        ser = self.get_serializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(UserSerializer(user).data, status=201)


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]
    serializer_class = UserAdminSerializer
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return User.objects.all()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        ser = self.get_serializer(instance, data=request.data, partial=True, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = ser.save()
        return Response(UserSerializer(user).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


# ---------- COURSES ----------
class CourseViewSet(viewsets.ModelViewSet):
    """
    CRUD de cursos (list/retrieve: autenticado; create/update/delete: admin)
    Soporta filtro ?mine=1 para listar cursos del owner autenticado.
    """
    queryset = Course.objects.select_related("owner").all().order_by("id")
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        mine = self.request.query_params.get("mine")
        if mine in ("1", "true", "True", "yes"):
            if self.request.user.is_authenticated:
                qs = qs.filter(owner=self.request.user)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # lectura con serializer enriquecido
    def retrieve(self, request, *args, **kwargs):
        inst = self.get_object()
        ser = CourseReadSerializer(inst)
        return Response(ser.data)

    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        ser_cls = CourseReadSerializer
        if page is not None:
            return self.get_paginated_response(ser_cls(page, many=True).data)
        return Response(ser_cls(qs, many=True).data)

    @action(detail=True, methods=["post"], permission_classes=[DRFIsAuthenticated])
    def add_module(self, request, pk=None):
        """
        Docente (dueño) o admin crea un módulo en el curso.
        Body: { "name": "Unidad 1" }
        """
        course = self.get_object()
        if not _is_owner_or_admin(request.user, course):
            raise PermissionDenied("No puedes crear módulos en un curso que no es tuyo.")

        name = (request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "Falta 'name'."}, status=400)

        m = Module.objects.create(course=course, title=name)
        return Response({"id": m.id, "title": m.title}, status=status.HTTP_201_CREATED)


class ModuleViewSet(viewsets.ModelViewSet):
    queryset = Module.objects.select_related("course").all().order_by("id")
    serializer_class = ModuleSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


# ========= Activities =========
class ActivityViewSet(viewsets.ModelViewSet):
    queryset = Activity.objects.select_related("module", "module__course").all().order_by("id")
    serializer_class = ActivitySerializer
    permission_classes = [DRFIsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtros útiles: ?module=<id>, ?mine=1 (actividades de cursos del profesor autenticado)
        mod = self.request.query_params.get("module")
        if mod:
            try:
                qs = qs.filter(module_id=int(mod))
            except Exception:
                qs = qs.none()
        mine = self.request.query_params.get("mine")
        if mine in ("1", "true", "True", "yes"):
            u = self.request.user
            if u.is_authenticated:
                qs = qs.filter(module__course__owner=u)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        # Deja que el serializer/Model manejen 'is_evaluatio', 'evaluatio_seq', etc.
        return super().perform_create(serializer)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def start(self, request, pk=None):
        """
        Crea (o reutiliza) un intento (ActivityAttempt) y, si la actividad requiere monitoreo,
        abre una AttendanceSession.
        """
        user = request.user
        activity = self.get_object()

        # Evita duplicar intentos abiertos
        attempt = ActivityAttempt.objects.filter(
            activity=activity, student=user, ended_at__isnull=True
        ).order_by('-started_at').first()

        if attempt:
            att_sess = attempt.monitoring
        else:
            att_sess = None
            if getattr(activity, 'requires_monitoring', False):
                att_sess = AttendanceSession.objects.create(student=user, started_at=timezone.now())
            attempt = ActivityAttempt.objects.create(
                activity=activity,
                student=user,
                monitoring=att_sess,
                started_at=timezone.now(),
            )

        data = {
            'id': attempt.id,
            'activity': activity.id,
            'started_at': attempt.started_at,
            'monitoring_id': att_sess.id if att_sess else None,
        }
        return Response(data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def finish(self, request, pk=None):
        """
        Finaliza el intento activo.
        - Cierra AttendanceSession (si existe) y acepta 'average_score' (0..1) desde el front.
        - Recalcula nota final 70/30.
        """
        user = request.user
        activity = self.get_object()
        attempt_id = request.data.get('attempt_id')

        if attempt_id:
            try:
                attempt = ActivityAttempt.objects.select_related('monitoring').get(
                    id=attempt_id, student=user, activity=activity
                )
            except ActivityAttempt.DoesNotExist:
                return Response({'detail': 'attempt_id inválido'}, status=400)
        else:
            attempt = ActivityAttempt.objects.filter(
                student=user, activity=activity, ended_at__isnull=True
            ).order_by('-started_at').first()
            if not attempt:
                return Response({'detail': 'No hay intento activo.'}, status=400)

        attempt.ended_at = timezone.now()

        # Cerrar sesión de asistencia
        sess = attempt.monitoring
        avg_client = request.data.get('average_score', None)  # 0..1
        if sess:
            if avg_client is not None:
                try:
                    sess.average_score = float(avg_client)
                except Exception:
                    pass
            sess.ended_at = timezone.now()
            sess.save(update_fields=['average_score', 'ended_at'])
            attempt.monitoring_score = round((sess.average_score or 0.0) * 100.0, 2)

        attempt.save(update_fields=['ended_at', 'monitoring_score'])

        # Recalcula final (usa util para respetar Parameters o settings 70/30)
        recompute_final_grade_for(user.id, activity.id)

        attempt.refresh_from_db()
        data = {
            'id': attempt.id,
            'monitoring_score': attempt.monitoring_score or 0.0,
            'evaluation_grade': attempt.evaluation_grade or 0.0,
            'final_grade': attempt.final_grade,
        }
        return Response(data, status=200)

    @action(detail=True, methods=['get'])
    def evaluation(self, request, pk=None):
        """
        Devuelve la evaluación (plantilla) de esta actividad con preguntas+opciones.
        """
        try:
            ev = Evaluation.objects.get(activity_id=pk)
        except Evaluation.DoesNotExist:
            return Response({'detail': 'Sin evaluación para esta actividad.'}, status=404)
        return Response(EvaluationReadSerializer(ev).data)

    @action(detail=True, methods=['post'], url_path='submit-quiz')
    @transaction.atomic
    def submit_quiz(self, request, pk=None):
        """
        Recibe respuestas del quiz y guarda evaluation_grade (0..100) en el Attempt.
        Body:
        {
          "attempt_id": <id>,
          "answers": [
            {"question": <id>, "choices": [<choiceId>, ...]},  # single/multiple
            {"question": <id>, "text": "..." }                  # open (puntúa 0 por defecto)
          ]
        }
        """
        user = request.user
        try:
            ev = Evaluation.objects.get(activity_id=pk)
        except Evaluation.DoesNotExist:
            return Response({'detail': 'Sin evaluación asociada.'}, status=404)

        answers = request.data.get('answers', [])
        if not isinstance(answers, list) or not answers:
            return Response({'detail': 'answers vacío.'}, status=400)

        # attempt
        attempt_id = request.data.get('attempt_id')
        if attempt_id:
            try:
                attempt = ActivityAttempt.objects.get(id=attempt_id, student=user, activity_id=pk)
            except ActivityAttempt.DoesNotExist:
                return Response({'detail': 'attempt_id inválido'}, status=400)
        else:
            attempt = ActivityAttempt.objects.filter(student=user, activity_id=pk).order_by('-started_at').first()
            if not attempt:
                return Response({'detail': 'No hay intento para registrar nota.'}, status=400)

        # calificación
        qmap = {q.id: q for q in ev.questions.all()}
        total_points = 0
        got_points = 0

        for q in qmap.values():
            total_points += int(getattr(q, 'points', 1) or 1)

        for a in answers:
            qid = a.get('question')
            q = qmap.get(int(qid)) if qid is not None else None
            if not q:
                continue

            if q.type in ('single', 'multiple'):
                sent = set(int(x) for x in (a.get('choices') or []))
                correct = set(q.choices.filter(is_correct=True).values_list('id', flat=True))
                if sent == correct and len(correct) > 0:
                    got_points += int(getattr(q, 'points', 1) or 1)
            else:
                # open: por defecto 0 (si luego agregas rúbrica, evalúas aquí)
                pass

        grade_pct = percent(got_points, total_points)
        attempt.evaluation_grade = round(grade_pct, 2)
        attempt.save(update_fields=['evaluation_grade'])

        # 70/30
        recompute_final_grade_for(user.id, int(pk))
        attempt.refresh_from_db()

        return Response({
            'points_earned': got_points,
            'points_total': total_points,
            'grade_percent': attempt.evaluation_grade,
            'final_grade': attempt.final_grade,
        }, status=200)


class SubmissionViewSet(viewsets.ModelViewSet):
    queryset = Submission.objects.select_related('activity', 'student').all().order_by('-created_at')
    serializer_class = SubmissionSerializer
    permission_classes = [DRFIsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        qs = super().get_queryset()
        act = self.request.query_params.get('activity')
        if act:
            try:
                qs = qs.filter(activity_id=int(act))
            except Exception:
                qs = qs.none()
        mine = self.request.query_params.get('mine')
        if mine in ('1', 'true', 'True', 'yes'):
            qs = qs.filter(student=self.request.user)
        return qs

    def perform_create(self, serializer):
        serializer.save(student=self.request.user)

    def _touch_latest_attempt(self, sub: Submission):
        """
        Actualiza el último intento del mismo estudiante/actividad con la nota de evaluación
        y recalcula final_grade (70/30).
        """
        attempt = (
            ActivityAttempt.objects
            .filter(activity=sub.activity, student=sub.student)
            .order_by('-started_at')
            .first()
        )
        if attempt:
            attempt.evaluation_grade = sub.grade
            attempt.submission = sub
            attempt.save(update_fields=['evaluation_grade', 'submission'])
            # Recalcula usando util (respeta Parameters/70-30)
            recompute_final_grade_for(sub.student_id, sub.activity_id)

    def update(self, request, *args, **kwargs):
        resp = super().update(request, *args, **kwargs)
        try:
            instance = self.get_object()
        except Exception:
            return resp
        self._touch_latest_attempt(instance)
        return resp

    def partial_update(self, request, *args, **kwargs):
        resp = super().partial_update(request, *args, **kwargs)
        try:
            instance = self.get_object()
        except Exception:
            return resp
        self._touch_latest_attempt(instance)
        return resp


# ---------- ENROLLMENTS ----------
class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        course_id = request.data.get("course")
        if course_id in (None, "", "null"):
            return Response({"course": ["This field is required."]}, status=400)
        try:
            course_id = int(course_id)
        except Exception:
            return Response({"course": ["Invalid id."]}, status=400)

        course = get_object_or_404(Course, pk=course_id)
        obj, created = Enrollment.objects.get_or_create(course=course, student=request.user)

        ca = getattr(obj, "created_at", None)
        data = {
            "id": obj.id,
            "course": obj.course_id,
            "student": obj.student_id,
            "created_at": ca.isoformat() if hasattr(ca, "isoformat") else None,
            "created": created,
        }
        return Response(data, status=201 if created else 200)

    @action(detail=False, methods=["get"], url_path="mine")
    def mine(self, request, *args, **kwargs):
        qs = Enrollment.objects.filter(student=request.user).select_related("course")
        page = self.paginate_queryset(qs)
        if page is not None:
            ser = self.get_serializer(page, many=True)
            return self.get_paginated_response(ser.data)
        ser = self.get_serializer(qs, many=True)
        return Response(ser.data, status=status.HTTP_200_OK)


# ---------- Admin: Courses avanzado ----------
class AdminCourseViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]
    queryset = Course.objects.all().order_by("id")
    serializer_class = CourseSerializer  # por defecto para create/update

    def get_serializer_class(self):
        if self.action in ("list", "retrieve"):
            return CourseAdminSerializer
        return super().get_serializer_class()

    def create(self, request, *args, **kwargs):
        payload = request.data.copy()
        if "title" in payload and "name" not in payload:
            payload["name"] = payload["title"]
        ser = self.get_serializer(data=payload)
        ser.is_valid(raise_exception=True)
        course = ser.save(owner=request.user)
        return Response(CourseAdminSerializer(course).data, status=201)

    def update(self, request, *args, **kwargs):
        payload = request.data.copy()
        if "title" in payload and "name" not in payload:
            payload["name"] = payload["title"]
        return super().update(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def add_module(self, request, pk=None):
        course = self.get_object()
        name = (request.data.get("name") or "").strip()
        if not name:
            return Response({"detail": "Falta 'name'."}, status=400)
        module = Module.objects.create(course=course, title=name)
        return Response({"id": module.id, "title": module.title}, status=201)

    @action(detail=True, methods=["delete"], url_path=r"modules/(?P<mid>\d+)")
    def delete_module(self, request, pk=None, mid=None):
        course = self.get_object()
        try:
            Module.objects.get(id=mid, course=course).delete()
            return Response(status=204)
        except Module.DoesNotExist:
            return Response({"detail": "No existe"}, status=404)

    @action(detail=True, methods=["post"])
    def assign_professor(self, request, pk=None):
        course = self.get_object()
        uid = request.data.get("user_id") or request.data.get("professor_id")
        if uid in (None, "", "null"):
            course.owner = None
            course.save(update_fields=["owner"])
            return Response({"ok": True})
        prof = get_object_or_404(User, id=uid)
        if not (prof.groups.filter(name="profesor").exists() or getattr(prof, "role", "") == "profesor"):
            return Response({"detail": "El usuario no es profesor."}, status=400)
        course.owner = prof
        course.save(update_fields=["owner"])
        return Response({"ok": True})

    @action(detail=False, methods=["get"])
    def professors(self, request):
        qs = User.objects.filter(Q(groups__name="profesor") | Q(role="profesor")).order_by("username").distinct()
        return Response([{"id": u.id, "username": u.username, "email": u.email} for u in qs])


# ---------- Parámetros globales (70/30) ----------
try:
    from .models import Parameters  # si existe
    from .serializers import ParametersSerializer as _ParamsSerializer
except Exception:
    Parameters = None
    _ParamsSerializer = None


class AdminParametersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsRoleAdmin]

    def get(self, request):
        if not (Parameters and _ParamsSerializer):
            return Response({"detail": "Parameters no está habilitado."}, status=404)
        p = Parameters.get_singleton()
        return Response(_ParamsSerializer(p).data)

    def put(self, request):
        if not (Parameters and _ParamsSerializer):
            return Response({"detail": "Parameters no está habilitado."}, status=404)
        p = Parameters.get_singleton()
        ser = _ParamsSerializer(p, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(ser.data)


def _weights():
    aw = getattr(settings, 'PCT_ACTIVITY', 70)
    tw = getattr(settings, 'PCT_ATTENTION', 30)
    try:
        p = Parameters.get_singleton()
        aw, tw = p.activity_weight, p.attendance_weight
    except Exception:
        pass
    return aw, tw


def _compute_final(evaluation_grade: float, monitoring_score: float) -> float:
    aw, tw = _weights()
    ev = float(evaluation_grade or 0.0)    # 0..100
    mo = float(monitoring_score or 0.0)    # 0..100
    return round(ev * aw/100.0 + mo * tw/100.0, 2)


class EvaluationViewSet(viewsets.ModelViewSet):
    queryset = Evaluation.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        # Para lecturas devolvemos la plantilla con preguntas/opciones embebidas
        if self.action in ("list", "retrieve"):
            return EvaluationReadSerializer
        return EvaluationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        activity = self.request.query_params.get('activity')
        return qs.filter(activity=activity) if activity else qs
class AdminUserViewSet(ModelViewSet):
    permission_classes = [IsAdminUser]
    serializer_class = AdminUserSerializer
    queryset = User.objects.all().order_by('id')