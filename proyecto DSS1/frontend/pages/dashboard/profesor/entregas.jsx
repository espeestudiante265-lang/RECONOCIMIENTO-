import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// ——— helpers ———
function parseList(d) {
  return Array.isArray(d) ? d : (d?.results ?? [])
}

// Convierte rutas relativas (p.ej. "/media/…", "media/…") a URL absoluta usando el baseURL del API
function absoluteFileUrl(u) {
  if (!u) return ''
  const s = String(u).trim()
  if (!s) return ''
  if (/^https?:\/\//i.test(s)) return s // ya es absoluta
  const base = (api?.defaults?.baseURL || window.location.origin).replace(/\/+$/, '')
  const path = s.startsWith('/') ? s : `/${s}`
  return `${base}${path}`
}

export default function EntregasProfesor() {
  const { ready, logout } = useAuthGuard(['profesor'])

  const [activities, setActivities] = useState([])
  const [actSel, setActSel] = useState('')
  const [submissions, setSubmissions] = useState([])

  const [loadingActs, setLoadingActs] = useState(false)
  const [loadingSubs, setLoadingSubs] = useState(false)
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState({}) // { [submissionId]: true }

  // Cargar actividades del profesor
  useEffect(() => {
    if (!ready) return
    ;(async () => {
      setLoadingActs(true); setError(null)
      try {
        const r = await api.get('/api/activities/?mine=1')
        setActivities(parseList(r.data) || [])
      } catch (e) {
        console.error(e)
        setError('No se pudieron cargar las actividades')
      } finally {
        setLoadingActs(false)
      }
    })()
  }, [ready])

  // Cargar entregas de la actividad seleccionada
  const loadSubs = async (activityId) => {
    if (!activityId) { setSubmissions([]); return }
    setLoadingSubs(true); setError(null)
    try {
      const r = await api.get(`/api/submissions/?activity=${activityId}`)
      setSubmissions(parseList(r.data) || [])
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar las entregas')
    } finally {
      setLoadingSubs(false)
    }
  }

  useEffect(() => { loadSubs(actSel) }, [actSel])

  // Guardar nota (clamp 0..max_points)
  const grade = async (id, value, maxPoints = 100) => {
    let v = Number(value)
    if (!Number.isFinite(v)) return
    const maxP = Number(maxPoints || 100)
    if (v < 0) v = 0
    if (v > maxP) v = maxP

    setSaving(prev => ({ ...prev, [id]: true }))
    try {
      await api.patch(`/api/submissions/${id}/`, { grade: v })
      setSubmissions(prev => prev.map(s => s.id === id ? { ...s, grade: v } : s))
    } catch (e) {
      console.error(e)
      alert('No se pudo guardar la nota')
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }))
    }
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Entregas" menu={MENU.profesor} onLogout={logout}>
      <div className="p-4 rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_4px_24px_rgba(0,0,0,.25)] space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="min-w-[260px] rounded-xl px-3 py-2 border border-white/10 bg-[#111827] text-white placeholder-white/50"
              value={actSel}
              onChange={e=>setActSel(e.target.value)}
              disabled={loadingActs}
            >
              <option value="">{loadingActs ? 'Cargando…' : '— Selecciona actividad —'}</option>
              {activities.map(a=>(
                <option key={a.id} value={a.id}>{a.title || `Actividad ${a.id}`}</option>
              ))}
            </select>

            <button
              className="px-3 py-2 rounded-lg bg-[#1f2937] hover:bg-[#243042] transition disabled:opacity-60 text-sm"
              onClick={()=> loadSubs(actSel)}
              disabled={!actSel || loadingSubs}
            >
              {loadingSubs ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {!!error && <div className="text-red-400 text-sm">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Estudiante</th>
                <th className="text-left py-2">Archivo</th>
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Nota</th>
                <th className="text-left py-2">Calificar</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s=>{
                const rawFile = s.file_url ?? s.file?.url ?? s.file
                const fileHref = absoluteFileUrl(rawFile)
                const created = s.created_at ? new Date(s.created_at) : null
                const maxPts = s.max_points || 100
                const studentName = s.student_username || s.student?.username || `#${s.student_id ?? ''}`

                return (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="py-2">{studentName}</td>
                    <td className="py-2">
                      {fileHref
                        ? <a className="underline hover:opacity-80" href={fileHref} target="_blank" rel="noreferrer">Ver</a>
                        : <span className="text-white/50">—</span>}
                    </td>
                    <td className="py-2">{created ? created.toLocaleString() : '—'}</td>
                    <td className="py-2">{(s.grade ?? '—')}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={maxPts}
                          defaultValue={s.grade ?? ''}
                          className="w-24 rounded-lg px-2 py-1 border border-white/10 bg-[#111827] text-white"
                          onBlur={(e)=> grade(s.id, e.target.value, maxPts)}
                          disabled={!!saving[s.id]}
                        />
                        <span className="text-xs text-white/50">/ {maxPts}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!submissions.length && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-white/60">
                    {loadingSubs ? 'Cargando…' : 'Sin entregas'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
