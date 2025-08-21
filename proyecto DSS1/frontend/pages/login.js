// frontend/pages/login.js
import { useState } from 'react'
import { useRouter } from 'next/router'
// ⬇ usa tu cliente centralizado
import api, { BASE_URL } from '../lib/api'   // <- ajusta la ruta si usas alias "@/lib/api"

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

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [status, setStatus] = useState(null)
  const [errorDebug, setErrorDebug] = useState(null)

  const handleChange = (e) => {
    setError(null)
    setStatus(null)
    setErrorDebug(null)
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) {
      setError('Completa correo y contraseña.')
      return
    }

    setLoading(true)
    setError(null)
    setStatus(null)
    setErrorDebug(null)

    try {
      // 👇 Usa el cliente 'api' (NO construir URL a mano)
      // Si usas SimpleJWT, cambia a "/auth/jwt/create/"
      const { data } = await api.post('/auth/login/', {
        email: form.email,
        password: form.password,
      })

      const token =
        data?.access ||
        data?.token ||
        data?.access_token ||
        data?.tokens?.access ||
        data?.jwt ||
        null

      const role =
        data?.role || data?.user?.role || data?.profile?.role || data?.data?.role || null

      if (!token) {
        console.error('DEBUG login payload sin token:', data)
        throw new Error('La API no devolvió token.')
      }

      localStorage.setItem('token', token)
      if (data?.refresh) localStorage.setItem('refresh', data.refresh)
      if (role) localStorage.setItem('role', role)
      localStorage.setItem('email', form.email)

      router.replace('/dashboard')
    } catch (err) {
      const st = err?.response?.status ?? null
      const payload = err?.response?.data ?? null
      const msg = formatBackendErrors(payload) || err.message || 'Error al procesar la solicitud'

      setStatus(st)
      setError(msg)
      if (IS_DEV) setErrorDebug(payload || { message: String(err) })
      console.error('LOGIN ERROR:', { status: st, payload, err })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-black text-text overflow-hidden">
      {/* ... (tu UI igual) ... */}

      {IS_DEV && (
        <div className="mt-2 text-xs text-subtext/80">API base (debug): {BASE_URL}</div>
      )}

      {/* ... resto del JSX sin cambios ... */}
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
