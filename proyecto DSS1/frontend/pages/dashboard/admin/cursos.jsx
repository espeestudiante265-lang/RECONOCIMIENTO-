// pages/dashboard/admin/cursos.jsx
import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

function Modal({ open, title, children, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-white/5 opacity-30 blur-sm" />
        <div className="relative bg-[rgba(15,15,20,0.9)] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button onClick={onClose} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15">✕</button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}

// helper para compatibilidad con DRF con/ sin paginación
const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])

export default function AdminCursos() {
  const { ready, logout } = useAuthGuard(['admin'])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)

  const [profs, setProfs] = useState([])
  const [showNew, setShowNew] = useState(false)
  const [showAssign, setShowAssign] = useState(false)
  const [activeCourse, setActiveCourse] = useState(null)

  const [form, setForm] = useState({ code: '', title: '', modules: '' }) // modules CSV
  const [assignProfId, setAssignProfId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      // 1) siempre carga cursos (si falla, mostramos en tabla vacía)
      const { data: c } = await api.get('/api/admin/courses/')
      setCourses(parseList(c))
    } catch (e) {
      if (e?.response?.status === 401) { localStorage.clear(); location.href = '/login' }
      else console.error('Cursos error', e.response?.status, e.response?.data || e.message)
    } finally {
      setLoading(false)
    }

    // 2) profesores (si el endpoint no existe, no rompe la página)
    try {
      const { data: p } = await api.get('/api/admin/courses/professors/')
      setProfs(parseList(p))
    } catch (e) {
      if (e?.response?.status !== 404) {
        console.warn('Professors endpoint:', e.response?.status, e.response?.data || e.message)
      }
    }
  }

  useEffect(() => { if (ready) load() }, [ready])

  const createCourse = async (e) => {
    e.preventDefault()
    const payload = { code: form.code.trim(), title: form.title.trim() }
    try {
      const { data } = await api.post('/api/admin/courses/', payload)
      const list = (form.modules || '').split(',').map(s => s.trim()).filter(Boolean)
      for (const name of list) {
        await api.post(`/api/admin/courses/${data.id}/add_module/`, { name })
      }
      setShowNew(false)
      setForm({ code: '', title: '', modules: '' })
      await load()
    } catch {
      alert('No se pudo crear el curso')
    }
  }

  const deleteCourse = async (id) => {
    if (!confirm('¿Eliminar curso completo?')) return
    try {
      await api.delete(`/api/admin/courses/${id}/`)
      await load()
    } catch { alert('No se pudo eliminar el curso') }
  }

  const addModule = async (courseId) => {
    const name = prompt('Nombre del módulo:')
    if (!name) return
    try {
      await api.post(`/api/admin/courses/${courseId}/add_module/`, { name })
      await load()
    } catch { alert('No se pudo agregar el módulo') }
  }

  const removeModule = async (courseId, mid) => {
    if (!confirm('¿Eliminar módulo?')) return
    try {
      await api.delete(`/api/admin/courses/${courseId}/modules/${mid}/`)
      await load()
    } catch { alert('No se pudo eliminar el módulo') }
  }

  const openAssign = (c) => {
    setActiveCourse(c)
    setAssignProfId(c.professor_id || '')
    setShowAssign(true)
  }

  const saveAssign = async () => {
    if (!activeCourse) return
    try {
      await api.post(`/api/admin/courses/${activeCourse.id}/assign_professor/`, {
        professor_id: assignProfId || null
      })
      setShowAssign(false)
      setActiveCourse(null)
      await load()
    } catch { alert('No se pudo asignar el profesor') }
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Cursos" menu={MENU.admin} onLogout={logout}>
      <div className="grid gap-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Gestión de cursos</h2>
            <p className="text-white/60 text-sm">Crea cursos, asigna profesor y administra módulos</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowNew(true)}
              className="px-5 py-2 rounded-xl bg-primary hover:opacity-90"
            >
              + Nuevo curso
            </button>
          </div>
        </div>

        {/* Card tabla */}
        <div className="relative rounded-2xl border border-white/10">
          <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-white/0 opacity-20 blur-sm" />
          <div className="relative p-4">
            <div className="overflow-auto rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-white/5">
                  <tr>
                    <th className="text-left p-3">Código</th>
                    <th className="text-left p-3">Curso</th>
                    <th className="text-left p-3">Profesor</th>
                    <th className="text-left p-3">Módulos</th>
                    <th className="text-left p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(courses) && courses.map(c => (
                    <tr key={c.id} className="border-t border-white/10">
                      <td className="p-3 font-mono">{c.code}</td>
                      <td className="p-3">{c.title || c.name}</td>
                      <td className="p-3">
                        {c.professor_username || c.professor?.username || <span className="text-white/50">—</span>}
                        <button
                          onClick={() => openAssign(c)}
                          className="ml-3 text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15"
                        >
                          {(c.professor_username || c.professor?.username) ? 'Cambiar' : 'Asignar'}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {(c.modules || []).map(m => (
                            <span key={m.id} className="inline-flex items-center gap-2 px-2 py-1 rounded-lg bg-white/10">
                              {m.name}
                              <button onClick={() => removeModule(c.id, m.id)} className="text-white/60 hover:text-white">✕</button>
                            </span>
                          ))}
                          <button onClick={() => addModule(c.id)} className="text-xs px-2 py-1 rounded-lg bg-secondary hover:opacity-90">
                            + módulo
                          </button>
                        </div>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => deleteCourse(c.id)}
                          className="px-3 py-1 rounded-lg bg-red-600/80 hover:bg-red-600"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!courses.length && !loading && (
                    <tr><td colSpan={5} className="p-6 text-center text-white/60">No hay cursos aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal crear */}
      <Modal open={showNew} title="Nuevo curso" onClose={() => setShowNew(false)}>
        <form onSubmit={createCourse} className="space-y-4">
          <div>
            <div className="text-xs text-white/70 mb-1">Código</div>
            <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none"
              value={form.code} onChange={e=>setForm(f=>({...f, code:e.target.value}))} required />
          </div>
          <div>
            <div className="text-xs text-white/70 mb-1">Nombre del curso</div>
            <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none"
              value={form.title} onChange={e=>setForm(f=>({...f, title:e.target.value}))} required />
          </div>
          <div>
            <div className="text-xs text-white/70 mb-1">Módulos (separados por coma)</div>
            <input className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none"
              placeholder="Unidad 1, Unidad 2, ..."
              value={form.modules} onChange={e=>setForm(f=>({...f, modules:e.target.value}))} />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={()=>setShowNew(false)} className="px-4 py-2 rounded-lg bg-white/10">Cancelar</button>
            <button className="px-4 py-2 rounded-lg bg-primary hover:opacity-90">Crear</button>
          </div>
        </form>
      </Modal>

      {/* Modal asignar profesor */}
      <Modal open={showAssign} title="Asignar profesor" onClose={()=>setShowAssign(false)}>
        <div className="space-y-4">
          <div>
            <div className="text-xs text-white/70 mb-1">Profesor</div>
            <select
              className="dropdown-select w-full bg-white/5 rounded-lg px-3 py-2"
              value={assignProfId}
              onChange={e=>setAssignProfId(e.target.value)}
            >
              <option value="">— Sin profesor —</option>
              {profs.map(p => (
                <option key={p.id} value={p.id}>
                  {p.username} {p.email ? `(${p.email})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={()=>setShowAssign(false)} className="px-4 py-2 rounded-lg bg-white/10">Cancelar</button>
            <button onClick={saveAssign} className="px-4 py-2 rounded-lg bg-primary hover:opacity-90">Guardar</button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}
