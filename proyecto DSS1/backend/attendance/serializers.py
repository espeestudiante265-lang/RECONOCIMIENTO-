from rest_framework import serializers
from .models import AttendanceSession, AttentionSample, SystemConfig

# ---------- Sesiones (lectura) ----------
class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = ('id','student','started_at','ended_at','average_score')
        read_only_fields = ('student','started_at','ended_at')

# ---------- Muestras (lectura) ----------
# Incluye absent/reason
class AttentionSampleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttentionSample
        fields = ('id','session','created_at','ear','mar','yaw','score','absent','reason')
        read_only_fields = ('created_at',)

# ---------- Muestras (creación SIN session) ----------
# Para /api/attendance/sample/ (la vista asigna la sesión abierta)
class AttentionSampleCreateSerializer(serializers.Serializer):
    score  = serializers.IntegerField(min_value=0, max_value=100)
    absent = serializers.BooleanField(required=False, default=False)
    reason = serializers.CharField(required=False, allow_blank=True, default="")
    ear = serializers.FloatField(required=False, allow_null=True)
    mar = serializers.FloatField(required=False, allow_null=True)
    yaw = serializers.FloatField(required=False, allow_null=True)

# ---------- Payload flexible para stop ----------
# Para /api/attendance/stop/
class StopSessionPayloadSerializer(serializers.Serializer):
    average_score       = serializers.FloatField(required=False)       # 0..1
    average_score_100   = serializers.IntegerField(required=False)     # 0..100
    time_adjusted_avg   = serializers.IntegerField(required=False)     # 0..100
    attentive_pct       = serializers.IntegerField(required=False)
    total_samples       = serializers.IntegerField(required=False)
    session_ms          = serializers.IntegerField(required=False)

# ---------- Configuración ----------
class SystemConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SystemConfig
        fields = ("pct_activity", "pct_attention")
