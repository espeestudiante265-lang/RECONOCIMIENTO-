// pages/dashboard/estudiante/curso/[id].jsx
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import DashboardLayout from '../../../../components/DashboardLayout'
import { MENU } from '../../../../config/menu'
import { useAuthGuard } from '../../../../lib/auth'
import api from '../../../../lib/api'

const EP = {
  course: (id) => `/api/courses/${id}/`,
  modules: (courseId) => `/api/modules/?course=${courseId}`,
  activities: (moduleId) => `/api/activities/?module=${moduleId}`,
}

export default function CursoDetalle() {
  const { ready, logout } = useAuthGuard(['estudiante'])
  const router = useRouter()
  const { id } = router.query
  const [course, setCourse] = useState(null)
  const [modules, setModules] = useState([])
  const [actsByModule, setActsByModule] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (ready && id) load() }, [ready, id])

  async function load() {
    setLoading(true)
    try {
      const [cRes, mRes] = await Promise.all([
        api.get(EP.course(id)),
        api.get(EP.modules(id)),
      ])
      setCourse(cRes.data)
      const mods = mRes.data || []
      setModules(mods)
      const actsEntries = await Promise.all(mods.map(async (m) => {
        const r = await api.get(EP.activities(m.id))
        return [m.id, r.data || []]
      }))
      setActsByModule(Object.fromEntries(actsEntries))
    } catch (e) {
      console.error(e)
      alert('No se pudo cargar el curso.')
    } finally { setLoading(false) }
  }

  if (!ready || !id) return null

  return (
    <DashboardLayout title={course ? course.name : 'Curso'} menu={MENU.estudiante} onLogout={logout}>
      {loading && <div>Cargando…</div>}
      {!loading && (
        <div className="grid gap-6">
          {modules.map(m => (
            <div key={m.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-lg font-semibold">{m.title}</div>
              <ul className="mt-2 space-y-2">
                {(actsByModule[m.id] || []).map(a => (
                  <li key={a.id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.title}</div>
                      <div className="text-xs text-white/60">
                        Puntos: {a.points} · Límite: {a.deadline ? new Date(a.deadline).toLocaleString() : '—'}
                      </div>
                    </div>
                    <a className="btn btn-primary" href={`/dashboard/estudiante/actividad/${a.id}`}>Abrir</a>
                  </li>
                ))}
                {(actsByModule[m.id] || []).length === 0 && (
                  <li className="text-white/70 text-sm">No hay actividades en este módulo.</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .btn { padding: .4rem .8rem; border-radius: .7rem; background:#222; border:1px solid #333 }
        .btn-primary { background:#2563eb; border-color:#1d4ed8; color:white }
        .btn:hover { border-color:#555 }
      `}</style>
    </DashboardLayout>
  )
}
