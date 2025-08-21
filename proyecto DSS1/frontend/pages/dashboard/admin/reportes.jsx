import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// Utilidad para exportar CSV
function downloadCSV(filename, rows) {
  const process = v => String(v ?? '').replace(/"/g, '""')
  const headers = Object.keys(rows[0] || {})
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${process(r[h])}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function AdminReportes() {
  const { ready, logout } = useAuthGuard(['admin'])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [summary, setSummary] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/attendance/report/', {
        params: {
          from: from || undefined,
          to: to || undefined,
        },
      })
      setSessions(data.sessions || [])
      setSummary(data.summary || [])
    } catch (e) {
      if (e?.response?.status === 401) {
        localStorage.clear()
        window.location.href = '/login'
        return
      }
      console.error(e)
      alert('Error cargando reporte')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ready) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  if (!ready) return null

  return (
    <DashboardLayout title="Reportes de Asistencia" menu={MENU.admin} onLogout={logout}>
      <div className="grid gap-6">
        {/* Filtros */}
        <div className="flex items-end gap-3">
          <div>
            <div className="text-sm text-white/70 mb-1">Desde</div>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="bg-white/5 rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <div>
            <div className="text-sm text-white/70 mb-1">Hasta</div>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="bg-white/5 rounded-lg px-3 py-2 outline-none"
            />
          </div>
          <button
            onClick={load}
            className="px-5 py-2 rounded-lg bg-[#5b87f5] hover:opacity-90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Cargando…' : 'Aplicar'}
          </button>

          {!!sessions.length && (
            <button
              onClick={() => downloadCSV('sesiones.csv', sessions)}
              className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/10"
            >
              Exportar CSV (sesiones)
            </button>
          )}
          {!!summary.length && (
            <button
              onClick={() => downloadCSV('resumen.csv', summary)}
              className="px-5 py-2 rounded-lg border border-white/20 hover:bg-white/10"
            >
              Exportar CSV (resumen)
            </button>
          )}
        </div>

        {/* Resumen por estudiante */}
        <div>
          <h3 className="text-lg mb-2">Resumen por estudiante</h3>
          <div className="overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3">Estudiante</th>
                  <th className="text-left p-3">Promedio atención (/20)</th>
                  <th className="text-left p-3"># Sesiones</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((r, i) => (
                  <tr key={i} className="border-t border-white/10">
                    <td className="p-3">{r.student__username}</td>
                    {/* avg_attention viene /20 desde el backend */}
                    <td className="p-3">{Number(r.avg_attention ?? 0).toFixed(2)}</td>
                    <td className="p-3">{r.sessions}</td>
                  </tr>
                ))}
                {!summary.length && (
                  <tr>
                    <td className="p-3 text-white/60" colSpan={3}>
                      Sin datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalle sesiones */}
        <div>
          <h3 className="text-lg mb-2">Sesiones</h3>
          <div className="overflow-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5">
                <tr>
                  <th className="text-left p-3">ID</th>
                  <th className="text-left p-3">Estudiante</th>
                  <th className="text-left p-3">Inicio</th>
                  <th className="text-left p-3">Fin</th>
                  <th className="text-left p-3">Promedio (/20)</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-white/10">
                    <td className="p-3">{s.id}</td>
                    <td className="p-3">{s.student__username}</td>
                    <td className="p-3">{new Date(s.started_at).toLocaleString()}</td>
                    <td className="p-3">{s.ended_at ? new Date(s.ended_at).toLocaleString() : '-'}</td>
                    {/* average_score viene /20 desde el backend */}
                    <td className="p-3">{Number(s.average_score ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
                {!sessions.length && (
                  <tr>
                    <td className="p-3 text-white/60" colSpan={5}>
                      Sin datos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
