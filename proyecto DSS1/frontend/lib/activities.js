// frontend/lib/activities.js
import api from './api'

// ---- Estudiante ----
export async function startActivity(activityId) {
  const { data } = await api.post(`/api/activities/${activityId}/start/`)
  return data // ActivityAttempt
}

export async function finishActivity(activityId, attemptId) {
  const { data } = await api.post(`/api/activities/${activityId}/finish/`, { attempt_id: attemptId })
  return data // ActivityAttempt
}

// ---- Docente ----
export async function addModuleToCourse(courseId, name) {
  const { data } = await api.post(`/api/courses/${courseId}/add_module/`, { name })
  return data // { id, title }
}