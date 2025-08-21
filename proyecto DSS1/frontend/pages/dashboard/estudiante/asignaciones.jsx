// pages/dashboard/estudiante/asignaciones.jsx
import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

/* ================== Endpoints ================== */
const EP = {
  enrollmentsMine: '/api/enrollments/mine/',
  course: (id) => `/api/courses/${id}/`,
  modules: (courseId) => `/api/modules/?course=${courseId}`,
  actsByModule: (moduleId) => `/api/activities/?module=${moduleId}`,
  actsByCourseParam: (courseId) => `/api/activities/?course=${courseId}`,
  actsNested: (courseId) => `/api/courses/${courseId}/activities/`,
  actsAll: '/api/activities/',
  submissions: '/api/submissions/',
}

/* ================== Utils ================== */
const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])
const getId = (x) => (x?.id ?? x?.pk ?? x)
const sameId = (a, b) => Number(getId(a)) === Number(getId(b))

async function safeGet(url) {
  try { const r = await api.get(url); return { ok:true, data:r.data } }
  catch { return { ok:false, data:null } }
}

const chipBase =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset'
const CHIP = {
  pendiente: `${chipBase} bg-yellow-400/10 text-yellow-300 ring-yellow-300/20`,
  entregada: `${chipBase} bg-emerald-400/10 text-emerald-300 ring-emerald-300/20`,
  vencida:   `${chipBase} bg-red-400/10 text-red-300 ring-red-300/20`,
  hoy:       `${chipBase} bg-blue-400/10 text-blue-300 ring-blue-300/20`,
}

/* ===== Helpers de UI (cards/tables) para uniformar estilo ===== */
function StatCard({ label, value, progress = null }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,.25)]">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 to-blue-500"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />
        </div>
      )}
    </div>
  )
}
function Th({ children, className='' }) {
  return <th className={`text-xs uppercase tracking-wide ${className}`}>{children}</th>
}
function Td({ children, className='' }) {
  return <td className={`align-middle ${className}`}>{children}</td>
}

