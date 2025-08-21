// frontend/pages/dashboard/admin/index.jsx
import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// roles base (si el backend trae otros, se agregan dinámicamente)
const DEFAULT_ROLES = ['profesor', 'estudiante', 'admin']

export default function AdminUsuarios() {
  const { ready, logout } = useAuthGuard(['admin'])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)

  // búsqueda / orden
  const [q, setQ] = useState('')
  const [sortKey, setSortKey] = useState('id')
  const [sortDir, setSortDir] = useState('asc') // 'asc' | 'desc'

  // creación
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'profesor',
    is_active: true,
    password: ''
  })

  // edición
  const [editing, setEditing] = useState(null) // id en edición
  const [editData, setEditData] = useState({
    first_name: '', last_name: '', email: '', role: 'estudiante', is_active: true, password: ''
  })
  const [saving, setSaving] = useState(false)

  // roles disponibles (incluye los que vengan del backend)
  const ROLES = useMemo(() => {
    const rolesFromUsers = Array.from(new Set(users.map(u => u.role).filter(Boolean)))
    return Array.from(new Set([...DEFAULT_ROLES, ...rolesFromUsers]))
  }, [users])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/admin/users/')
      setUsers(Array.isArray(data) ? data : [])
    } catch (e) {
      if (e?.response?.status === 401) { localStorage.clear(); location.href = '/login' }
      else alert('No se pudo cargar la lista.')
    } finally { setLoading(false) }
  }

  useEffect(() => { if (ready) load() }, [ready])

  const resetCreate = () => setForm({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    role: 'profesor',
    is_active: true,
    password: ''
  })

  const createUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.post('/api/admin/users/', form)
      resetCreate()
      await load()
    } catch (e) {
      const p = e?.response?.data
      const msg = p?.detail || firstError(p) || 'No se pudo crear el usuario.'
      alert(msg)
    } finally { setCreating(false) }
  }

  const startEdit = (u) => {
    setEditing(u.id)
    setEditData({
      first_name: u.first_name || '',
      last_name:  u.last_name  || '',
      email:      u.email      || '',
      role:       ROLES.includes(u.role) ? u.role : 'estudiante',
      is_active:  typeof u.is_active === 'boolean' ? u.is_active : true,
      password:   ''
    })
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      // PATCH parcial: solo mandamos lo que tenemos en editData
      await api.patch(`/api/admin/users/${id}/`, editData)
      setEditing(null)
      await load()
    } catch (e) {
      const p = e?.response?.data
      const msg = p?.detail || firstError(p) || 'No se pudo guardar los cambios.'
      alert(msg)
    } finally { setSaving(false) }
  }

  const removeUser = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return
    try {
      await api.delete(`/api/admin/users/${id}/`)
      await load()
    } catch (e) {
      alert(e?.response?.data?.detail || 'No se pudo eliminar.')
    }
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    let rows = users
    if (needle) {
      rows = rows.filter(u => {
        const hay = [
          u.username, u.email, u.role, u.first_name, u.last_name
        ].map(x => (x || '').toString().toLowerCase()).join(' ')
        return hay.includes(needle)
      })
    }
    const get = (u) => {
      const v = u[sortKey]
      // fechas: ordenar por valor de fecha si son strings ISO
      if (['last_login', 'date_joined'].includes(sortKey)) {
        return v ? new Date(v).getTime() : 0
      }
      // booleans
      if (typeof v === 'boolean') return v ? 1 : 0
      // strings / números
      return (v ?? '').toString().toLowerCase()
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return rows.slice().sort((a, b) => (get(a) > get(b) ? 1 : get(a) < get(b) ? -1 : 0) * dir)
  }, [users, q, sortKey, sortDir])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const fmtDate = (d) => {
    if (!d) return '-'
    const dt = new Date(d)
    if (isNaN(dt)) return String(d)
    return dt.toLocaleString()
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Usuarios" menu={MENU.admin} onLogout={logout}>
      {/* Barra superior: buscar + refrescar */}
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <input
          placeholder="Buscar por nombre, usuario, email o rol…"
          className="bg-white/5 rounded-lg px-3 py-2 min-w-[260px]"
          value={q}
          onChange={e => setQ(e.target.value)}
        />
        <button onClick={load} className="px-3 py-2 rounded-lg bg-white/10">Refrescar</button>
        <span className="text-sm text-white/60 ml-auto">
          {loading ? 'Cargando…' : `${filtered.length} de ${users.length}`}
        </span>
      </div>

      {/* Crear usuario */}
      <div className="mb-6">
        <form onSubmit={createUser} className="flex flex-wrap gap-3 items-end">
          <Field label="Usuario">
            <input className="bg-white/5 rounded-lg px-3 py-2"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required />
          </Field>

          <Field label="Nombres">
            <input className="bg-white/5 rounded-lg px-3 py-2"
              value={form.first_name}
              onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              required />
          </Field>

          <Field label="Apellidos">
            <input className="bg-white/5 rounded-lg px-3 py-2"
              value={form.last_name}
              onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              required />
          </Field>

          <Field label="Email">
            <input type="email" className="bg-white/5 rounded-lg px-3 py-2"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </Field>

          <Field label="Rol">
            <select
              className="dropdown-select bg-white/5 rounded-lg px-3 py-2"
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>

          <Field label="Activo">
            <input type="checkbox"
              className="w-5 h-5 align-middle"
              checked={form.is_active}
              onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
            />
          </Field>

          <Field label="Password">
            <input type="text" className="bg-white/5 rounded-lg px-3 py-2"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required />
          </Field>

          <button disabled={creating} className="px-4 py-2 rounded-lg bg-[#5b87f5]">
            {creating ? 'Creando…' : '+ Nuevo usuario'}
          </button>
        </form>
      </div>

      {/* Tabla */}
      <div className="overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <Th onClick={() => toggleSort('id')} active={sortKey==='id'} dir={sortDir}>ID</Th>
              <Th onClick={() => toggleSort('username')} active={sortKey==='username'} dir={sortDir}>Usuario</Th>
              <Th onClick={() => toggleSort('first_name')} active={sortKey==='first_name'} dir={sortDir}>Nombres</Th>
              <Th onClick={() => toggleSort('last_name')} active={sortKey==='last_name'} dir={sortDir}>Apellidos</Th>
              <Th onClick={() => toggleSort('email')} active={sortKey==='email'} dir={sortDir}>Email</Th>
              <Th onClick={() => toggleSort('role')} active={sortKey==='role'} dir={sortDir}>Rol</Th>
              <Th onClick={() => toggleSort('is_active')} active={sortKey==='is_active'} dir={sortDir}>Activo</Th>
              <Th onClick={() => toggleSort('last_login')} active={sortKey==='last_login'} dir={sortDir}>Último acceso</Th>
              <Th onClick={() => toggleSort('date_joined')} active={sortKey==='date_joined'} dir={sortDir}>Creado</Th>
              <th className="text-left p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              editing === u.id ? (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">
                    <input className="bg-white/5 rounded-lg px-2 py-1 w-full"
                      value={editData.first_name}
                      onChange={e => setEditData(d => ({ ...d, first_name: e.target.value }))} />
                  </td>
                  <td className="p-3">
                    <input className="bg-white/5 rounded-lg px-2 py-1 w-full"
                      value={editData.last_name}
                      onChange={e => setEditData(d => ({ ...d, last_name: e.target.value }))} />
                  </td>
                  <td className="p-3">
                    <input className="bg-white/5 rounded-lg px-2 py-1 w-full"
                      value={editData.email}
                      onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} />
                  </td>
                  <td className="p-3">
                    <select
                      className="dropdown-select bg-white/5 rounded-lg px-2 py-1"
                      value={editData.role}
                      onChange={e => setEditData(d => ({ ...d, role: e.target.value }))}
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="p-3">
                    <input type="checkbox" className="w-5 h-5 align-middle"
                      checked={!!editData.is_active}
                      onChange={e => setEditData(d => ({ ...d, is_active: e.target.checked }))} />
                  </td>
                  <td className="p-3 text-white/60">{fmtDate(u.last_login)}</td>
                  <td className="p-3 text-white/60">{fmtDate(u.date_joined)}</td>
                  <td className="p-3 flex gap-2">
                    <input placeholder="(opcional) nuevo password"
                      className="bg-white/5 rounded-lg px-2 py-1"
                      value={editData.password}
                      onChange={e => setEditData(d => ({ ...d, password: e.target.value }))} />
                    <button
                      disabled={saving}
                      className="px-3 py-1 rounded bg-[#5b87f5]"
                      onClick={() => saveEdit(u.id)}
                    >
                      {saving ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button className="px-3 py-1 rounded bg-white/10" onClick={() => setEditing(null)}>Cancelar</button>
                  </td>
                </tr>
              ) : (
                <tr key={u.id} className="border-t border-white/10">
                  <td className="p-3">{u.id}</td>
                  <td className="p-3">{u.username}</td>
                  <td className="p-3">{u.first_name || '-'}</td>
                  <td className="p-3">{u.last_name || '-'}</td>
                  <td className="p-3">{u.email || '-'}</td>
                  <td className="p-3">{u.role || '-'}</td>
                  <td className="p-3">{typeof u.is_active === 'boolean' ? (u.is_active ? 'Sí' : 'No') : '-'}</td>
                  <td className="p-3 text-white/60">{fmtDate(u.last_login)}</td>
                  <td className="p-3 text-white/60">{fmtDate(u.date_joined)}</td>
                  <td className="p-3 flex gap-2">
                    <button className="px-3 py-1 rounded bg-white/10" onClick={() => startEdit(u)}>Editar</button>
                    <button className="px-3 py-1 rounded bg-red-600/70" onClick={() => removeUser(u.id)}>Eliminar</button>
                  </td>
                </tr>
              )
            ))}
            {!filtered.length && !loading && (
              <tr><td className="p-3 text-white/60" colSpan={10}>Sin usuarios.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  )
}

/* ---------- Helpers UI ---------- */
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs text-white/70 mb-1">{label}</div>
      {children}
    </div>
  )
}

function Th({ children, onClick, active, dir }) {
  return (
    <th className="text-left p-3 cursor-pointer select-none" onClick={onClick}>
      <span className="inline-flex items-center gap-1">
        {children}
        <span className={`text-[10px] opacity-70 ${active ? '' : 'invisible'}`}>
          {dir === 'asc' ? '▲' : '▼'}
        </span>
      </span>
    </th>
  )
}

/* ---------- Helpers data ---------- */
function firstError(payload) {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (payload.detail) return String(payload.detail)
  const key = Object.keys(payload)[0]
  const val = key ? payload[key] : null
  return Array.isArray(val) ? val.join(', ') : (val ? String(val) : null)
}
