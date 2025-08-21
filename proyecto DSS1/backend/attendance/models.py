from django.conf import settings
from django.db import models

class AttendanceSession(models.Model):
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='attendance_sessions'
    )
    started_at    = models.DateTimeField(auto_now_add=True)
    ended_at      = models.DateTimeField(null=True, blank=True)
    # Guardamos SIEMPRE la nota final en escala 0..20
    average_score = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        return f"Session {self.id} - {getattr(self.student, 'username', self.student_id)}"


class AttentionSample(models.Model):
    session = models.ForeignKey(
        AttendanceSession, on_delete=models.CASCADE, related_name='samples'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    # AHORA opcionales (el front puede no enviarlos)
    ear  = models.FloatField(null=True, blank=True)
    mar  = models.FloatField(null=True, blank=True)
    yaw  = models.FloatField(null=True, blank=True)

    # score 0..100 por muestra (como envía el front)
    score = models.FloatField()

    # Para registrar ausencias/tab oculta
    absent = models.BooleanField(default=False)
    reason = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        ordering = ['-created_at']


class SystemConfig(models.Model):
    pct_activity  = models.PositiveIntegerField(default=70)
    pct_attention = models.PositiveIntegerField(default=30)

    def clean(self):
        total = (self.pct_activity or 0) + (self.pct_attention or 0)
        if total != 100:
            from django.core.exceptions import ValidationError
            raise ValidationError("La suma de porcentajes debe ser 100.")

    def __str__(self):
        return f"Config {self.pct_activity}% actividad / {self.pct_attention}% atención"
