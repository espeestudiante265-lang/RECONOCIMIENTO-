import { useEffect, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

// helpers
const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])

function downloadCSV(filename, rows) {
  if (!rows.length) return
  const process = v => String(v ?? '').replace(/"/g, '""')
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${process(r[h])}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function AsistenciaProfesor() {
  const { ready, logout } = useAuthGuard(['profesor'])
  const [cursos, setCursos] = useState([])
  const [cursoSel, setCursoSel] = useState('')
  const [rows, setRows] = useState([])
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Cargar cursos del profesor
  useEffect(() => {
    if (!ready) return
    ;(async () => {
      setLoadingCursos(true); setError(null)
      try {
        // intenta endpoint “mine”, si no, usa /prof/courses
        try {
          const r = await api.get('/api/courses/?mine=1')
          setCursos(parseList(r.data) || [])
        } catch {
          const r2 = await api.get('/api/prof/courses/')
          setCursos(parseList(r2.data) || [])
        }
      } catch (e) {
        console.error('Cursos profesor:', e?.response?.status, e?.response?.data || e.message)
        setError('No se pudieron cargar los cursos')
      } finally {
        setLoadingCursos(false)
      }
    })()
  }, [ready])

  const cargar = async () => {
    if (!cursoSel) return
    setLoading(true); setError(null)
    try {
      const { data } = await api.get(`/api/attendance/professor-report/?course=${cursoSel}`)
      // backend devuelve ARRAY plano
      setRows(Array.isArray(data) ? data : (data?.results ?? []))
    } catch (e) {
      console.error('Attendance error:', e?.response?.status, e?.response?.data || e.message)
      setError('No se pudo cargar el reporte')
      setRows([])
    } finally {
      setLoading(false)
    }
  }

  const exportar = () => {
    if (!rows.length) return
    // Campos claros para CSV
    const toCsv = rows.map(r => ({
      student_id: r.student_id,
      student_username: r.student_username,
      sessions: r.sessions,
      avg_attention: r.avg_attention,
      last_started_at: r.last_started_at || '',
      last_ended_at: r.last_ended_at || '',
    }))
    downloadCSV('reporte_asistencia.csv', toCsv)
  }

  if (!ready) return null

  return (
    <DashboardLayout title="Reporte de asistencia" menu={MENU.profesor} onLogout={logout}>
      <div className="p-4 rounded-2xl border border-white/10 bg-[#0b1220] shadow-[0_4px_24px_rgba(0,0,0,.25)] space-y-4">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="min-w-[260px] rounded-xl px-3 py-2 border border-white/10 bg-[#111827] text-white"
              value={cursoSel}
              onChange={e=>setCursoSel(e.target.value)}
              disabled={loadingCursos}
            >
              <option value="">{loadingCursos ? 'Cargando…' : '— Selecciona curso —'}</option>
              {cursos.map(c => (
                <option key={c.id} value={c.id}>{c.name || `Curso ${c.id}`}</option>
              ))}
            </select>

            <button
              onClick={cargar}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 transition disabled:opacity-60"
              disabled={!cursoSel || loading}
            >
              {loading ? 'Cargando…' : 'Cargar'}
            </button>

            <button
              onClick={exportar}
              className="px-4 py-2 rounded-xl border border-white/10 hover:bg-[#1f2937] transition disabled:opacity-60"
              disabled={!rows.length}
            >
              Exportar CSV
            </button>
          </div>

          {!!error && <div className="text-red-400 text-sm">{error}</div>}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Estudiante</th>
                <th className="text-left py-2">Sesiones</th>
                <th className="text-left py-2">Promedio atención</th>
                <th className="text-left py-2">Última sesión</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const avg = Number(r.avg_attention ?? 0)
                const start = r.last_started_at ? new Date(r.last_started_at) : null
                const end = r.last_ended_at ? new Date(r.last_ended_at) : null
                const lastTxt = start ? `${start.toLocaleString()}${end ? ` → ${end.toLocaleString()}` : ''}` : '—'
                return (
                  <tr key={r.student_id || r.student_username} className="border-t border-white/10">
                    <td className="py-2">{r.student_username || `#${r.student_id ?? ''}`}</td>
                    <td className="py-2">{r.sessions ?? 0}</td>
                    <td className="py-2">{Number.isFinite(avg) ? `${avg.toFixed(2)}%` : '0.00%'}</td>
                    <td className="py-2">{lastTxt}</td>
                  </tr>
                )
              })}

              {!rows.length && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-white/60">
                    {loading ? 'Cargando…' : 'Sin datos'}
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
