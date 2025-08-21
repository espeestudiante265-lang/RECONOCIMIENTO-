import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'



export default function AdminParametros() {
  const { ready, logout } = useAuthGuard(['admin'])
  const [form, setForm] = useState({ pct_activity: 70, pct_attention: 30 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    if (!ready) return
    api.get('/api/admin/config/')
      .then(({ data }) => setForm(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [ready])

  const handleChange = e => {
    const { name, value } = e.target
    const v = Math.max(0, Math.min(100, Number(value || 0)))
    const other = name === 'pct_activity' ? 'pct_attention' : 'pct_activity'
    setForm(prev => {
      const next = { ...prev, [name]: v }
      const sum = next.pct_activity + next.pct_attention
      if (sum !== 100) {
        next[other] = Math.max(0, Math.min(100, 100 - v))
      }
      return next
    })
  }

  const save = async () => {
    setSaving(true); setMsg(null)
    try {
      await api.put('/api/admin/config/', form)
      setMsg('Parámetros guardados correctamente.')
    } catch {
      setMsg('No se pudo guardar. Intenta de nuevo.')
    } finally { setSaving(false) }
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Parámetros" menu={MENU.admin} onLogout={logout}>
      {loading ? (
        <div className="text-white/70">Cargando…</div>
      ) : (
        <div className="max-w-xl space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/10">
              <div className="text-sm text-white/70 mb-2">Actividad (%)</div>
              <input
                type="number"
                className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none"
                name="pct_activity"
                value={form.pct_activity}
                onChange={handleChange}
                min={0} max={100}
              />
            </div>
            <div className="p-4 rounded-xl border border-white/10">
              <div className="text-sm text-white/70 mb-2">Atención (%)</div>
              <input
                type="number"
                className="w-full bg-white/5 rounded-lg px-3 py-2 outline-none"
                name="pct_attention"
                value={form.pct_attention}
                onChange={handleChange}
                min={0} max={100}
              />
            </div>
          </div>

          <div className="text-xs text-white/60">
            Deben sumar 100. Actual impacta de inmediato en el cálculo de notas.
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-[#5b87f5] hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>

          {msg && <div className="text-sm text-green-400">{msg}</div>}
        </div>
      )}
    </DashboardLayout>
  )
}
