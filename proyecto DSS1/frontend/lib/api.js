// frontend/lib/api.js
import axios from 'axios'

const raw = process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
const baseURL = /^https?:\/\//i.test(raw) ? raw.replace(/\/+$/, '') : 'http://127.0.0.1:8000'

const api = axios.create({ baseURL })

export function getAccessToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('access') || localStorage.getItem('token') || null
}
export function setTokens({ access, refresh }) {
  if (typeof window === 'undefined') return
  if (access) localStorage.setItem('access', access)
  if (refresh) localStorage.setItem('refresh', refresh)
}
export function clearTokens() {
  if (typeof window === 'undefined') return
  localStorage.removeItem('access')
  localStorage.removeItem('refresh')
  localStorage.removeItem('token')
}

api.interceptors.request.use((config) => {
  const tk = getAccessToken()
  if (tk) config.headers.Authorization = `Bearer ${tk}`
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const status = err?.response?.status
    // Evita redirigir si ya estás en /login o la ruta no es del app
    if (typeof window !== 'undefined' && status === 401) {
      const here = location.pathname
      clearTokens()
      if (!/\/login$/.test(here)) location.href = '/login'
    }
    console.error('API ERROR', status, err?.response?.data || err.message)
    return Promise.reject(err)
  }
)

export default api
