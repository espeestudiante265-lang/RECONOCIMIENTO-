from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.models import Group
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.text import slugify
from rest_framework import serializers
from django.core.files.storage import default_storage
from django.utils import timezone
from .utils import recompute_final_grade_for

from .models import Course, Module, Activity, Submission, Enrollment, AttendanceSession, ActivityAttempt, Evaluation, Question, Choice 
    

User = get_user_model()
VALID_ROLES = {"admin", "profesor", "estudiante"}


def get_current_role(user):
    g = set(user.groups.values_list("name", flat=True)) & VALID_ROLES
    if g:
        return next(iter(g))
    return getattr(user, "role", "") or ""


# ---------- Auth ----------
class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name  = serializers.CharField(max_length=150)
    password   = serializers.CharField(write_only=True, min_length=8)
    password2  = serializers.CharField(write_only=True, min_length=8)
    role       = serializers.ChoiceField(choices=list(VALID_ROLES), default="estudiante")

    def validate_email(self, v):
        # unicidad a nivel app (no requiere migración)
        if User.objects.filter(email__iexact=v).exists():
            raise serializers.ValidationError("Ya existe un usuario con este correo.")
        return v

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        # fuerza de contraseña (usa AUTH_PASSWORD_VALIDATORS)
        try:
            validate_password(data["password"])
        except dj_exc.ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return data

    def create(self, validated):
        email      = validated["email"].strip().lower()
        first_name = validated["first_name"].strip()
        last_name  = validated["last_name"].strip()
        role       = validated.get("role", "estudiante")

        # username auto a partir de nombres o del correo (sin migraciones)
        base = slugify(f"{first_name}.{last_name}") or email.split("@")[0]
        base = base.replace("-", "_") or "user"
        username = base
        i = 2
        while User.objects.filter(username=username).exists():
            username = f"{base}{i}"
            i += 1

        user = User.objects.create_user(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            password=validated["password"],
            is_staff=(role == "admin"),
        )

        # agrega al Group correspondiente y sincroniza posible user.role
        if role in VALID_ROLES:
            g, _ = Group.objects.get_or_create(name=role)
            user.groups.add(g)
            updates = []
            if hasattr(user, "role"):
                user.role = role
                updates.append("role")
            if user.is_staff != (role == "admin"):
                user.is_staff = (role == "admin")
                updates.append("is_staff")
            if updates:
                user.save(update_fields=updates)

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        raise serializers.ValidationError("Credenciales incorrectas")


class UserSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "role")

    def get_role(self, obj):
        return get_current_role(obj)


# ---------- Admin (CRUD usuarios) ----------
class UserAdminSerializer(serializers.ModelSerializer):
    role = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "password")
        read_only_fields = ("id", "username")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["role"] = get_current_role(instance)
        data["password"] = ""
        return data

    def _apply_role(self, user, role, *, actor_is_superuser=False):
        if role in (None, ""):
            return
        if role not in VALID_ROLES:
            raise serializers.ValidationError({"role": "Rol inválido."})
        if role == "admin" and not actor_is_superuser:
            raise serializers.ValidationError({"role": "Solo el superusuario puede asignar rol admin."})

        for r in VALID_ROLES:
            g, _ = Group.objects.get_or_create(name=r)
            user.groups.remove(g)

        g = Group.objects.get(name=role)
        user.groups.add(g)

        updates = []
        if hasattr(user, "role"):
            user.role = role
            updates.append("role")
        desired_staff = (role == "admin")
        if user.is_staff != desired_staff:
            user.is_staff = desired_staff
            updates.append("is_staff")
        if updates:
            user.save(update_fields=updates)

    def create(self, validated_data):
        req = self.context.get("request")
        actor_is_superuser = bool(req and req.user.is_superuser)
        role = validated_data.pop("role", None) or "estudiante"
        password = validated_data.pop("password", None)

        user = User(**validated_data)
        user.set_password(password or User.objects.make_random_password())
        user.save()

        self._apply_role(user, role, actor_is_superuser=actor_is_superuser)
        return user

    def update(self, instance, validated_data):
        req = self.context.get("request")
        actor_is_superuser = bool(req and req.user.is_superuser)
        target_role = get_current_role(instance)

        role = validated_data.pop("role", None)
        password = validated_data.pop("password", None)

        if (instance.is_superuser or target_role == "admin") and not actor_is_superuser:
            if role is not None:
                raise serializers.ValidationError("No puedes cambiar el rol de este usuario.")
            validated_data = {}

        for k, v in validated_data.items():
            setattr(instance, k, v)

        if password:
            instance.set_password(password)

        instance.save()

        if role is not None:
            self._apply_role(instance, role, actor_is_superuser=actor_is_superuser)

        return instance


# ---------- Cursos / Módulos / Actividades / Entregas / Matrículas ----------
class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ("id", "name", "code", "owner")
        read_only_fields = ("owner",)


class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "title", "course")



class ActivitySerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Activity
        fields = (
            "id",
            "module",
            "title",
            "description",
            "deadline",
            "points",
            "post_type",
            "requires_monitoring",

            # === Nuevos campos para Actividad Evaluation ===
            "is_evaluatio",
            "evaluatio_seq",
            "learning_type",
            "learning_url",
            "exam_mode",

            # Campo calculado
            "display_name",
        )
    # evaluatio_seq la llena el modelo en save()
        read_only_fields = ("evaluatio_seq",)

    def get_display_name(self, obj):
        if obj.is_evaluatio and obj.evaluatio_seq:
            return f"Actividad Evaluation {obj.evaluatio_seq}"
        return obj.title

    def create(self, validated_data):
        instance = super().create(validated_data)
        # Si es evaluatio, el modelo ya generó evaluatio_seq y título canónico
        return instance
        
class SubmissionSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source='student.username', read_only=True)
    max_points       = serializers.IntegerField(source='activity.points', read_only=True)

    # Permitir archivo además de URL (sin tocar el modelo)
    file = serializers.FileField(write_only=True, required=False, allow_null=True)

    class Meta:
        model  = Submission
        fields = ('id', 'activity', 'student', 'student_username',
                  'file_url', 'created_at', 'grade', 'max_points', 'file')
        read_only_fields = ('student', 'created_at')
        # 🔑 clave: file_url NO requerido a nivel serializer
        extra_kwargs = {
            'file_url': {'required': False, 'allow_blank': True},
        }

    def validate(self, attrs):
        """
        En CREATE: debe venir link (file_url) o archivo (file).
        En UPDATE/PATCH: no exigimos eso (permite cambiar solo 'grade').
        """
        if self.instance is None:
            has_url  = bool((attrs.get('file_url') or '').strip())
            has_file = bool(attrs.get('file'))
            if not (has_url or has_file):
                raise serializers.ValidationError({'file_url': ['Proporciona un link o sube un archivo.']})
        return attrs


    def validate_file_url(self, v: str):
        v = (v or '').strip()
        if not v:
            return v
        if not v.lower().startswith(('http://', 'https://')):
            v = 'https://' + v
        return v

    def create(self, validated_data):
        """
        Si llega archivo, guardamos en MEDIA y rellenamos file_url con su URL.
        """
        upload = validated_data.pop('file', None)
        if upload is not None:
            user_id = self.context['request'].user.id
            ts = timezone.now().strftime('%Y%m%d%H%M%S')
            path = default_storage.save(f"submissions/{user_id}/{ts}_{upload.name}", upload)
            try:
                url = default_storage.url(path)
            except Exception:
                url = path
            validated_data['file_url'] = url
        return super().create(validated_data)


class EnrollmentSerializer(serializers.ModelSerializer):
    # Si el modelo NO tiene created_at, lo calculamos/graceful None
    created_at = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = ("id", "course", "student", "created_at")
        read_only_fields = ("student",)

    def get_created_at(self, obj):
        dt = getattr(obj, "created_at", None)
        try:
            return dt.isoformat() if dt else None
        except Exception:
            return None

    def create(self, validated_data):
        """
        Permite:
        - Profesor/Admin: usar 'student' del body aunque sea read_only.
        - Estudiante: auto-matrícula (student = request.user).
        """
        request = self.context.get('request')
        actor = getattr(request, "user", None)

        # intenta leer el student enviado (aunque sea read_only en Meta)
        raw_student = (self.initial_data or {}).get("student", None)
        student_id = int(raw_student) if str(raw_student).isdigit() else None

        def _is_admin_or_prof(u):
            if not u or not u.is_authenticated:
                return False
            if u.is_superuser or u.is_staff:
                return True
            role = getattr(u, "role", "") or ""
            if role in ("admin", "profesor"):
                return True
            try:
                return u.groups.filter(name__in=["admin", "profesor"]).exists()
            except Exception:
                return False

        if _is_admin_or_prof(actor):
            if student_id:
                validated_data["student_id"] = student_id
            else:
                raise serializers.ValidationError({"student": "Falta 'student' (id) para matricular."})
        else:
            if actor and actor.is_authenticated:
                validated_data["student"] = actor
            else:
                raise serializers.ValidationError("Autenticación requerida.")

        # deduplicación
        course_obj = validated_data.get("course")
        course_id = course_obj.id if hasattr(course_obj, "id") else course_obj
        sid = validated_data.get("student_id") or (validated_data.get("student").id if validated_data.get("student") else None)

        if course_id and sid and Enrollment.objects.filter(course_id=course_id, student_id=sid).exists():
            raise serializers.ValidationError({"detail": "El estudiante ya está matriculado en este curso."})

        return super().create(validated_data)


# ---------- Serializers “lite / admin / lectura” de cursos ----------
class ModuleLiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = ("id", "title", "course")


