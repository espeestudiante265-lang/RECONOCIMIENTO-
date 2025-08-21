import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import DashboardLayout from '../../../../components/DashboardLayout'
import { MENU } from '../../../../config/menu'
import { useAuthGuard } from '../../../../lib/auth'
import api, { getAccessToken } from '../../../../lib/api'   // <— IMPORTA getAccessToken

const EP = {
  activity: (id) => `/api/activities/${id}/`,
  submit: '/api/submissions/',
  listSubmissions: (id) => `/api/submissions/?activity=${id}&mine=1`,
  start: (id) => `/api/activities/${id}/start/`,
  finish: (id) => `/api/activities/${id}/finish/`,
  evaluation: (id) => `/api/activities/${id}/evaluation/`,
  submitQuiz: (id) => `/api/activities/${id}/submit-quiz/`,
}

// normaliza la URL por si viene sin http/https
function normalizeUrl(u) {
  const s = (u || '').trim()
  if (!s) return ''
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}
function fmtDate(iso) { try { return new Date(iso).toLocaleString() } catch { return '—' } }

const chip = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/70 ring-1 ring-inset ring-white/15"
const btnBase = "px-3 py-2 rounded-lg text-sm transition"
const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-500 text-white`
const btnGhost = `${btnBase} bg-[#1f2937] hover:bg-[#243042] text-white`
const btnEmerald = `${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white`

export default function ActividadDetalle() {
  const { ready, user, logout } = useAuthGuard(['estudiante'])
  const router = useRouter()
  const { id } = router.query

  const [activity, setActivity] = useState(null)
  const [mine, setMine] = useState([])
  const [loading, setLoading] = useState(true)

  // intento/monitoreo
  const [attemptId, setAttemptId] = useState(null)
  const [runStatus, setRunStatus] = useState('idle') // idle | running | done
  const [lastAttempt, setLastAttempt] = useState(null)
  const [actionError, setActionError] = useState(null)

  // cámara/atención
  const videoRef = useRef(null)
  const mediaStreamRef = useRef(null)
  const timerRef = useRef(null)
  const [camReady, setCamReady] = useState(false)
  const [autoTried, setAutoTried] = useState(false)
  const [attSamples, setAttSamples] = useState([]) // {t,score} en 0..100

  // quiz
  const [evaluation, setEvaluation] = useState(null) // {id,title,questions:[...]}
  const [answers, setAnswers] = useState({}) // qid -> {choices:Set, text:string}
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [quizResult, setQuizResult] = useState(null)

  // entrega (modo file)
  const [fileUrl, setFileUrl] = useState('')
  const [fileObj, setFileObj] = useState(null)
  const [submittingFile, setSubmittingFile] = useState(false)  // <— estado de envío

  useEffect(() => { if (ready && id) load() }, [ready, id])

  async function load() {
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([
        api.get(EP.activity(id)),
        api.get(EP.listSubmissions(id)),
      ])
      setActivity(aRes.data)
      const mineSubs = Array.isArray(sRes.data) ? sRes.data : (sRes.data?.results ?? [])
      setMine(mineSubs)

      // si tiene evaluación, tráela
      try {
        const eRes = await api.get(EP.evaluation(id))
        setEvaluation(eRes.data)
      } catch (_) {
        setEvaluation(null)
      }
    } catch (e) {
      console.error(e)
      alert('No se pudo cargar la actividad.')
    } finally { setLoading(false) }
  }

  /* ===================== Monitoreo ===================== */
  async function ensureCamera() {
    if (camReady && mediaStreamRef.current) return true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      mediaStreamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      setCamReady(true)
      return true
    } catch (err) {
      console.warn('No se pudo abrir la cámara:', err)
      setCamReady(false)
      return false
    }
  }
  function startSampling() {
    if (timerRef.current) return
    setAttSamples([])
    timerRef.current = setInterval(async () => {
      let score = 95 // fallback alto si hay cámara
      try {
        if (window.Attention?.compute) {
          const v = await window.Attention.compute(videoRef.current)
          if (typeof v === 'number' && !Number.isNaN(v)) {
            score = Math.max(0, Math.min(100, Math.round(v * 100)))
          }
        }
      } catch (_) {}
      const sample = { t: Date.now(), score: Math.max(0, Math.min(100, score)) }
      setAttSamples(prev => (prev.length > 200 ? [...prev.slice(-200), sample] : [...prev, sample]))
    }, 5000)
  }
  function stopSampling() {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }
  async function stopCamera() {
    try {
      stopSampling()
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
      }
      setCamReady(false)
    } catch (_) {}
  }
  function avgAttention01() {
    if (!attSamples.length) return 0
    const avg100 = Math.round(attSamples.reduce((a,b)=>a+b.score,0) / attSamples.length)
    return Math.max(0, Math.min(1, avg100 / 100))
  }
  function avgAttention100() {
    return Math.round(avgAttention01() * 100)
  }

  async function onStart(manual=false) {
    try {
      setActionError(null)
      if (activity?.requires_monitoring) {
        const ok = await ensureCamera()
        if (!ok) {
          setActionError('No se pudo acceder a la cámara. Permite el acceso para iniciar.')
          return
        }
      }
      const { data } = await api.post(EP.start(id))
      setAttemptId(data.id)
      setRunStatus('running')
      setLastAttempt(data)
      if (activity?.requires_monitoring) startSampling()
    } catch (e) {
      setActionError(e?.response?.data?.detail || e.message)
    } finally {
      if (!manual) setAutoTried(true)
    }
  }

  async function onFinish() {
    try {
      if (!attemptId) {
        setActionError('No hay intento activo. Presiona "Comenzar actividad" primero.')
        return
      }
      setActionError(null)
      const payload = activity?.requires_monitoring
        ? { attempt_id: attemptId, average_score: avgAttention01() }
        : { attempt_id: attemptId }
      const { data } = await api.post(EP.finish(id), payload)
      setRunStatus('done')
      setLastAttempt(data)
    } catch (e) {
      setActionError(e?.response?.data?.detail || e.message)
    } finally {
      await stopCamera()
      await load()
    }
  }

  useEffect(() => {
    if (!ready || loading || !activity) return
    if (runStatus !== 'idle' || autoTried) return
    if (activity.requires_monitoring) onStart(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, loading, activity, runStatus, autoTried])

  /* ===================== QUIZ ===================== */
  function setChoice(qid, cid, type) {
    setAnswers(prev => {
      const curr = prev[qid] || { choices: new Set(), text: '' }
      const next = { ...curr }
      const currentSet = curr.choices instanceof Set ? curr.choices : new Set(curr.choices || [])
      if (type === 'single') {
        next.choices = new Set([cid])
      } else {
        if (currentSet.has(cid)) currentSet.delete(cid)
        else currentSet.add(cid)
        next.choices = new Set(currentSet)
      }
      return { ...prev, [qid]: next }
    })
  }
  function setOpenText(qid, text) {
    setAnswers(prev => ({ ...prev, [qid]: { ...(prev[qid] || { choices: new Set() }), text } }))
  }
  function isChecked(qid, cid) {
    const a = answers[qid]
    if (!a || !(a.choices instanceof Set)) return false
    return a.choices.has(cid)
  }
  async function submitQuiz() {
    if (!evaluation) return
    if (!attemptId) { alert('Primero inicia la actividad.'); return }
    try {
      setSubmittingQuiz(true)
      const payload = {
        attempt_id: attemptId,
        answers: (evaluation.questions || []).map(q => {
          if (q.type === 'open') {
            return { question: q.id, text: (answers[q.id]?.text || '').trim() }
          }
          const set = answers[q.id]?.choices
          const arr = set instanceof Set ? Array.from(set) : []
          return { question: q.id, choices: arr }
        })
      }
      const { data } = await api.post(EP.submitQuiz(id), payload)
      setQuizResult(data)
      // consolidamos 70/30 cerrando intento
      await onFinish()
    } catch (e) {
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e.message
      alert('No se pudo enviar el quiz: ' + msg)
    } finally {
      setSubmittingQuiz(false)
    }
  }

  /* ===================== ENTREGA (archivo / URL) ===================== */
  async function submitFile() {
    try {
      setActionError(null)
      setSubmittingFile(true)

      if (fileObj) {
        // —— Envío de archivo por multipart a Django (axios usa baseURL del backend)
        const fd = new FormData()
        fd.append('activity', Number(id))
        fd.append('file', fileObj, fileObj.name)

        // axios agrega automáticamente el Content-Type con boundary
        await api.post(EP.submit, fd)

      } else {
        // —— Envío por URL (JSON)
        const url = normalizeUrl(fileUrl)
        if (!url) { alert('Ingresa la URL del archivo (Drive/Dropbox/OneDrive)'); return }
        await api.post(EP.submit, { activity: Number(id), file_url: url })
      }

      setFileUrl(''); setFileObj(null)
      await load()
      alert('¡Entrega enviada!')
    } catch (e) {
      // Fallback: algunos backends usan 'upload' en lugar de 'file'
      if (fileObj) {
        try {
          const fd2 = new FormData()
          fd2.append('activity', Number(id))
          fd2.append('upload', fileObj, fileObj.name)
          await api.post(EP.submit, fd2)
          setFileUrl(''); setFileObj(null)
          await load()
          alert('¡Entrega enviada!')
          return
        } catch (_) { /* si también falla, cae al mensaje genérico */ }
      }
      const msg = e?.response?.data ? JSON.stringify(e.response.data) : e.message
      alert('No se pudo enviar la entrega: ' + msg)
      setActionError(e?.response?.data?.detail || 'No se pudo enviar la entrega.')
    } finally {
      setSubmittingFile(false)
    }
  }

  // limpieza
  useEffect(() => () => { stopCamera() }, [])

  if (!ready || !id) {
    return (
      <div style={{minHeight:'100vh',display:'grid',placeItems:'center',color:'#fff',background:'#0b1220'}}>
        Cargando…
      </div>
    )
  }

  return (
    <DashboardLayout title={activity ? (activity.display_name || activity.title) : 'Actividad'} menu={MENU.estudiante} onLogout={logout}>
      {loading && <div>Cargando…</div>}

      {!loading && activity && (
        <div className="grid gap-6">
          {/* Detalle */}
          <div className="p-4 rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_4px_24px_rgba(0,0,0,.25)]">
            <div className="text-xl font-semibold mb-1">{activity.display_name || activity.title || 'Actividad'}</div>
            <div className="text-sm text-white/70 mb-2">{activity.description || 'Sin descripción'}</div>
            <div className="text-xs text-white/60 flex flex-wrap gap-3">
              <span>Límite: {activity.deadline ? fmtDate(activity.deadline) : '—'}</span>
              <span>Puntos: {activity.points}</span>
              <span className={chip}>Monitoreo: {activity.requires_monitoring ? 'Sí' : 'No'}</span>
              {activity.learning_type && <span className={chip}>Aprendizaje: {String(activity.learning_type).toUpperCase()}</span>}
              {activity.exam_mode && <span className={chip}>Modo: {activity.exam_mode === 'quiz' ? 'Quiz' : 'Archivo'}</span>}
            </div>

            {activity.learning_url && (
              <div className="mt-3">
                <a href={normalizeUrl(activity.learning_url)} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                  Abrir material de aprendizaje
                </a>
                <div className="text-xs text-white/50 mt-1">Si el sitio no permite embed, ábrelo en nueva pestaña.</div>
              </div>
            )}

            {/* START / FINISH */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {runStatus === 'idle' && (
                <>
                  <button onClick={() => onStart(true)} className={btnPrimary}>
                    {activity.requires_monitoring ? 'Permitir cámara e iniciar' : 'Comenzar actividad'}
                  </button>
                  {activity.requires_monitoring && (
                    <span className="text-xs text-white/60">
                      Se intentó iniciar automáticamente. Si el navegador lo bloqueó, toca el botón.
                    </span>
                  )}
                </>
              )}
              {runStatus === 'running' && (
                <>
                  <button onClick={onFinish} className={`${btnEmerald}`}>Finalizar actividad</button>
                  {activity.requires_monitoring && (
                    <span className="text-xs text-emerald-300">Atención promedio: {avgAttention100()}%</span>
                  )}
                </>
              )}
              {runStatus === 'done' && (
                <span className="text-sm text-emerald-400">¡Guardado!</span>
              )}
              {actionError && <span className="text-red-400 text-sm">{actionError}</span>}
            </div>

            {/* Resultados del intento */}
            {lastAttempt && (
              <div className="mt-3 text-sm">
                <div className="font-semibold">Resultados del intento</div>
                <ul className="list-disc ml-5">
                  <li>Monitoreo: {lastAttempt.monitoring_score ?? 0}%</li>
                  <li>Evaluación: {lastAttempt.evaluation_grade ?? 0}</li>
                  <li>Nota final (70/30): {lastAttempt.final_grade ?? 0}</li>
                </ul>
              </div>
            )}

            {/* Video oculto para la cámara */}
            <video ref={videoRef} playsInline muted className="hidden" />
          </div>

          {/* QUIZ (si existe y modo quiz) */}
          {evaluation && (activity.exam_mode === 'quiz' || !activity.exam_mode) && (
            <div className="p-4 rounded-2xl border border-white/10 bg-[#0b1220]">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-lg">{evaluation.title || 'Evaluación'}</div>
                <span className={chip}>Preguntas: {evaluation.questions?.length || 0}</span>
              </div>

              <div className="space-y-4">
                {(evaluation.questions || []).map((q, idx) => (
                  <div key={q.id} className="p-3 rounded-xl border border-white/10 bg-[#111827]">
                    <div className="text-sm mb-2">
                      <b>{idx + 1}.</b> {q.text} <span className={chip}>({q.type})</span> <span className={chip}>{q.points} pt</span>
                    </div>

                    {q.type !== 'open' ? (
                      <div className="space-y-1">
                        {q.choices.map(c => (
                          <label key={c.id} className="flex items-center gap-2 text-sm">
                            <input
                              type={q.type === 'single' ? 'radio' : 'checkbox'}
                              name={`q_${q.id}`}
                              checked={isChecked(q.id, c.id)}
                              onChange={() => setChoice(q.id, c.id, q.type)}
                              className="accent-blue-500"
                            />
                            <span>{c.text}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        className="w-full rounded-lg px-3 py-2 border border-white/10 bg-[#0b1220] outline-none"
                        placeholder="Tu respuesta…"
                        value={answers[q.id]?.text || ''}
                        onChange={e => setOpenText(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button onClick={submitQuiz} disabled={submittingQuiz || runStatus==='idle'} className={btnPrimary}>
                  {submittingQuiz ? 'Enviando…' : 'Enviar quiz'}
                </button>
                {runStatus==='idle' && <span className="text-xs text-white/60">Debes iniciar la actividad antes de enviar.</span>}
              </div>

              {quizResult && (
                <div className="mt-3 text-sm">
                  <div className="font-semibold">Resultado del quiz</div>
                  <ul className="list-disc ml-5">
                    <li>Puntos: {quizResult.points_earned} / {quizResult.points_total}</li>
                    <li>Nota evaluación: {quizResult.grade_percent}%</li>
                    <li>Nota final (70/30): {quizResult.final_grade ?? '-'}</li>
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Entrega de archivo (modo file) */}
          {(!evaluation || activity.exam_mode === 'file') && (
            <div className="p-4 rounded-2xl border border-white/10 bg-[#0b1220]">
              <div className="text-lg font-semibold mb-2">Enviar entrega</div>
              <div className="space-y-2 mb-3">
                <input
                  value={fileUrl}
                  onChange={e => setFileUrl(e.target.value)}
                  placeholder="Pega la URL (Drive/Dropbox/OneDrive)"
                  className="w-full px-3 py-2 rounded-lg bg-black/30 border border-white/20 outline-none focus:border-white/40"
                />
                <div className="text-xs text-white/50">o</div>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={e => setFileObj(e.target.files?.[0] || null)}
                  className="block text-sm"
                />
                <div className="flex gap-2">
                  <button
                    className={`${btnPrimary} disabled:opacity-60`}
                    onClick={submitFile}
                    disabled={submittingFile}
                  >
                    {submittingFile ? 'Enviando…' : 'Enviar'}
                  </button>
                  {fileObj && <span className="text-xs text-white/60">{fileObj.name}</span>}
                </div>
              </div>
              {!!mine.length && (
                <div className="text-sm text-white/70">
                  Última entrega: {mine[0]?.created_at ? fmtDate(mine[0].created_at) : '—'} · Nota: {mine[0]?.grade ?? '-'}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  )
}
