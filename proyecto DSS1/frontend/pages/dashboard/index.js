// frontend/pages/dashboard/index.js
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'

export default function DashboardIndex() {
  const router = useRouter()
  const didRoute = useRef(false)

  useEffect(() => {
    if (didRoute.current) return
    didRoute.current = true

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    let role    = typeof window !== 'undefined' ? localStorage.getItem('role')  : null

    if (!token) {
      router.replace('/login')
      return
    }

    const r = (role || '').toLowerCase()
    if (['administrator', 'administrador', 'superuser', 'staff'].includes(r)) role = 'admin'
    if (r === 'teacher') role = 'profesor'
    if (r === 'student') role = 'estudiante'

    // fallback seguro si role viene vacío o raro
    if (!role) {
      router.replace('/dashboard/estudiante')
      return
    }

    router.replace(`/dashboard/${role}`)
  }, [router])

  // Mostrar algo mientras redirige, evitando pantalla negra
  return (
    <div style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>
      <p>Redirigiendo a tu panel…</p>
    </div>
  )
}
