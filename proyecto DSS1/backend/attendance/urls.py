from django.urls import path
from .views import (
    AttendanceReportView,
    StartSessionView, StopSessionView,
    SampleCreateView, MySessionsListView,
    LastAttentionView, ComputeFinalGradeView,
    SystemConfigView, set_user_role,
)

urlpatterns = [
    path('report/', AttendanceReportView.as_view()),
    path('start/', StartSessionView.as_view()),
    path('stop/', StopSessionView.as_view()),
    path('sample/', SampleCreateView.as_view()),
    path('mine/', MySessionsListView.as_view()),
    path('last/', LastAttentionView.as_view()),
    path('compute-final/', ComputeFinalGradeView.as_view()),
    path('config/', SystemConfigView.as_view()),
    path('set-role/', set_user_role),  # solo superuser
]
