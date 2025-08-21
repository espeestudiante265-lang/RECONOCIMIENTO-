from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, Course, Module, Activity, Submission, Enrollment, ActivityAttempt 

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    fieldsets = DjangoUserAdmin.fieldsets + (
        ('Rol', {'fields': ('role',)}),
    )
    list_display = ('username', 'email', 'role', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')

admin.site.register(Course)
admin.site.register(Module)
admin.site.register(Activity)
admin.site.register(Submission)
admin.site.register(Enrollment)

@admin.register(ActivityAttempt)
class ActivityAttemptAdmin(admin.ModelAdmin):
    list_display = ('activity', 'student', 'started_at', 'ended_at',
                    'monitoring_score', 'evaluation_grade', 'final_grade')
    list_filter = ('activity__module__course',)
    search_fields = ('student__username', 'activity__title')