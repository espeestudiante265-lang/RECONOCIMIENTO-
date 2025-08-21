import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// Endpoints
const EP = {
  myCourses: '/api/courses/?mine=1',
  modules: (courseId) => `/api/modules/?course=${courseId}`,
  activities: (moduleId) => `/api/activities/?module=${moduleId}`,
  createActivity: '/api/activities/',
  // Evaluación (plantilla) ligada a Activity
  createEvaluation: '/api/evaluations/',
  listEvaluations: (activityId) => `/api/evaluations/?activity=${activityId}`,
  // detalle (editar / eliminar)
  activityDetail: (id) => `/api/activities/${id}/`,
}

const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])

// ---- UI helpers (mismos tokens que Cursos) ----
const card = "p-4 rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_4px_24px_rgba(0,0,0,.25)]"
const input = "w-full rounded-xl px-3 py-2 border border-white/10 bg-[#111827] text-white placeholder-white/50 outline-none focus:ring-2 focus:ring-blue-500/40"
const select = input
const textarea = input
const btnBase = "px-3 py-2 rounded-lg text-sm transition"
const btnPrimary = `${btnBase} bg-blue-600 hover:bg-blue-500 text-white`
const btnGhost = `${btnBase} bg-[#1f2937] hover:bg-[#243042] text-white`
const btnDanger = `${btnBase} bg-red-600 hover:bg-red-500 text-white`
const btnEmerald = `${btnBase} bg-emerald-600 hover:bg-emerald-500 text-white`
const chip = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-white/10 text-white/70 ring-1 ring-inset ring-white/15"

function formatDeadline(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch { return '—' }
}

// helpers de fechas para <input type="datetime-local">
const pad = (n) => String(n).padStart(2, '0')
function isoToLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
function localInputToISO(val) {
  if (!val) return null
  const d = new Date(val)
  if (isNaN(d)) return null
  return d.toISOString()
}

/* ====== Validación y utilidades ====== */
function looksLikeHTML(x) {
  return typeof x === 'string' && /<!DOCTYPE html|<html/i.test(x)
}