/* ================== Página ================== */
export default function Asignaciones() {
  const { ready, user, logout } = useAuthGuard(['estudiante'])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => { if (ready) load() }, [ready])

  async function fetchActivitiesForCourse(courseId) {
    const modsRes = await safeGet(EP.modules(courseId))
    const modules = parseList(modsRes.data || [])
    let acts = []

    for (const m of modules) {
      const a = await safeGet(EP.actsByModule(getId(m)))
      acts = acts.concat(parseList(a.data) || [])
    }
    if (!acts.length) {
      const nested = await safeGet(EP.actsNested(courseId))
      if (nested.ok) acts = parseList(nested.data)
    }
    if (!acts.length) {
      const byCourse = await safeGet(EP.actsByCourseParam(courseId))
      if (byCourse.ok) acts = parseList(byCourse.data)
    }
    if (!acts.length) {
      const all = await safeGet(EP.actsAll)
      acts = parseList(all.data).filter(a => sameId(a.course, courseId) || sameId(a.course_id, courseId))
    }
    return { modules, activities: acts }
  }

  async function load() {
    setLoading(true); setError(null)
    try {
      const [subsRes, enrRes] = await Promise.all([safeGet(EP.submissions), safeGet(EP.enrollmentsMine)])
      const allSubs = parseList(subsRes.data)
      const mySubs = allSubs.filter(s => Number(getId(s.student) ?? s.student_id) === Number(user?.id))

      const out = []
      for (const e of parseList(enrRes.data)) {
        const courseId = getId(e.course)
        const cRes = await safeGet(EP.course(courseId))
        const course = cRes.ok ? cRes.data : { id:courseId, name:`(curso ${courseId})` }

        const { modules, activities } = await fetchActivitiesForCourse(courseId)
        const modMap = new Map(modules.map(m => [Number(getId(m)), m]))

        for (const a of activities) {
          const submission = mySubs.find(s => sameId(s.activity, a.id) || sameId(s.activity_id, a.id))
          const moduleObj = modMap.get(Number(getId(a.module))) || modMap.get(Number(a.module_id)) || { title:'—' }
          out.push({ activity: a, course, module: moduleObj, submission })
        }
      }

      out.sort((x, y) => {
        const ax = x.activity?.deadline ? new Date(x.activity.deadline).getTime() : Infinity
        const ay = y.activity?.deadline ? new Date(y.activity.deadline).getTime() : Infinity
        return ax - ay
      })
      setRows(out)
    } catch (e) {
      setError(e?.message || 'No se pudieron cargar las asignaciones.')
      setRows([])
    } finally { setLoading(false) }
  }

  const stats = useMemo(() => {
    const total = rows.length
    const entregadas = rows.filter(r => !!r.submission).length
    const pendientes = total - entregadas
    return { total, entregadas, pendientes, progress: total ? Math.round((entregadas / total) * 100) : 0 }
  }, [rows])

  if (!ready) return null

  const now = Date.now()

  return (
    <DashboardLayout title="Asignaciones" menu={MENU.estudiante} onLogout={logout}>
      <div className="grid gap-5">
        {/* KPIs uniformes con barra de progreso */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Entregadas" value={stats.entregadas} progress={stats.progress} />
          <StatCard label="Pendientes" value={stats.total - stats.entregadas} />
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-sm">{error}</div>
        )}

        {loading && <div>Cargando…</div>}

        {!loading && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white/10 sticky top-0 backdrop-blur">
                  <tr>
                    <Th className="w-[18%]">Curso</Th>
                    <Th className="w-[18%]">Módulo</Th>
                    <Th className="w-[30%]">Actividad</Th>
                    <Th className="w-[8%] text-center">Puntos</Th>
                    <Th className="w-[16%]">Fecha límite</Th>
                    <Th className="w-[10%] text-center">Estado</Th>
                    <Th className="w-[10%] text-center">Acción</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const deadline = r.activity.deadline ? new Date(r.activity.deadline).getTime() : null
                    const isDelivered = !!r.submission
                    const isToday = !!deadline && new Date().toDateString() === new Date(deadline).toDateString()
                    const isOverdue = !!deadline && deadline < now && !isDelivered

                    let chipClass = isDelivered ? CHIP.entregada : CHIP.pendiente
                    if (isToday && !isDelivered) chipClass = CHIP.hoy
                    if (isOverdue) chipClass = CHIP.vencida

                    return (
                      <tr key={r.activity.id} className="border-t border-white/10 odd:bg-white/[0.02] hover:bg-white/5">
                        <Td className="truncate">{r.course.name ?? r.course.title ?? '—'}</Td>
                        <Td className="truncate">{r.module.title ?? '—'}</Td>
                        <Td className="truncate">{r.activity.title}</Td>
                        <Td className="text-center">{r.activity.points ?? 0}</Td>
                        <Td className="truncate">{r.activity.deadline ? new Date(r.activity.deadline).toLocaleString() : '—'}</Td>
                        <Td className="text-center">
                          <span className={chipClass}>
                            {isDelivered ? 'Entregada' : isOverdue ? 'Vencida' : isToday ? 'Hoy' : 'Pendiente'}
                          </span>
                        </Td>
                        <Td className="text-center">
                          <a
                            href={`/dashboard/estudiante/actividad/${r.activity.id}`}
                            className={`inline-flex items-center px-3 py-1 rounded-lg transition
                              ${isDelivered ? 'bg-[#1f2937] hover:bg-[#243042]' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
                            title={isDelivered ? 'Ver entrega' : 'Realizar actividad'}
                          >
                            {isDelivered ? 'Ver' : 'Entregar'}
                          </a>
                        </Td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-6 text-white/70">Sin asignaciones.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        th, td { padding:.65rem .75rem; text-align:left }
      `}</style>
    </DashboardLayout>
  )
}
