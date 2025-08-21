import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

export default function ProfesorDashboardCursos() {
  const { ready, logout } = useAuthGuard(['profesor'])

  // data
  const [cursos, setCursos] = useState([])
  const [modulesByCourse, setModulesByCourse] = useState({})
  const [studentsByCourse, setStudentsByCourse] = useState({}) // {courseId: [{student_id, student?}]}
  const [allStudents, setAllStudents] = useState([])            // fallback catálogo
  const [candidatesByCourse, setCandidatesByCourse] = useState({}) // {courseId: []}

  // ui
  const [form, setForm] = useState({ name: '', code: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [rowOk, setRowOk] = useState({})   // { [courseId]: "mensaje ok" }
  const [adding, setAdding] = useState({}) // { [courseId]: boolean }  // desactiva botón Agregar

  const [openStudents, setOpenStudents] = useState({})
  const [rowError, setRowError] = useState({})
  const [addModuleOpen, setAddModuleOpen] = useState({})
  const [addModuleName, setAddModuleName] = useState({})
  const [addStudentOpen, setAddStudentOpen] = useState({})
  const [pickerValue, setPickerValue] = useState({})

  // endpoints
  const EP = {
    // cursos
    list: '/api/prof/courses/',
    listAlt: '/api/courses/?mine=1',
    create: '/api/prof/courses/',
    createAlt: '/api/courses/',
    del: (id) => `/api/prof/courses/${id}/`,
    delAlt: (id) => `/api/courses/${id}/`,
    // módulos
    addModule: (courseId) => `/api/courses/${courseId}/add_module/`,
    listModules: (courseId) => `/api/modules/?course=${courseId}`,
    // estudiantes (lectura por curso + candidatos)
    students: (courseId) => `/api/prof/courses/${courseId}/students/`,
    candidates: (courseId) => `/api/prof/courses/${courseId}/candidates/`,
    // matrículas
    enroll: '/api/prof/enrollments/',
    enrollAlt: '/api/enrollments/',
    listEnrollments: (courseId) => `/api/enrollments/?course=${courseId}`,
    // catálogo (fallback)
    listStudentsA: '/api/admin/users/?role=estudiante',
    listStudentsB: '/api/users/?role=estudiante',
  }

  // helpers
  const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])

  const safeName = (u) => {
    if (!u) return ''
    const fn = (`${u.first_name || ''} ${u.last_name || ''}`).trim()
    return u.full_name?.trim?.() || (fn || u.username || u.email || `#${u.id}`)
  }

  // índice ID -> objeto estudiante
  const indexStudents = useMemo(() => {
    const m = new Map()
    for (const s of allStudents) m.set(s.id, s)
    return m
  }, [allStudents])

  async function fetchAllStudents() {
    try {
      // intenta admin (puede fallar)
      try {
        const r = await api.get(EP.listStudentsA)
        setAllStudents(parseList(r.data))
        return
      } catch {}
      // fallback estándar
      const r2 = await api.get(EP.listStudentsB)
      setAllStudents(parseList(r2.data))
    } catch (e) {
      console.warn('No se pudo listar estudiantes', e?.response?.data || e.message)
      setAllStudents([])
    }
  }

  function normalizeEnrollments(arr) {
    return parseList(arr).map((e, i) => {
      let student_id = null
      let student = undefined
      if (typeof e === 'number') {
        student_id = e
      } else if (e?.student && typeof e.student === 'number') {
        student_id = e.student
      } else if (e?.student?.id) {
        student_id = e.student.id
        student = e.student
      } else if (e?.student_id) {
        student_id = e.student_id
      }
      return { id: e?.id ?? `enr-${student_id ?? i}`, student_id, student }
    })
  }

  async function fetchEnrollmentsFor(courseId) {
    // mejor: /students/ (ya trae nombres y filtra profesor)
    try {
      const rs = await api.get(EP.students(courseId))
      const list = parseList(rs.data).map((st, i) => ({
        id: st.id ?? `st-${i}`,
        student_id: st.id,
        student: st,
      }))
      setStudentsByCourse(prev => ({ ...prev, [courseId]: list }))
      return
    } catch {}
    // fallback
    try {
      const re = await api.get(EP.listEnrollments(courseId))
      setStudentsByCourse(prev => ({ ...prev, [courseId]: normalizeEnrollments(re.data) }))
    } catch (e) {
      console.warn('No se pudo listar matrículas del curso', courseId, e?.response?.data || e.message)
      setStudentsByCourse(prev => ({ ...prev, [courseId]: [] }))
    }
  }

  async function fetchCandidatesFor(courseId) {
    try {
      const r = await api.get(EP.candidates(courseId))
      setCandidatesByCourse(prev => ({ ...prev, [courseId]: parseList(r.data) }))
    } catch (e) {
      // fallback: usar catálogo general y filtrar los inscritos
      try {
        if (!allStudents.length) await fetchAllStudents()
        const enrolled = new Set((studentsByCourse[courseId] || []).map(s => Number(s.student_id)))
        const cand = allStudents.filter(s => !enrolled.has(Number(s.id)))
        setCandidatesByCourse(prev => ({ ...prev, [courseId]: cand }))
      } catch {
        setCandidatesByCourse(prev => ({ ...prev, [courseId]: [] }))
      }
    }
  }

  const fetchCursos = async () => {
    setLoading(true); setError(null)
    try {
      let list = []
      try {
        const { data } = await api.get(EP.list)
        list = parseList(data)
      } catch (e) {
        const { data } = await api.get(EP.listAlt)
        list = parseList(data) || []
      }
      setCursos(list)

      // módulos
      const entries = await Promise.all(list.map(async (c) => {
        try {
          const { data } = await api.get(EP.listModules(c.id))
          return [c.id, parseList(data)]
        } catch { return [c.id, c.modules || []] }
      }))
      setModulesByCourse(Object.fromEntries(entries))

      // estudiantes por curso
      await Promise.all(list.map(c => fetchEnrollmentsFor(c.id)))

      // catálogo (fallback para resolver nombres y candidatos si hiciera falta)
      await fetchAllStudents()
    } catch (e) {
      console.error('Cursos profesor:', e.response?.status, e.response?.data || e.message)
      setError('No se pudieron cargar los cursos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (ready) fetchCursos() }, [ready])

  // acciones
  const createCurso = async (e) => {
    e.preventDefault()
    setError(null)
    const payload = { name: form.name.trim(), code: form.code.trim() }
    if (!payload.name || !payload.code) return
    try {
      try { await api.post(EP.create, payload) }
      catch { await api.post(EP.createAlt, payload) }
      setForm({ name: '', code: '' })
      fetchCursos()
    } catch (e) {
      setError(
        e?.response?.data?.detail ||
        e?.response?.data?.name?.[0] ||
        e?.response?.data?.code?.[0] ||
        'Error al crear curso'
      )
    }
  }

  const deleteCurso = async (id) => {
    if (!confirm('¿Eliminar curso?')) return
    try {
      try { await api.delete(EP.del(id)) }
      catch { await api.delete(EP.delAlt(id)) }
      setCursos(prev => prev.filter(c => c.id !== id))
      setModulesByCourse(prev => { const copy = { ...prev }; delete copy[id]; return copy })
      setStudentsByCourse(prev => { const copy = { ...prev }; delete copy[id]; return copy })
    } catch {
      alert('No se pudo eliminar')
    }
  }

  const setOpenStudentsRow = (cid, open) => setOpenStudents(prev => ({ ...prev, [cid]: open }))

  const createModule = async (courseId) => {
    const name = (addModuleName[courseId] || '').trim()
    if (!name) {
      setRowError(prev => ({ ...prev, [courseId]: 'Ingresa el nombre del módulo' }))
      return
    }
    try {
      await api.post(EP.addModule(courseId), { name })
      setAddModuleName(prev => ({ ...prev, [courseId]: '' }))
      setAddModuleOpen(prev => ({ ...prev, [courseId]: false }))
      const { data } = await api.get(EP.listModules(courseId))
      setModulesByCourse(prev => ({ ...prev, [courseId]: parseList(data) }))
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message
      setRowError(prev => ({ ...prev, [courseId]: 'No se pudo crear el módulo: ' + msg }))
    }
  }

  // >>> AJUSTE: refresca inscritos + candidatos al abrir el picker
  const toggleAddStudent = async (cid, open) => {
    setAddStudentOpen(prev => ({ ...prev, [cid]: open }))
    if (open) {
      await fetchEnrollmentsFor(cid)
      await fetchCandidatesFor(cid)
    }
  }

  const addStudent = async (cid) => {
    const student = pickerValue[cid]
    if (!student) return

    setRowError(prev => ({ ...prev, [cid]: null }))
    setRowOk(prev => ({ ...prev, [cid]: null }))
    setAdding(prev => ({ ...prev, [cid]: true }))

    try {
      // intenta endpoint de profesor, si falla usa el alterno
      try {
        await api.post(EP.enroll, { course: cid, student: Number(student) })
      } catch {
        await api.post(EP.enrollAlt, { course: cid, student: Number(student) })
      }

      // feedback OK
      setRowOk(prev => ({ ...prev, [cid]: 'Estudiante agregado ✅' }))

      // actualización local inmediata (mueve del combo -> a la lista)
      const stuObj =
        (candidatesByCourse[cid] || []).find(u => Number(u.id) === Number(student)) ||
        (allStudents || []).find(u => Number(u.id) === Number(student)) ||
        { id: Number(student) }

      setStudentsByCourse(prev => ({
        ...prev,
        [cid]: [...(prev[cid] || []), { id: `enr-${student}`, student_id: Number(student), student: stuObj }]
      }))
      setCandidatesByCourse(prev => ({
        ...prev,
        [cid]: (prev[cid] || []).filter(u => Number(u.id) !== Number(student))
      }))

      // limpiar y cerrar UI
      setPickerValue(prev => ({ ...prev, [cid]: '' }))
      toggleAddStudent(cid, false)

      // refrescos reales (opcional pero recomendado)
      await fetchEnrollmentsFor(cid)
      await fetchCandidatesFor(cid)

      // borra el mensaje ok a los 2s
      setTimeout(() => setRowOk(prev => ({ ...prev, [cid]: null })), 2000)
    } catch (e) {
      const msg = e?.response?.data?.detail
        || e?.response?.data?.student?.[0]
        || e?.response?.data?.course?.[0]
        || e.message
      setRowError(prev => ({ ...prev, [cid]: 'No se pudo agregar: ' + msg }))
    } finally {
      setAdding(prev => ({ ...prev, [cid]: false }))
    }
  }

  // UI helpers
  const studentLabel = (rec) => {
    if (rec?.student) return safeName(rec.student)
    const st = indexStudents.get(rec?.student_id)
    return safeName(st) || `#${rec?.student_id ?? ''}`
  }

  const candidatesForCourse = (courseId) => {
    return candidatesByCourse[courseId] || []
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Cursos (CRUD)" menu={MENU.profesor} onLogout={logout}>
      <div className="grid md:grid-cols-3 gap-6">

        
        {/* Crear curso */}
        {/*<form onSubmit={createCurso} className="p-4 rounded-2xl border border-white/10 bg-[#0b1220] space-y-3 shadow-[0_4px_24px_rgba(0,0,0,.25)]">
          <div className="font-semibold text-lg">Nuevo curso</div>

          <input
            className="w-full rounded-xl px-3 py-2 border border-white/10 bg-[#111827] text-white placeholder-white/50"
            placeholder="Nombre del curso"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
          />

          <input
            className="w-full rounded-xl px-3 py-2 border border-white/10 bg-[#111827] text-white placeholder-white/50"
            placeholder="Código (ej. DG-101)"
            value={form.code}
            onChange={e => setForm({ ...form, code: e.target.value })}
            required
          />

          <button className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition disabled:opacity-60" disabled={loading}>
            {loading ? 'Procesando…' : 'Crear'}
          </button>

          {error && <div className="text-red-400 text-sm">{error}</div>}
        </form> */}

        {/* Mis cursos */}
        <div className="md:col-span-2 p-4 rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_4px_24px_rgba(0,0,0,.25)]">
          <div className="flex items-center justify-between mb-3">
            <div className="font-semibold text-lg">Mis cursos</div>
            <button onClick={fetchCursos} className="text-sm px-3 py-1 rounded-lg bg-[#1f2937] hover:bg-[#243042] transition" disabled={loading}>
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
          </div>

          {loading ? <div>Cargando…</div> : (
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr>
                  <th className="text-left py-2">Curso</th>
                  <th className="text-left py-2">Código</th>
                  <th className="text-left py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cursos.map(c => {
                  const mods = modulesByCourse[c.id] || []
                  const enrolls = studentsByCourse[c.id] || []
                  const rowErr = rowError[c.id]
                  const openList = !!openStudents[c.id]

                  // >>> AJUSTE: normaliza ids y filtra candidatos contra inscritos
                  const enrolledIds = new Set(enrolls.map(s => Number(s.student_id)))
                  const candsRaw = (candidatesForCourse(c.id) || []).map(u => ({ ...u, id: Number(u.id) }))
                  const cands = candsRaw.filter(u => !enrolledIds.has(Number(u.id)))  // filtra ya inscritos
                  const okMsg  = rowOk[c.id]  // mensaje “Agregado ✅” por curso

                  return (
                    <tr key={c.id} className="border-t border-white/10 align-top">
                      <td className="py-2">
                        <div className="font-medium text-base">{c.name}</div>
                        <div className="text-xs text-white/50">ID: {c.id}</div>

                        {/* Módulos */}
                        <div className="mt-3">
                          <div className="text-xs text-white/60 mb-1">Módulos</div>
                          {mods.length ? (
                            <ul className="list-disc ml-5 space-y-1">{mods.map(m => <li key={m.id || m.title}>{m.title || m.name || `Módulo ${m.id}`}</li>)}</ul>
                          ) : <div className="text-xs text-white/40">Aún no hay módulos.</div>}

                          {!addModuleOpen[c.id] ? (
                            <button
                              onClick={() => setAddModuleOpen(p => ({...p,[c.id]:true}))}
                              className="mt-2 px-2 py-1 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-500 transition"
                            >
                              + Agregar módulo
                            </button>
                          ) : (
                            <div className="mt-2 flex items-center gap-2">
                              <input
                                value={addModuleName[c.id] || ''}
                                onChange={e => setAddModuleName(prev => ({ ...prev, [c.id]: e.target.value }))}
                                placeholder="Nombre del módulo"
                                className="border border-white/10 rounded-lg px-2 py-1 text-sm bg-[#111827] text-white placeholder-white/40"
                              />
                              <button onClick={() => createModule(c.id)}
                                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs">Crear</button>
                              <button onClick={() => setAddModuleOpen(p => ({...p,[c.id]:false}))}
                                      className="px-2 py-1 rounded-lg bg-white text-black text-xs">Cancelar</button>
                            </div>
                          )}
                        </div>

                        {/* Estudiantes */}
                        <div className="mt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-white/60">Estudiantes</span>
                            <span className="text-xs opacity-70">({enrolls.length})</span>
                            {!openList ? (
                              <button onClick={() => setOpenStudentsRow(c.id, true)}
                                      className="text-xs px-2 py-1 rounded-lg bg-[#1f2937] hover:bg-[#243042] transition">Ver lista</button>
                            ) : (
                              <button onClick={() => setOpenStudentsRow(c.id, false)}
                                      className="text-xs px-2 py-1 rounded-lg bg-[#1f2937] hover:bg-[#243042] transition">Ocultar</button>
                            )}
                          </div>

                          {openList && (
                            <ul className="mt-2 ml-5 list-disc space-y-1">
                              {enrolls.map(e => (
                                <li key={e.id}>{studentLabel(e)}</li>
                              ))}
                              {!enrolls.length && <li className="text-xs text-white/40">Sin estudiantes</li>}
                            </ul>
                          )}

                          {!addStudentOpen[c.id] ? (
                            <button
                              onClick={() => toggleAddStudent(c.id, true)}
                              className="mt-2 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                            >
                              + Agregar estudiante
                            </button>
                          ) : (
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              <select
                                className="dropdown-select border border-white/10 rounded-lg px-3 py-2 text-sm bg-[#111827] text-white"
                                value={pickerValue[c.id] || ''}
                                onChange={e => {
                                  const v = e.target.value === '' ? '' : Number(e.target.value)
                                  setPickerValue(p => ({ ...p, [c.id]: v }))
                                }}
                                style={{ minWidth: 260 }}
                              >
                                <option value="">— Selecciona estudiante —</option>
                                {cands.length === 0 && (
                                  <option value="" disabled>(No hay candidatos disponibles)</option>
                                )}
                                {cands.map(u => (
                                  <option key={u.id} value={u.id}>{safeName(u)}</option>
                                ))}
                              </select>
                              <button
                                onClick={() => addStudent(c.id)}
                                disabled={!!adding[c.id]}
                                className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs">
                                {adding[c.id] ? 'Agregando…' : 'Agregar'}
                              </button>

                              <button onClick={() => toggleAddStudent(c.id, false)}
                                      className="px-2 py-1 rounded-lg bg-white text-black text-xs">Cancelar</button>
                            </div>
                          )}
                        </div>

                        {okMsg && <div className="text-emerald-400 text-xs mt-2">{okMsg}</div>}
                        {rowErr && <div className="text-red-400 text-xs mt-2">{rowErr}</div>}
                      </td>

                      <td className="py-2">{c.code}</td>
                      <td className="py-2 space-x-3">
                        <button onClick={() => deleteCurso(c.id)} className="px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!cursos.length && (
                  <tr><td colSpan={3} className="py-6 text-center text-white/60">Sin cursos</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
