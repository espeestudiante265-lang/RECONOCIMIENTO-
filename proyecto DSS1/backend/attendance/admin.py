from django.contrib import admin
from .models import AttendanceSession, AttentionSample

@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('id','student','started_at','ended_at','average_score')  # /20
    list_filter = ('student',)

@admin.register(AttentionSample)
class AttentionSampleAdmin(admin.ModelAdmin):
    list_display = ('id','session','created_at','score','ear','mar','yaw','absent','reason')
    list_filter = ('session', 'absent')
