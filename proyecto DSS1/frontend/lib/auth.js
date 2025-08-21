// frontend/lib/auth.js
import { useEffect, useState } from 'react'
import api, { getAccessToken } from './api'

export function useAuthGuard(roles = []) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    let mounted = true

    async function check() {
      // si no hay token, no bloquees el render: manda a /login
      const tk = getAccessToken()
      if (!tk) {
        if (typeof window !== 'undefined' && !location.pathname.endsWith('/login')) {
          location.href = '/login'
        }
        if (mounted) setReady(true) // desbloquea la UI
        return
      }

      try {
        const { data } = await api.get('/api/auth/me/')
        if (!mounted) return
        setUser(data)
        // si hay roles exigidos, valida
        if (roles.length) {
          const role = (data.role || '').toLowerCase()
          const ok = roles.map(r => r.toLowerCase()).includes(role)
          if (!ok) {
            if (typeof window !== 'undefined') location.href = '/'
            return
          }
        }
      } catch (e) {
        // Si falla /me, no dejes la pantalla en blanco
        if (typeof window !== 'undefined') {
          // se eliminarán tokens en el interceptor al recibir 401
          if (!location.pathname.endsWith('/login')) location.href = '/login'
        }
      } finally {
        if (mounted) setReady(true)
      }
    }

    check()
    return () => { mounted = false }
  }, [roles.join(',')])

  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      location.href = '/login'
    }
  }

  return { ready, user, logout }
}
