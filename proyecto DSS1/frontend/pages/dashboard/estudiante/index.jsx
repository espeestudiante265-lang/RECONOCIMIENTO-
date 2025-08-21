// pages/dashboard/estudiante/index.jsx
import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// Endpoints base
const EP = {
  enrollmentsMine: '/api/enrollments/mine/',
  enrollments: '/api/enrollments/',
  // intentos para listar cursos
  coursesCandidates: [
    '/api/courses/',           // público / estándar
    '/api/prof/courses/',      // a veces lo exponen así
    '/api/admin/courses/',     // último intento (si GET está abierto)
  ],
  // helpers
  courseDetailCandidates: (id) => [
    `/api/courses/${id}/`,
    `/api/prof/courses/${id}/`,
    `/api/admin/courses/${id}/`,
  ],
}

// Util: intenta varias rutas hasta que una funcione
async function tryGetOne(urls) {
  const errs = []
  for (const url of urls) {
    try {
      const r = await api.get(url)
      return { ok: true, url, data: r.data }
    } catch (e) {
      errs.push({ url, status: e?.response?.status, data: e?.response?.data })
    }
  }
  return { ok: false, errs }
}
const parseList = (d) => (Array.isArray(d) ? d : (d?.results ?? []))

export default function EstudianteHome() {
  const { ready, user, logout } = useAuthGuard(['estudiante'])
  const [loading, setLoading] = useState(true)
  const [mine, setMine] = useState([])            // [{ enrollment_id, course }]
  const [allCourses, setAllCourses] = useState([]) // lista de cursos
  const [error, setError] = useState(null)

  useEffect(() => { if (ready) load() }, [ready])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // 1) Intentamos listar TODOS los cursos (para "Explorar")
      const cList = await tryGetOne(EP.coursesCandidates)
      if (!cList.ok) {
        setAllCourses([])
        setError('No se pudo obtener la lista de cursos: ' + JSON.stringify(cList.errs))
      } else {
        setAllCourses(parseList(cList.data))
      }

      // 2) Traemos mis matrículas
      const mineRes = await api.get(EP.enrollmentsMine).catch(e => {
        throw new Error('enrollments/mine: ' + (e?.response?.status || e.message))
      })
      const enrollments = mineRes.data || []

      // 3) Para cada matrícula, buscamos el detalle de curso probando varias rutas
      const detailed = []
      for (const e of enrollments) {
        let courseData = null
        const attempts = EP.courseDetailCandidates(e.course)
        const det = await tryGetOne(attempts)
        if (det.ok) courseData = det.data
        if (courseData) detailed.push({ enrollment_id: e.id, course: courseData })
      }
      setMine(detailed)
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setLoading(false)
    }
  }

  async function enroll(courseId) {
    try {
      await api.post(EP.enrollments, { course: Number(courseId), student: user.id })
      await load()
    } catch (e) {
      // suaviza el caso de duplicado
      if (e?.response?.status === 400 && /unique/i.test(JSON.stringify(e.response.data))) {
        await load()
        return
      }
      const msg = e?.response?.data ? safeMsg(e.response.data) : e.message
      alert('No se pudo matricular: ' + msg)
    }
  }

  async function unenroll(enrollmentId) {
    if (!confirm('¿Deseas salir de este curso?')) return
    try {
      await api.delete(`${EP.enrollments}${enrollmentId}/`)
      await load()
    } catch (e) {
      const msg = e?.response?.data ? safeMsg(e.response.data) : e.message
      alert('No se pudo desmatricular: ' + msg)
    }
  }

  const enrolledIds = new Set(mine.map(m => m.course?.id))
  if (!ready) return null

  return (
    <DashboardLayout title="Estudiante" menu={MENU.estudiante} onLogout={logout}>
      <div className="grid gap-8">
        {error && (
          <div className="p-3 rounded-md bg-[#2b1b1b] border border-red-500/40 text-sm">
            <div className="font-semibold mb-1">Aviso</div>
            <pre className="whitespace-pre-wrap opacity-80">{error}</pre>
          </div>
        )}

        <section>
          <h2 className="text-xl font-semibold mb-3">Mis cursos</h2>
          {loading && <div>Cargando…</div>}
          {!loading && mine.length === 0 && <Empty>Aún no estás matriculado en ningún curso.</Empty>}
          <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {mine.map(({ enrollment_id, course }) => (
              <Card key={course.id}>
                <div className="text-sm text-white/60">Código {course.code ?? course.id}</div>
                <div className="text-lg font-medium">{course.name ?? course.title ?? '(sin nombre)'}</div>
                <div className="mt-3 flex gap-2">
                  <a className="btn btn-primary" href={`/dashboard/estudiante/curso/${course.id}`}>Entrar</a>
                  <button className="btn" onClick={() => unenroll(enrollment_id)}>Salir</button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Explorar cursos</h2>
          {loading && <div>Cargando…</div>}
          {!loading && (
            <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
              {allCourses.filter(c => !enrolledIds.has(c.id)).map(c => (
                <Card key={c.id}>
                  <div className="text-sm text-white/60">Código {c.code ?? c.id}</div>
                  <div className="text-lg font-medium">{c.name ?? c.title ?? '(sin nombre)'}</div>
                  <div className="mt-3">
                    <button className="btn btn-primary" onClick={() => enroll(c.id)}>Matricularme</button>
                  </div>
                </Card>
              ))}
              {allCourses.length === 0 && (
                <Empty>No hay cursos disponibles para explorar.</Empty>
              )}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .btn { padding: .5rem .9rem; border-radius: .75rem; background:#222; border:1px solid #333 }
        .btn-primary { background:#2563eb; border-color:#1d4ed8; color:white }
        .btn:hover { border-color:#555 }
      `}</style>
    </DashboardLayout>
  )
}

function Card({ children }) {
  return <div className="p-4 rounded-xl bg-white/5 border border-white/10">{children}</div>
}
function Empty({ children }) {
  return <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-white/70">{children}</div>
}

// --- helpers de error HTML → string plano
function safeMsg(data) {
  try {
    if (typeof data === 'string') {
      // si viene HTML del debug de Django, corta el <title>…</title>
      const m = data.match(/<title>([^<]+)<\/title>/i)
      return m ? m[1] : data.slice(0, 200)
    }
    return JSON.stringify(data)
  } catch { return 'Error' }
}