class CourseWriteSerializer(serializers.ModelSerializer):
    """Para crear/editar cursos; el owner se setea en la vista con request.user."""
    class Meta:
        model = Course
        fields = ("id", "name", "code", "owner")
        read_only_fields = ("owner",)


class CourseReadSerializer(serializers.ModelSerializer):
    """Para listar cursos con módulos livianos y datos del owner."""
    modules = ModuleLiteSerializer(many=True, read_only=True)
    professor_id = serializers.IntegerField(source="owner_id", read_only=True)
    professor_username = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = ("id", "code", "name", "professor_id", "professor_username", "modules")

    def get_professor_username(self, obj):
        return obj.owner.username if obj.owner_id else None


class CourseAdminSerializer(serializers.ModelSerializer):
    """Vista admin con módulos livianos y datos del profesor."""
    modules = ModuleLiteSerializer(many=True, read_only=True)
    professor_username = serializers.SerializerMethodField()
    professor_id = serializers.IntegerField(source="owner_id", read_only=True)

    class Meta:
        model = Course
        fields = ("id", "code", "name", "professor_id", "professor_username", "modules")

    def get_professor_username(self, obj):
        return obj.owner.username if obj.owner_id else None


# 70/30 – parámetros globales (si el modelo existe)
try:
    from . import models as _models  # import local
    class ParametersSerializer(serializers.ModelSerializer):
        class Meta:
            model = _models.Parameters
            fields = ("activity_weight", "attendance_weight")
except Exception:
    ParametersSerializer = None

class ActivityAttemptSerializer(serializers.ModelSerializer):
    student_username = serializers.CharField(source='student.username', read_only=True)
    activity_title   = serializers.CharField(source='activity.title', read_only=True)

    class Meta:
        model  = ActivityAttempt
        fields = (
            "id",
            "activity",
            "activity_title",
            "student",
            "student_username",
            "started_at",
            "ended_at",
            "monitoring",
            "monitoring_score",   # 0..100
            "evaluation_grade",   # 0..100
            "submission",
            "final_grade",        # 0..100 (70/30 aplicado)
        )
        read_only_fields = ("student", "started_at", "final_grade", "monitoring")

class AttendanceSessionSerializer(serializers.ModelSerializer):
    attention_percent = serializers.FloatField(read_only=True)

    class Meta:
        model = AttendanceSession
        fields = ("id", "student", "started_at", "ended_at", "average_score", "attention_percent")
        read_only_fields = ("attention_percent",)

class ChoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id','text','is_correct')

class QuestionSerializer(serializers.ModelSerializer):
    # aceptar 'choices' tal cual
    choices = ChoiceSerializer(many=True, required=False)

    class Meta:
        model = Question
        fields = ('id','type','text','points','choices')

class EvaluationSerializer(serializers.ModelSerializer):
    # el front manda questions:[{..., choices:[...]}]
    questions = QuestionSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Evaluation
        fields = ('id','activity','title','questions','created_at')
        read_only_fields = ('created_at',)

    def create(self, validated):
        # Evita IntegrityError por OneToOne con un 400 claro
        activity = validated.get('activity')
        if activity and Evaluation.objects.filter(activity=activity).exists():
            raise serializers.ValidationError({'activity': 'Ya existe una evaluación para esta actividad.'})

        qs = validated.pop('questions', [])
        ev = Evaluation.objects.create(**validated)

        for qd in qs:
            # Acepta 'choices' o 'options' como alias
            choices = qd.pop('choices', qd.pop('options', []))
            q = Question.objects.create(evaluation=ev, **qd)
            for cd in choices:
                Choice.objects.create(question=q, **cd)
        return ev

class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "full_name")

    def get_full_name(self, obj):
        fn = (f"{obj.first_name or ''} {obj.last_name or ''}").strip()
        return fn or obj.username or obj.email or f"#{obj.id}"

class UserBasicSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "first_name", "last_name", "email", "full_name")

    def get_full_name(self, obj):
        fn = (f"{obj.first_name or ''} {obj.last_name or ''}").strip()
        return fn or obj.username or obj.email or f"#{obj.id}"
# ==== NUEVO: serializers "read" para que el estudiante reciba preguntas/choices ====
class ChoiceReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Choice
        fields = ('id', 'text', 'is_correct')  # is_correct se puede omitir en front si no quieres mostrarlo

class QuestionReadSerializer(serializers.ModelSerializer):
    choices = ChoiceReadSerializer(many=True, read_only=True)
    class Meta:
        model = Question
        fields = ('id', 'type', 'text', 'points', 'choices')

class EvaluationReadSerializer(serializers.ModelSerializer):
    questions = QuestionReadSerializer(many=True, read_only=True)
    class Meta:
        model = Evaluation
        fields = ('id', 'activity', 'title', 'created_at', 'questions')

class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    last_login  = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)

    class Meta:
        model  = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email',
            'role', 'is_active', 'last_login', 'date_joined', 'password'
        ]
        extra_kwargs = {
            'email': {'required': False, 'allow_blank': True},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
        }

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance