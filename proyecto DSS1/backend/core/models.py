from django.conf import settings
from django.db import models, transaction
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Q

# =========================
#        USUARIO
# =========================
class User(AbstractUser):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('profesor', 'Profesor'),
        ('estudiante', 'Estudiante'),
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='estudiante')

    def __str__(self):
        return self.username


# =========================
#        CURSO
# =========================
class Course(models.Model):
    name  = models.CharField(max_length=120)
    code  = models.CharField(max_length=50)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='courses'
        # Si quisieras poder desasignar un profesor, habilita:
        # null=True, blank=True,
    )  # profesor

    # --- Aliases de compatibilidad ---
    @property
    def title(self):
        """Alias compatible con front que espera 'title'."""
        return self.name

    @property
    def professor(self):
        """Alias 'professor' → owner."""
        return self.owner

    @property
    def professor_id(self):
        """Alias 'professor_id' → owner_id."""
        return self.owner_id

    def __str__(self):
        return f'{self.code} - {self.name}'


# =========================
#      MATRÍCULA
# =========================
class Enrollment(models.Model):
    course  = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    # Para respuestas/orden y evitar errores en serializers:
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('course', 'student')
        ordering = ['-created_at']  # opcional; útil para "mis cursos"

    def __str__(self):
        return f'{self.student_id} @ {self.course_id}'


# =========================
#        MÓDULO
# =========================
class Module(models.Model):
    title  = models.CharField(max_length=120)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='modules')

    def __str__(self):
        return self.title


# =========================
#       ACTIVIDAD
# =========================
class Activity(models.Model):
    module      = models.ForeignKey('Module', on_delete=models.CASCADE, related_name='activities')
    title       = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    deadline    = models.DateTimeField()
    points      = models.IntegerField(default=100)

    # Tipo de publicación existente
    POST_TYPE = (('evaluacion', 'Evaluación'), ('tarea', 'Tarea'))
    post_type = models.CharField(max_length=12, choices=POST_TYPE, default='tarea')
    requires_monitoring = models.BooleanField(default=True)

    # ====== NUEVO: "Actividad Evaluation" (2 en 1) + numeración por módulo ======
    is_evaluatio  = models.BooleanField(default=False)                   # marca que es Actividad Evaluation
    evaluatio_seq = models.PositiveIntegerField(null=True, blank=True)   # N° por módulo (1,2,3...)

    # Parte de aprendizaje (material) y modo de evaluación
    LEARNING_TYPES = (('video','video'), ('pdf','pdf'), ('clase','clase'), ('otro','otro'))
    learning_type = models.CharField(max_length=20, choices=LEARNING_TYPES, default='video', blank=True)
    learning_url  = models.URLField(blank=True, default='')

    EXAM_MODE = (('quiz','quiz'), ('file','file'))
    exam_mode  = models.CharField(max_length=10, choices=EXAM_MODE, default='quiz', blank=True)

    class Meta:
        # La combinación (module, evaluatio_seq) debe ser única SOLO para actividades "evaluatio"
        constraints = [
            models.UniqueConstraint(
                fields=['module', 'evaluatio_seq'],
                condition=Q(is_evaluatio=True),
                name='uq_activity_module_evaluatioseq'
            )
        ]

    def clean(self):
        # Validación simple del correlativo
        if self.is_evaluatio and self.evaluatio_seq is not None and self.evaluatio_seq < 1:
            raise ValidationError("evaluatio_seq debe ser un entero >= 1.")

    def save(self, *args, **kwargs):
        """
        Autonumera evaluatio_seq por módulo y fija el título canónico:
        'Actividad Evaluation {N}' para actividades marcadas como evaluatio.
        """
        if self.is_evaluatio and self.module_id and self.evaluatio_seq is None:
            with transaction.atomic():
                last = (
                    Activity.objects.select_for_update()
                    .filter(module_id=self.module_id, is_evaluatio=True)
                    .order_by('-evaluatio_seq')
                    .values_list('evaluatio_seq', flat=True)
                    .first()
                )
                self.evaluatio_seq = (last or 0) + 1

            # Título canónico (se sobreescribe para mantener consistencia)
            self.title = f"Actividad Evaluation {self.evaluatio_seq}"

        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


