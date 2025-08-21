// pages/dashboard/estudiante/notas.jsx
import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

const EP = {
  enrollmentsMine: '/api/enrollments/mine/',
  course: (id) => `/api/courses/${id}/`,
  modules: (courseId) => `/api/modules/?course=${courseId}`,
  actsByModule: (moduleId) => `/api/activities/?module=${moduleId}`,
  actsByCourseParam: (courseId) => `/api/activities/?course=${courseId}`,
  actsNested: (courseId) => `/api/courses/${courseId}/activities/`,
  actsAll: '/api/activities/',
  submissions: '/api/submissions/',
  attendanceMine: '/api/attendance/mine/',
}

const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])
const getId = (x) => (x?.id ?? x?.pk ?? x)
const sameId = (a, b) => Number(getId(a)) === Number(getId(b))
async function safeGet(url) { try { const r = await api.get(url); return {ok:true, data:r.data} } catch { return {ok:false, data:null} } }

function StatCard({ label, value, progress = null }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,.25)]">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  )
}
function Th({ children, className='' }) { return <th className={`text-xs uppercase tracking-wide ${className}`}>{children}</th> }
function Td({ children, className='' }) { return <td className={`align-middle ${className}`}>{children}</td> }

export default function Notas() {
  const { ready, user, logout } = useAuthGuard(['estudiante'])
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [attendancePct, setAttendancePct] = useState(0)

  useEffect(() => { if (ready) load() }, [ready])

  async function fetchActivitiesForCourse(courseId) {
    const modsRes = await safeGet(EP.modules(courseId))
    const modules = parseList(modsRes.data || [])
    let acts = []
    for (const m of modules) {
      const res = await safeGet(EP.actsByModule(getId(m)))
      acts = acts.concat(parseList(res.data) || [])
    }
    if (!acts.length) {
      const nested = await safeGet(EP.actsNested(courseId))
      if (nested.ok) acts = parseList(nested.data)
    }
    if (!acts.length) {
      const direct = await safeGet(EP.actsByCourseParam(courseId))
      if (direct.ok) acts = parseList(direct.data)
    }
    if (!acts.length) {
      const all = await safeGet(EP.actsAll)
      acts = parseList(all.data).filter(a => sameId(a.course, courseId) || sameId(a.course_id, courseId))
    }
    return acts
  }

  async function load() {
    setLoading(true)
    try {
      const [enr, subs, att] = await Promise.all([
        safeGet(EP.enrollmentsMine),
        safeGet(EP.submissions),
        safeGet(EP.attendanceMine),
      ])

      const mySubs = parseList(subs.data).filter(s => Number(getId(s.student) ?? s.student_id) === Number(user?.id))

      const attRows = parseList(att.data)
      const present = attRows.filter(s => (typeof s.present === 'boolean') ? s.present : Number(s.score ?? s.attention ?? s.attention_score ?? 0) >= 50).length
      setAttendancePct(attRows.length ? Math.round((present / attRows.length) * 100) : 0)

      const out = []
      for (const e of parseList(enr.data)) {
        const courseId = getId(e.course)
        const cRes = await safeGet(EP.course(courseId))
        const course = cRes.ok ? cRes.data : { id:courseId, name:`(curso ${courseId})` }
        const acts = await fetchActivitiesForCourse(courseId)

        for (const a of acts) {
          const sub = mySubs.find(s => sameId(s.activity, a.id) || sameId(s.activity_id, a.id))
          const grade = Number(sub?.grade ?? sub?.score ?? sub?.grade_percent ?? 0)
          out.push({ course, activity:a, grade })
        }
      }
      setRows(out)
    } finally { setLoading(false) }
  }

  const calc = useMemo(() => {
    const totalPoints = rows.reduce((acc, r) => acc + (Number(r.activity.points) || 0), 0)
    const gotPoints = rows.reduce((acc, r) => acc + Math.min(Number(r.grade)||0, Number(r.activity.points)||0), 0)
    const actividadesPct = totalPoints ? Math.round((gotPoints / totalPoints) * 100) : 0
    const notaFinal = Math.round(actividadesPct * 0.7 + attendancePct * 0.3)
    return { actividadesPct, notaFinal }
  }, [rows, attendancePct])

  if (!ready) return null

  return (
    <DashboardLayout title="Notas" menu={MENU.estudiante} onLogout={logout}>
      <div className="grid gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          <StatCard label="Actividades (70%)" value={`${calc.actividadesPct}%`} progress={calc.actividadesPct} />
          <StatCard label="Asistencia (30%)" value={`${attendancePct}%`} progress={attendancePct} />
          <StatCard label="Nota final" value={calc.notaFinal} />
        </div>

        {loading && <div>Cargando…</div>}

        {!loading && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white/10 sticky top-0 backdrop-blur">
                  <tr>
                    <Th className="w-[28%]">Curso</Th>
                    <Th className="w-[44%]">Actividad</Th>
                    <Th className="w-[14%] text-center">Puntos</Th>
                    <Th className="w-[14%] text-center">Mi nota</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-white/10 odd:bg-white/[0.02] hover:bg-white/5">
                      <Td className="truncate">{r.course.name ?? r.course.title ?? '—'}</Td>
                      <Td className="truncate">{r.activity.title}</Td>
                      <Td className="text-center">{r.activity.points ?? 0}</Td>
                      <Td className="text-center">{Number.isFinite(r.grade) ? r.grade : '-'}</Td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-6 text-white/70">Sin actividades.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <style jsx>{` th, td { padding:.65rem .75rem; text-align:left } `}</style>
    </DashboardLayout>
  )
}
