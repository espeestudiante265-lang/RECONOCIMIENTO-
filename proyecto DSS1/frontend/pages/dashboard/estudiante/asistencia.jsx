// pages/dashboard/estudiante/asistencia.jsx
import { useEffect, useMemo, useState } from 'react'
import DashboardLayout from '../../../components/DashboardLayout'
import { MENU } from '../../../config/menu'
import { useAuthGuard } from '../../../lib/auth'
import api from '../../../lib/api'

const EP = { mine: '/api/attendance/mine/' }
const parseList = (d) => Array.isArray(d) ? d : (d?.results ?? [])

function StatCard({ label, value, progress = null }) {
  return (
    <div className="p-4 rounded-2xl bg-white/[0.04] backdrop-blur border border-white/10 shadow-[0_4px_24px_rgba(0,0,0,.25)]">
      <div className="text-xs text-white/70">{label}</div>
      <div className="text-2xl font-semibold mt-0.5">{value}</div>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-sky-400 to-blue-600" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
    </div>
  )
}
function Th({ children, className='' }) { return <th className={`text-xs uppercase tracking-wide ${className}`}>{children}</th> }
function Td({ children, className='' }) { return <td className={`align-middle ${className}`}>{children}</td> }

export default function Asistencia() {
  const { ready, logout } = useAuthGuard(['estudiante'])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (ready) load() }, [ready])

  async function load() {
    setLoading(true)
    try {
      const r = await api.get(EP.mine)
      const data = parseList(r.data)
      data.sort((a,b) => new Date(b.created_at||0) - new Date(a.created_at||0))
      setRows(data)
    } finally { setLoading(false) }
  }

  const presentCount = useMemo(() => rows.filter(s => {
    if (typeof s.present === 'boolean') return s.present
    const v = Number(s.score ?? s.attention ?? s.attention_score ?? 0)
    return v >= 50
  }).length, [rows])

  const percent = rows.length ? Math.round((presentCount / rows.length) * 100) : 0
  if (!ready) return null

  return (
    <DashboardLayout title="Asistencia" menu={MENU.estudiante} onLogout={logout}>
      <div className="grid gap-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          <StatCard label="Sesiones" value={rows.length} />
          <StatCard label="Asistencias" value={presentCount} />
          <StatCard label="Porcentaje" value={`${percent}%`} progress={percent} />
        </div>

        {loading && <div>Cargando…</div>}

        {!loading && (
          <div className="rounded-2xl border border-white/10 overflow-hidden">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-white/10 sticky top-0 backdrop-blur">
                  <tr>
                    <Th className="w-[28%]">Fecha</Th>
                    <Th className="w-[36%]">Curso</Th>
                    <Th className="w-[18%] text-center">Estado</Th>
                    <Th className="w-[18%] text-center">Score</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s, idx) => {
                    const score = Number(s.score ?? s.attention ?? s.attention_score ?? 0)
                    const present = typeof s.present === 'boolean' ? s.present : score >= 50
                    return (
                      <tr key={s.id ?? `${s.created_at}-${idx}`} className="border-t border-white/10 odd:bg-white/[0.02] hover:bg-white/5">
                        <Td className="truncate">{s.created_at ? new Date(s.created_at).toLocaleString() : '—'}</Td>
                        <Td className="truncate">{s.course_name || s.course || '—'}</Td>
                        <Td className="text-center">{present ? 'Presente' : 'Ausente'}</Td>
                        <Td className="text-center">{Number.isFinite(score) ? score : '-'}</Td>
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-6 text-white/70">Sin registros.</td></tr>
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
