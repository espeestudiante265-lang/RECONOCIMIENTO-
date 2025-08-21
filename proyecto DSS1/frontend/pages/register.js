// frontend/pages/register.js
import { useState, useEffect } from 'react'
import axios from 'axios'
import { useRouter } from 'next/router'

const IS_DEV =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'

function formatBackendErrors(payload) {
  if (!payload) return null
  if (typeof payload === 'string') return payload
  if (Array.isArray(payload)) return payload.join('\n')
  if (payload.detail) return String(payload.detail)
  if (payload.non_field_errors?.length) return payload.non_field_errors.join('\n')
  try {
    const lines = Object.entries(payload).map(([k, v]) => {
      const text = Array.isArray(v) ? v.join(', ') : String(v)
      return `${k}: ${text}`
    })
    return lines.join(' | ')
  } catch {
    return JSON.stringify(payload)
  }
}

export default function Register() {
  const router = useRouter()
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', password2: '', role: 'estudiante'
  })
  const [showPwd, setShowPwd] = useState(false)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [okMsg, setOkMsg] = useState(null)
  const [status, setStatus] = useState(null)
  const [errorDebug, setErrorDebug] = useState(null)

  const API_BASE =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_BASE)
      ? String(process.env.NEXT_PUBLIC_API_BASE).replace(/\/+$/, '')
      : 'http://127.0.0.1:8000'

  useEffect(() => {
    const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null
    setIsAdminUser(role === 'admin')
  }, [])

  const handleChange = e => {
    setError(null); setOkMsg(null); setStatus(null); setErrorDebug(null)
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.first_name || !form.last_name || !form.email || !form.password || !form.password2) {
      setError('Completa todos los campos.')
      return
    }
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/
    if (!strong.test(form.password)) {
      setError('La contraseña debe tener mínimo 8 caracteres, mayúscula, minúscula, dígito y símbolo.')
      return
    }
    if (form.password !== form.password2) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true); setError(null); setOkMsg(null); setStatus(null); setErrorDebug(null)
    try {
      await axios.post(`${API_BASE}/api/auth/register/`, {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        password: form.password,
        password2: form.password2,
        role: form.role,
      })
      setOkMsg('✅ Registro exitoso. Redirigiendo al login…')
      setTimeout(() => router.push('/login'), 650)
    } catch (err) {
      const st = err?.response?.status ?? null
      const payload = err?.response?.data ?? null
      setStatus(st)
      const msg = formatBackendErrors(payload) || err.message || 'Error al registrar'
      setError(msg)
      if (IS_DEV) setErrorDebug(payload || { message: String(err) })
      console.error('REGISTER ERROR:', { status: st, payload, err })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-black text-text overflow-hidden">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -top-24 -left-24 w-[40rem] h-[40rem] rounded-full bg-primary/15 blur-[100px] animate-breathe" />
        <div className="absolute -bottom-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-secondary/10 blur-[100px] animate-breathe-slow" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.08] noise" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-white/20 to-white/5 opacity-30 blur-sm" />
        <div className="relative bg-[rgba(15,15,20,0.8)] backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,.6)] hover:shadow-[0_30px_80px_-10px_rgba(0,0,0,.65)] transition-shadow duration-300 animate-reveal">
          <div className="flex justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-16 h-16 text-primary drop-shadow-[0_0_20px_rgba(99,102,241,.25)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-7.168 0-9.72 5.568-9.72 6.478 0 .91 2.552 6.478 9.72 6.478s9.72-5.568 9.72-6.478c0-.91-2.552-6.478-9.72-6.478z" />
              <circle cx="12" cy="12" r="3.2" className="animate-eye-blink" />
            </svg>
          </div>

          <h1 className="text-2xl font-heading text-center mb-2">
            Crea tu cuenta en <span className="text-primary">Evaluation</span>
          </h1>
          <p className="text-center text-subtext text-sm mb-6">Regístrate para comenzar</p>

          {error && (
            <div className="mb-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2 rounded-lg flex items-center gap-2 animate-pop">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" strokeLinecap="round"/>
                <path d="M10.29 3.86l-8.2 14.2A1.5 1.5 0 003.3 20h17.4a1.5 1.5 0 001.3-1.94l-8.2-14.2a1.5 1.5 0 00-2.62 0z" />
              </svg>
              <span>{`Error${status ? ` (${status})` : ''}: `}{error}</span>
            </div>
          )}

          {okMsg && (
            <div className="mb-4 text-sm text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 px-3 py-2 rounded-lg flex items-center gap-2 animate-pop">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {okMsg}
            </div>
          )}

          {IS_DEV && errorDebug && (
            <details className="mb-4 text-xs bg-white/5 border border-white/10 px-3 py-2 rounded-lg" open>
              <summary className="cursor-pointer text-subtext">Ver respuesta del backend</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-subtext">
                {typeof errorDebug === 'string' ? errorDebug : JSON.stringify(errorDebug, null, 2)}
              </pre>
              <div className="mt-2 text-subtext/80">API: {API_BASE}</div>
            </details>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            {/* Nombres */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Nombres</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <input name="first_name" placeholder="Tus nombres" className="bg-transparent flex-1 text-text placeholder-gray-500 outline-none" value={form.first_name} onChange={handleChange} required />
              </div>
            </div>

            {/* Apellidos */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Apellidos</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <input name="last_name" placeholder="Tus apellidos" className="bg-transparent flex-1 text-text placeholder-gray-500 outline-none" value={form.last_name} onChange={handleChange} required />
              </div>
            </div>

            {/* Email */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Email</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8" />
                </svg>
                <input name="email" type="email" placeholder="tucorreo@dominio.com" autoComplete="email" className="bg-transparent flex-1 text-text placeholder-gray-500 outline-none" value={form.email} onChange={handleChange} required />
              </div>
            </div>

            {/* Contraseña */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Contraseña</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 11c.943 0 1.707.764 1.707 1.707v3.586A1.707 1.707 0 0112 18.001h0a1.707 1.707 0 01-1.707-1.707v-3.586C10.293 11.764 11.057 11 12 11z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 11V9a5 5 0 10-10 0v2" />
                </svg>
                <input name="password" type={showPwd ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" className="bg-transparent flex-1 text-text placeholder-gray-500 outline-none" value={form.password} onChange={handleChange} required />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="ml-1 inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition">
                  {showPwd ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3l18 18" strokeLinecap="round"/><path d="M10.58 10.58A3 3 0 0112 9c1.66 0 3 1.34 3 3 0 .42-.09.83-.25 1.2M7.72 7.72C5.28 8.74 3.57 10.41 3 12c0 .91 2.55 6.48 9.72 6.48 1.45 0 2.77-.2 3.96-.55M15.53 15.53C14.63 16.46 13.38 17 12 17 9.79 17 8 15.21 8 13c0-1.38.54-2.63 1.47-3.53" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S3.732 16.057 2.458 12z" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Confirmar contraseña</label>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <input name="password2" type={showPwd ? 'text' : 'password'} placeholder="••••••••" autoComplete="new-password" className="bg-transparent flex-1 text-text placeholder-gray-500 outline-none" value={form.password2} onChange={handleChange} required />
              </div>
            </div>

            {/* Rol */}
            <div className="group">
              <label className="block text-xs uppercase tracking-wider text-subtext/80 mb-2">Rol</label>
              <div className="relative flex items-center gap-2 rounded-xl px-3 py-2 bg-white/5 border border-white/10 focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-subtext" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <select name="role" value={form.role} onChange={handleChange} className="bg-transparent flex-1 text-text outline-none appearance-none">
                  <option value="estudiante">Estudiante</option>
                  <option value="profesor">Profesor</option>
                  {isAdminUser && <option value="admin">Administrador</option>}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" className="absolute right-3 w-4 h-4 text-subtext pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                </svg>
              </div>
              {!isAdminUser && <p className="mt-2 text-[11px] text-subtext/70">* La opción Administrador solo está disponible para superadministradores.</p>}
            </div>

            <button type="submit" disabled={loading} className="relative w-full py-3 rounded-xl bg-primary text-white font-medium transition active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden group">
              <span className={`block transition-opacity ${loading ? 'opacity-0' : 'opacity-100'}`}>Registrarse</span>
              {loading && <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>}
              <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition">
                <span className="absolute -inset-[1px] bg-gradient-to-r from-white/10 via-white/40 to-white/10 blur-[6px]" />
              </span>
            </button>
          </form>

          <p className="mt-6 text-center text-subtext">
            ¿Ya tienes cuenta?{' '}
            <span onClick={() => router.push('/login')} className="text-secondary hover:underline cursor-pointer">Inicia sesión</span>
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes reveal { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-reveal { animation: reveal .35s ease both; }
        @keyframes eyeBlink { 0%, 92%, 100% { transform: scaleY(1); } 94%, 96% { transform: scaleY(0.08); } 98% { transform: scaleY(1); } }
        .animate-eye-blink { transform-origin: 50% 50%; animation: eyeBlink 2s infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.06); opacity: 1 } }
        .animate-breathe { animation: breathe 6s ease-in-out infinite; }
        .animate-breathe-slow { animation: breathe 9s ease-in-out infinite; }
        @keyframes pop { 0% { transform: translateY(4px) scale(.98); opacity: 0 } 100% { transform: translateY(0) scale(1); opacity: 1 } }
        .animate-pop { animation: pop .25s ease-out both; }
        .noise { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E"); background-size: 180px 180px; mix-blend-mode: overlay; }
        select option { color: black; background-color: white; }
        select option:checked, select option:hover { background-color: #2563eb; color: white; }
      `}</style>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
      <circle className="opacity-20" cx="12" cy="12" r="10" stroke="white" strokeWidth="4" fill="none" />
      <path className="opacity-90" fill="white" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
