// frontend/components/estudiante/StartFinishActivity.jsx
import { useState } from 'react'
import { startActivity, finishActivity } from '@/lib/activities'

export default function StartFinishActivity({ activityId, onUpdated }) {
  const [attemptId, setAttemptId] = useState(null)
  const [status, setStatus] = useState('idle') // idle | running | done
  const [error, setError] = useState(null)
  const [lastResult, setLastResult] = useState(null)

  const onStart = async () => {
    try {
      setError(null)
      const res = await startActivity(activityId)
      setAttemptId(res.id)
      setStatus('running')
      if (onUpdated) onUpdated(res)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    }
  }

  const onFinish = async () => {
    try {
      setError(null)
      const res = await finishActivity(activityId, attemptId)
      setLastResult(res)
      setStatus('done')
      if (onUpdated) onUpdated(res)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    }
  }

  return (
    <div className="space-y-2">
      {status === 'idle' && (
        <button onClick={onStart} className="px-4 py-2 rounded bg-blue-600 text-white">
          Comenzar actividad
        </button>
      )}

      {status === 'running' && (
        <button onClick={onFinish} className="px-4 py-2 rounded bg-green-600 text-white">
          Finalizar actividad
        </button>
      )}

      {status === 'done' && (
        <div className="text-sm">
          <div className="font-semibold">¡Guardado!</div>
          {lastResult && (
            <ul className="list-disc ml-5">
              <li>Monitoreo: {lastResult.monitoring_score ?? 0}%</li>
              <li>Evaluación: {lastResult.evaluation_grade ?? 0}</li>
              <li>Nota final (70/30): {lastResult.final_grade ?? 0}</li>
            </ul>
          )}
        </div>
      )}

      {error && <div className="text-red-600 text-sm">{String(error)}</div>}
    </div>
  )
}
