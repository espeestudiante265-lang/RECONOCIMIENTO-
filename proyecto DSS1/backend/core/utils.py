# core/utils.py
from django.db import transaction
from django.utils import timezone
from .models import ActivityAttempt, Submission, Evaluation, Question, Choice, Parameters

def _weights():
    try:
        p = Parameters.get_singleton()
        return float(p.activity_weight), float(p.attendance_weight)
    except Exception:
        return 70.0, 30.0

def percent(v, total):
    if not total:
        return 0.0
    return max(0.0, min(100.0, (float(v) / float(total)) * 100.0))

@transaction.atomic
def recompute_final_grade_for(student_id: int, activity_id: int):
    """
    Recalcula la nota final (70/30) del último intento del estudiante en la actividad.
    - evaluation_grade: del quiz (0..100) o, si exam_mode='file', de la Submission (0..points -> %)
    - monitoring_score: 0..100 (de la session de atención)
    """
    try:
        attempt = (ActivityAttempt.objects
                   .select_related('activity')
                   .filter(student_id=student_id, activity_id=activity_id)
                   .order_by('-started_at').first())
        if not attempt:
            return None

        activity = attempt.activity
        eval_pct = attempt.evaluation_grade or 0.0

        # si es file, y el profe ya calificó la Submission, úsala como evaluation_grade (%)
        if activity and getattr(activity, 'exam_mode', '') == 'file':
            sub = (Submission.objects
                   .filter(activity_id=activity_id, student_id=student_id)
                   .order_by('-created_at').first())
            if sub and (activity.points or 0) > 0 and sub.grade is not None:
                eval_pct = percent(sub.grade, activity.points)

        att_pct = attempt.monitoring_score or 0.0
        w_act, w_att = _weights()  # ej. 70/30
        final_grade = round((eval_pct * (w_act/100.0)) + (att_pct * (w_att/100.0)), 2)

        attempt.evaluation_grade = round(eval_pct, 2)
        attempt.final_grade = final_grade
        attempt.save(update_fields=['evaluation_grade', 'final_grade'])
        return attempt
    except Exception:
        return None