# =========================
#       ENTREGA
# =========================
class Submission(models.Model):
    activity   = models.ForeignKey(Activity, on_delete=models.CASCADE, related_name='submissions')
    student    = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    file_url   = models.URLField()
    created_at = models.DateTimeField(auto_now_add=True)
    grade      = models.FloatField(null=True, blank=True)

    def __str__(self):
        return f'submission {self.id}'


# =========================
#     PARÁMETROS 70/30
# =========================
class Parameters(models.Model):
    """
    Parámetros globales de calificación.
    activity_weight: % de actividades
    attendance_weight: % de asistencia
    """
    activity_weight = models.PositiveIntegerField(default=70)
    attendance_weight = models.PositiveIntegerField(default=30)

    def save(self, *args, **kwargs):
        total = (self.activity_weight or 0) + (self.attendance_weight or 0)
        if total != 100:
            raise ValueError("La suma de activity_weight y attendance_weight debe ser 100")
        super().save(*args, **kwargs)

    @classmethod
    def get_singleton(cls):
        obj, _ = cls.objects.get_or_create(id=1, defaults={'activity_weight': 70, 'attendance_weight': 30})
        return obj

    def __str__(self):
        return f'Parameters {self.activity_weight}/{self.attendance_weight}'


# =========================
#  SESIÓN DE ASISTENCIA
# =========================
class AttendanceSession(models.Model):
    """
    Sesión de asistencia (para reportes del admin).
    average_score: 0..1 (el front lo muestra en %).
    """
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='core_attendance_sessions'
    )
    started_at = models.DateTimeField(default=timezone.now)
    ended_at   = models.DateTimeField(null=True, blank=True)
    average_score = models.FloatField(default=0.0)

    class Meta:
        indexes = [
            models.Index(fields=['started_at']),
            models.Index(fields=['student']),
        ]
        ordering = ['-started_at']

    @property
    def attention_percent(self):
        """Porcentaje 0..100 basado en average_score 0..1."""
        try:
            return round(float(self.average_score) * 100, 2)
        except Exception:
            return 0.0

    def __str__(self):
        return f'AttendanceSession #{self.id} - {self.student} ({self.started_at:%Y-%m-%d %H:%M})'

    
class ActivityAttempt(models.Model):
    activity  = models.ForeignKey('core.Activity', on_delete=models.CASCADE, related_name='attempts')
    student   = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='activity_attempts')

    started_at = models.DateTimeField(default=timezone.now)
    ended_at   = models.DateTimeField(null=True, blank=True)

    # enlazamos al monitoreo (AttendanceSession) si aplica
    monitoring = models.ForeignKey('core.AttendanceSession', null=True, blank=True,
                                   on_delete=models.SET_NULL, related_name='activity_attempts')
    monitoring_score  = models.FloatField(default=0.0)            # 0..100
    evaluation_grade  = models.FloatField(null=True, blank=True)  # 0..100
    submission        = models.ForeignKey('core.Submission', null=True, blank=True,
                                          on_delete=models.SET_NULL, related_name='attempts')

    final_grade = models.FloatField(null=True, blank=True)

    class Meta:
        indexes = [models.Index(fields=['activity', 'student'])]
        ordering = ['-started_at']

    def __str__(self):
        return f'Attempt a{self.activity_id}-u{self.student_id} ({self.started_at:%Y-%m-%d %H:%M})'

class Evaluation(models.Model):
    activity = models.OneToOneField('core.Activity', on_delete=models.CASCADE, related_name='evaluation')
    title = models.CharField(max_length=160, default='Evaluación')
    created_at = models.DateTimeField(auto_now_add=True)

class Question(models.Model):
    TYPE_CHOICES = (('single','single'), ('multiple','multiple'), ('open','open'))
    evaluation = models.ForeignKey('core.Evaluation', on_delete=models.CASCADE, related_name='questions')
    type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='single')
    text = models.TextField()
    points = models.PositiveIntegerField(default=1)

class Choice(models.Model):
    question = models.ForeignKey('core.Question', on_delete=models.CASCADE, related_name='choices')
    text = models.CharField(max_length=300)
    is_correct = models.BooleanField(default=False)