export default function ProfesorActividades() {
  const { ready, logout } = useAuthGuard(['profesor'])
  const [courses, setCourses] = useState([])
  const [modules, setModules] = useState([])
  const [activities, setActivities] = useState([])

  // filtros
  const [courseId, setCourseId] = useState('')
  const [moduleId, setModuleId] = useState('')
  
  // form actividad (crear)
  const [title, setTitle] = useState('')
  const [deadline, setDeadline] = useState('')
  const [points, setPoints] = useState(100)
  const [description, setDescription] = useState('')
  const [requiresMonitoring, setRequiresMonitoring] = useState(true)

  // tipo de actividad + tipo de “contenido”
  const [kind, setKind] = useState('evaluacion') // default evaluacion
  const [contentType, setContentType] = useState('video') // 'video' | 'pdf' | 'clase' | 'otro'

  // Evaluation (2-en-1)
  const [isEvaluatio, setIsEvaluatio] = useState(true)
  const [learningURL, setLearningURL] = useState('')
  const [examMode, setExamMode] = useState('quiz') // 'quiz' | 'file'

  // builder evaluación (solo si examMode='quiz')
  const [evTitle, setEvTitle] = useState('Evaluación')
  const [questions, setQuestions] = useState([]) // {id, type, text, options:[{text,is_correct}], points}

  // ui states (crear/listar)
  const [loadingCreate, setLoadingCreate] = useState(false)
  const [loadingActivities, setLoadingActivities] = useState(false)

  // ===== edición/eliminación por fila =====
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ title: '', deadline: '', points: 100, description: '', requires_monitoring: true })
  const [savingRow, setSavingRow] = useState(null)      // id o null
  const [deletingRow, setDeletingRow] = useState(null)  // id o null
  const [rowOk, setRowOk] = useState({})
  const [rowErr, setRowErr] = useState({})

  const resetForm = () => {
    setTitle(''); setDeadline(''); setPoints(100); setDescription('')
    setRequiresMonitoring(true); setKind('evaluacion'); setContentType('video')
    setIsEvaluatio(true); setLearningURL(''); setExamMode('quiz')
    setEvTitle('Evaluación'); setQuestions([])
  }

  useEffect(() => {
    if (!ready) return
    api.get(EP.myCourses).then(r => setCourses(parseList(r.data))).catch(() => setCourses([]))
  }, [ready])

  useEffect(() => {
    if (!courseId) { setModules([]); setModuleId(''); return }
    api.get(EP.modules(courseId)).then(r => setModules(parseList(r.data))).catch(() => setModules([]))
  }, [courseId])

  useEffect(() => {
    if (!moduleId) { setActivities([]); return }
    setLoadingActivities(true)
    api.get(EP.activities(moduleId))
      .then(r => setActivities(parseList(r.data)))
      .catch(() => setActivities([]))
      .finally(() => setLoadingActivities(false))
  }, [moduleId])

  // ----- builder helpers (crear) -----
  const addQuestion = (type = 'single') => {
    setQuestions(q => [...q, {
      id: Date.now(),
      type, // single | multiple | open
      text: '',
      points: 1,
      options: type === 'open' ? [] : [{ text: '', is_correct: true }, { text: '', is_correct: false }]
    }])
  }

  const updateQuestion = (qid, patch) => {
    setQuestions(q => q.map(it => it.id === qid ? { ...it, ...patch } : it))
  }

  const updateOption = (qid, idx, patch) => {
    setQuestions(q => q.map(it => {
      if (it.id !== qid) return it
      const options = it.options.map((op, i) => i === idx ? { ...op, ...patch } : op)
      return { ...it, options }
    }))
  }

  const addOption = (qid) => {
    setQuestions(q => q.map(it => {
      if (it.id !== qid) return it
      return { ...it, options: [...it.options, { text: '', is_correct: false }] }
    }))
  }

  const removeOption = (qid, idx) => {
    setQuestions(q => q.map(it => {
      if (it.id !== qid) return it
      const options = it.options.filter((_, i) => i !== idx)
      return { ...it, options }
    }))
  }

  const removeQuestion = (qid) => setQuestions(q => q.filter(it => it.id !== qid))

  // ----- crear actividad + evaluación -----
  const createAll = async () => {
    if (!moduleId) { alert('Selecciona módulo'); return }
    if (!title.trim()) { alert('Falta título'); return }

    const activityPayload = {
      module: Number(moduleId),
      title: title.trim(),
      description: `[${contentType}] ${description || ''}`.trim(),
      deadline: deadline ? new Date(deadline).toISOString() : null,
      points: Number(points) || 100,
      post_type: kind,               // 'tarea' o 'evaluacion'
      requires_monitoring: !!requiresMonitoring,
      is_evaluatio: kind === 'evaluacion',  // Marca si es actividad evaluation
      learning_type: contentType,
    }

    try {
      setLoadingCreate(true)

      // 1) crear actividad
      const { data: act } = await api.post(EP.createActivity, activityPayload)

      // 2) si es evaluación + quiz, crear plantilla
      if (kind === 'evaluacion' && examMode === 'quiz') {
        const cleanQuestions = (questions || [])
          .filter(q => (q.text || '').trim() !== '')
          .map(q => {
            let choices = []
            if (q.type !== 'open') {
              choices = (q.options || [])
                .filter(o => (o.text || '').trim() !== '')
                .map(o => ({ text: o.text.trim(), is_correct: !!o.is_correct }))
              if (choices.length < 2) throw new Error(`La pregunta "${q.text}" necesita al menos 2 opciones.`)
              const correct = choices.filter(o => o.is_correct).length
              if (q.type === 'single' && correct !== 1) throw new Error(`"${q.text}" debe tener exactamente una correcta.`)
              if (q.type === 'multiple' && correct < 1) throw new Error(`"${q.text}" debe tener al menos una correcta.`)
            }
            return { type: q.type, text: q.text.trim(), points: Number(q.points) || 1, choices }
          })
        if (!cleanQuestions.length) throw new Error('Debe haber al menos una pregunta con texto.')

        await api.post(EP.createEvaluation, { activity: act.id, title: (evTitle || 'Evaluación').trim(), questions: cleanQuestions })
      }

      // refrescar lista
      const r = await api.get(EP.activities(moduleId))
      setActivities(parseList(r.data))
      resetForm()
      alert('Actividad creada')
    } catch (e) {
      let msg = e?.message || 'Error al crear'
      if (e?.response) {
        const d = e.response.data
        if (typeof d === 'string' && looksLikeHTML(d)) {
          msg = 'Error del servidor (HTML). Revisa la consola del backend.'
        } else {
          msg = typeof d === 'string' ? d : JSON.stringify(d)
        }
      }
      alert('No se pudo crear: ' + msg)
    } finally {
      setLoadingCreate(false)
    }
  }

  // ======== EDICIÓN / ELIMINACIÓN ========
  const beginEdit = (a) => {
    setEditingId(a.id)
    setRowErr(p => ({ ...p, [a.id]: null }))
    setRowOk(p => ({ ...p, [a.id]: null }))
    setEditForm({
      title: a.title || a.display_name || '',
      deadline: isoToLocalInput(a.deadline),
      points: a.points ?? 100,
      description: a.description || '',
      requires_monitoring: !!a.requires_monitoring,
    })
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ title: '', deadline: '', points: 100, description: '', requires_monitoring: true })
  }

  const saveEdit = async (id) => {
    setSavingRow(id)
    setRowErr(p => ({ ...p, [id]: null }))
    setRowOk(p => ({ ...p, [id]: null }))
    try {
      const payload = {
        title: (editForm.title || '').trim(),
        deadline: localInputToISO(editForm.deadline),
        points: Number(editForm.points) || 0,
        description: (editForm.description || '').trim(),
        requires_monitoring: !!editForm.requires_monitoring,
      }
      // remove keys vacíos para evitar sobrescribir con ''
      const dataToSend = {}
      for (const [k, v] of Object.entries(payload)) {
        if (v !== '' && v !== undefined) dataToSend[k] = v
      }

      const { data } = await api.patch(EP.activityDetail(id), dataToSend)
      // actualiza en memoria (si backend no devuelve todo, mezclamos)
      setActivities(prev => prev.map(a => a.id === id ? { ...a, ...data, ...dataToSend } : a))
      setRowOk(p => ({ ...p, [id]: 'Actualizado ✅' }))
      setEditingId(null)
      setTimeout(() => setRowOk(p => ({ ...p, [id]: null })), 2000)
    } catch (e) {
      const msg = e?.response?.data?.detail || (typeof e?.response?.data === 'string' ? e.response.data : 'No se pudo actualizar')
      setRowErr(p => ({ ...p, [id]: msg }))
    } finally {
      setSavingRow(null)
    }
  }

  const deleteActivity = async (id) => {
    if (!confirm('¿Eliminar actividad?')) return
    setDeletingRow(id)
    try {
      await api.delete(EP.activityDetail(id))
      setActivities(prev => prev.filter(a => a.id !== id))
    } catch (e) {
      alert('No se pudo eliminar: ' + (e?.response?.data?.detail || e.message))
    } finally {
      setDeletingRow(null)
    }
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Actividades" menu={MENU.profesor} onLogout={logout}>
      <div className="grid md:grid-cols-2 gap-6">
        {/* FILTROS + CREACIÓN */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-lg">Nueva actividad</div>
            <div className="flex gap-2">
              <span className={chip}>{isEvaluatio ? 'Evaluation (2-en-1)' : (kind === 'evaluacion' ? 'Evaluación' : 'Tarea')}</span>
              <span className={chip}>{contentType}</span>
              <span className={chip}>{requiresMonitoring ? 'Monitoreo' : 'Sin monitoreo'}</span>
            </div>
          </div>

          {/* Filtros */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="mb-1 text-xs text-white/60">Curso</div>
              <select className={select} value={courseId} onChange={e => setCourseId(e.target.value)}>
                <option value="">— Selecciona curso —</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="mt-1 text-xs text-white/45">Primero elige el curso para poder escoger el módulo.</p>
            </div>
            <div>
              <div className="mb-1 text-xs text-white/60">Módulo</div>
              <select className={select} value={moduleId} onChange={e => setModuleId(e.target.value)} disabled={!courseId}>
                <option value="">— Selecciona módulo —</option>
                {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
              </select>
              <p className="mt-1 text-xs text-white/45">Las actividades se enumeran por módulo (Evaluation 1, 2, …).</p>
            </div>
          </div>

          <div className="h-px bg-white/10 my-3" />

          {/* Form */}
          <div className="space-y-3">
            {/* Toggle Evaluation */}
            <div className="flex items-center gap-2">
              <input
                id="isEvaluatio"
                type="checkbox"
                className="accent-blue-500"
                checked={isEvaluatio}
                onChange={e => {
                  const v = e.target.checked
                  setIsEvaluatio(v)
                  if (v) setKind('evaluacion')
                }}
              />
              <label htmlFor="isEvaluatio" className="text-sm">Crear como <b>Actividad Evaluation</b> (Aprendizaje + Evaluación)</label>
            </div>

            {/* Título */}
            <div>
              <div className="mb-1 text-xs text-white/60">Título {isEvaluatio && <span className="text-white/40">(opcional – se auto-nombra)</span>}</div>
              <input className={input} placeholder={isEvaluatio ? "Se asignará: Actividad Evaluation N" : "Título"}
                     value={title} onChange={e => setTitle(e.target.value)} />
              <p className="mt-1 text-xs text-white/45">Si usas “Actividad Evaluation”, el sistema nombrará automáticamente: <i>Actividad Evaluation N</i>.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs text-white/60">Fecha y hora de entrega</div>
                <input className={input} type="datetime-local" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <div className="mb-1 text-xs text-white/60">Puntos</div>
                <input className={input} type="number" min="1" value={points} onChange={e => setPoints(e.target.value)} placeholder="Puntos" />
              </div>
            </div>
            <p className="mt-1 text-xs text-white/45">Fecha límite de entrega y puntaje total de la actividad.</p>

            <div>
              <div className="mb-1 text-xs text-white/60">Descripción</div>
              <textarea className={textarea} rows={3} placeholder="Descripción" value={description} onChange={e => setDescription(e.target.value)} />
              <p className="mt-1 text-xs text-white/45">Breve descripción o instrucciones para el estudiante.</p>
            </div>

            {/* Tipo y contenido */}
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <div className="mb-1 text-xs text-white/60">Tipo</div>
                <select className={select} value={kind} onChange={e => setKind(e.target.value)} disabled={isEvaluatio}>
                  <option value="tarea">Tarea</option>
                  <option value="evaluacion">Evaluación</option>
                </select>
              </div>
              <div>
                <div className="mb-1 text-xs text-white/60">Contenido (Aprendizaje)</div>
                <select className={select} value={contentType} onChange={e => setContentType(e.target.value)}>
                  <option value="video">Video</option>
                  <option value="pdf">PDF</option>
                  <option value="clase">Clase</option>
                  <option value="otro">Otro</option>
                </select>
                <p className="mt-1 text-xs text-white/45">Tipo de material que el estudiante revisará (se monitorea esta parte).</p>
              </div>
              <label className="flex items-center gap-2 mt-7 text-sm">
                <input type="checkbox" className="accent-blue-500" checked={requiresMonitoring} onChange={e => setRequiresMonitoring(e.target.checked)} />
                Requiere monitoreo
              </label>
            </div>
            <p className="mt-1 text-xs text-white/45">Activa la cámara durante la parte de aprendizaje para calcular atención.</p>

            {/* Material y modo */}
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <div className="mb-1 text-xs text-white/60">URL del material (opcional)</div>
                <input className={input} placeholder="https://… (video/pdf/…)"
                       value={learningURL} onChange={e => setLearningURL(e.target.value)} />
                <p className="mt-1 text-xs text-white/45">Enlace al video/PDF/otro material.</p>
              </div>
              <div>
                <div className="mb-1 text-xs text-white/60">Modo de evaluación</div>
                <select className={select} value={examMode} onChange={e => setExamMode(e.target.value)}>
                  <option value="quiz">Quiz</option>
                  <option value="file">Entrega de archivo</option>
                </select>
                <p className="mt-1 text-xs text-white/45">Elige <b>Quiz</b> para preguntas aquí mismo, o <b>Entrega de archivo</b> para que suban un documento.</p>
              </div>
            </div>

            {/* Builder de preguntas solo si examMode = quiz */}
            {isEvaluatio && examMode === 'quiz' && (
              <div className="mt-1 p-3 rounded-xl border border-white/10 bg-[#111827]">
                <div className="mb-2 font-semibold">Plantilla de evaluación</div>

                <div className="mb-3">
                  <div className="mb-1 text-xs text-white/60">Título de la evaluación</div>
                  <input className={input} value={evTitle} onChange={e => setEvTitle(e.target.value)} placeholder="Título de la evaluación" />
                </div>

                <div className="space-y-4">
                  {questions.map((q, qi) => (
                    <div key={q.id} className="p-3 rounded-xl border border-white/10 bg-[#0b1220]">
                      <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
                        <select
                          className="rounded-lg px-2 py-1 border border-white/10 bg-[#111827]"
                          value={q.type}
                          onChange={e => updateQuestion(q.id, {
                            type: e.target.value,
                            options: e.target.value === 'open' ? [] :
                              (q.options?.length ? q.options : [{ text: '', is_correct: true }, { text: '', is_correct: false }])
                          })}
                        >
                          <option value="single">Opción única</option>
                          <option value="multiple">Múltiple</option>
                          <option value="open">Abierta</option>
                        </select>

                        <input
                          className="flex-1 rounded-lg px-2 py-1 border border-white/10 bg-[#111827] outline-none"
                          placeholder={`Pregunta ${qi + 1}`}
                          value={q.text}
                          onChange={e => updateQuestion(q.id, { text: e.target.value })}
                        />

                        <input
                          className="w-24 rounded-lg px-2 py-1 border border-white/10 bg-[#111827] outline-none"
                          type="number" min="1"
                          value={q.points}
                          onChange={e => updateQuestion(q.id, { points: e.target.value })}
                        />

                        <button onClick={() => removeQuestion(q.id)} className={`${btnDanger} text-xs`}>Eliminar</button>
                      </div>

                      {q.type !== 'open' && (
                        <div className="space-y-2">
                          {q.options.map((op, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <input
                                className="flex-1 rounded-lg px-2 py-1 border border-white/10 bg-[#111827] outline-none"
                                placeholder={`Opción ${idx + 1}`}
                                value={op.text}
                                onChange={e => updateOption(q.id, idx, { text: e.target.value })}
                              />
                              <label className="text-xs flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  className="accent-blue-500"
                                  checked={!!op.is_correct}
                                  onChange={e => updateOption(q.id, idx, { is_correct: e.target.checked })}
                                />
                                Correcta
                              </label>
                              <button onClick={() => removeOption(q.id, idx)} className={`${btnGhost} text-xs`}>Quitar</button>
                            </div>
                          ))}
                          <button onClick={() => addOption(q.id)} className={`${btnPrimary} text-xs`}>+ Opción</button>
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => addQuestion('single')} className={`${btnPrimary} text-xs`}>+ Única</button>
                    <button onClick={() => addQuestion('multiple')} className={`${btnGhost} text-xs`}>+ Múltiple</button>
                    <button onClick={() => addQuestion('open')} className={`${btnEmerald} text-xs`}>+ Abierta</button>
                  </div>
                </div>

                <p className="mt-3 text-xs text-white/45">
                  Para <b>Opción única</b> debe haber exactamente una correcta. Para <b>Múltiple</b>, al menos una.
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button onClick={createAll} disabled={loadingCreate} className={btnPrimary}>
                {loadingCreate ? 'Creando…' : 'Crear actividad'}
              </button>
              <button onClick={resetForm} className={btnGhost}>Limpiar</button>
            </div>
          </div>
        </div>

        {/* LISTA DE ACTIVIDADES DEL MÓDULO */}
        <div className={card}>
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-lg">Actividades del módulo</div>
            {moduleId
              ? <span className="text-xs text-white/60">Módulo #{moduleId}</span>
              : <span className="text-xs text-white/60">Selecciona un módulo</span>}
          </div>

          {!moduleId ? (
            <div className="text-white/60 text-sm">Usa los filtros para ver las actividades.</div>
          ) : loadingActivities ? (
            <div className="text-white/60 text-sm">Cargando actividades…</div>
          ) : !activities.length ? (
            <div className="text-white/60 text-sm">Sin actividades</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-sm">
                <thead className="text-white/60">
                  <tr>
                    <th className="text-left py-2 px-3">Título</th>
                    <th className="text-left py-2 px-3">Tipo</th>
                    <th className="text-left py-2 px-3">Contenido</th>
                    <th className="text-left py-2 px-3">Monitoreo</th>
                    <th className="text-left py-2 px-3">Entrega</th>
                    <th className="text-left py-2 px-3">Puntos</th>
                    <th className="text-left py-2 px-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map(a => {
                    const display =
                      a.display_name
                      || (a.is_evaluatio && a.evaluatio_seq ? `Actividad Evaluation ${a.evaluatio_seq}` : (a.title || '—'))
                    const okMsg = rowOk[a.id]
                    const errMsg = rowErr[a.id]

                    return (
                      <>
                        <tr key={a.id} className="border-t border-white/10">
                          <td className="py-2 px-3">{display}</td>
                          <td className="py-2 px-3">
                            <span className={chip}>{a.is_evaluatio ? 'Evaluation (2-en-1)' : (a.post_type === 'evaluacion' ? 'Evaluación' : 'Tarea')}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={chip}>{(a.description || '').match(/^\[(.*?)\]/)?.[1] || a.learning_type?.toUpperCase?.() || '—'}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className={chip}>{a.requires_monitoring ? 'Sí' : 'No'}</span>
                          </td>
                          <td className="py-2 px-3">{formatDeadline(a.deadline)}</td>
                          <td className="py-2 px-3">{a.points}</td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                className={btnGhost + ' text-xs'}
                                onClick={async () => {
                                  const r = await api.get(EP.listEvaluations(a.id))
                                  const hasEval = parseList(r.data).length > 0
                                  alert(hasEval ? 'Esta actividad ya tiene evaluación' : 'Esta actividad no tiene evaluación')
                                }}
                              >
                                Ver evaluación
                              </button>

                              {editingId === a.id ? (
                                <>
                                  <button
                                    className={btnEmerald + ' text-xs disabled:opacity-60'}
                                    onClick={() => saveEdit(a.id)}
                                    disabled={savingRow === a.id}
                                  >
                                    {savingRow === a.id ? 'Guardando…' : 'Guardar'}
                                  </button>
                                  <button className={btnGhost + ' text-xs'} onClick={cancelEdit}>Cancelar</button>
                                </>
                              ) : (
                                <>
                                  <button className={btnPrimary + ' text-xs'} onClick={() => beginEdit(a)}>Editar</button>
                                  <button
                                    className={btnDanger + ' text-xs disabled:opacity-60'}
                                    onClick={() => deleteActivity(a.id)}
                                    disabled={deletingRow === a.id}
                                  >
                                    {deletingRow === a.id ? 'Eliminando…' : 'Eliminar'}
                                  </button>
                                </>
                              )}
                            </div>
                            {okMsg && <div className="text-emerald-400 text-xs mt-1">{okMsg}</div>}
                            {errMsg && <div className="text-red-400 text-xs mt-1">{errMsg}</div>}
                          </td>
                        </tr>

                        {editingId === a.id && (
                          <tr className="border-t border-white/10">
                            <td colSpan={7} className="px-3 py-3 bg-black/20">
                              <div className="grid md:grid-cols-2 gap-3">
                                <div>
                                  <div className="mb-1 text-xs text-white/60">Título</div>
                                  <input
                                    className={input}
                                    value={editForm.title}
                                    onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 text-xs text-white/60">Fecha y hora de entrega</div>
                                  <input
                                    type="datetime-local"
                                    className={input}
                                    value={editForm.deadline}
                                    onChange={e => setEditForm(f => ({ ...f, deadline: e.target.value }))}
                                  />
                                </div>
                                <div>
                                  <div className="mb-1 text-xs text-white/60">Puntos</div>
                                  <input
                                    type="number"
                                    min={1}
                                    className={input}
                                    value={editForm.points}
                                    onChange={e => setEditForm(f => ({ ...f, points: e.target.value }))}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    id={`rm_${a.id}`}
                                    type="checkbox"
                                    className="accent-blue-500"
                                    checked={!!editForm.requires_monitoring}
                                    onChange={e => setEditForm(f => ({ ...f, requires_monitoring: e.target.checked }))}
                                  />
                                  <label htmlFor={`rm_${a.id}`} className="text-sm">Requiere monitoreo</label>
                                </div>
                                <div className="md:col-span-2">
                                  <div className="mb-1 text-xs text-white/60">Descripción</div>
                                  <textarea
                                    rows={3}
                                    className={textarea}
                                    value={editForm.description}
                                    onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                                  />
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
