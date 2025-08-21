// frontend/components/Layout.js
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Layout({ children }) {
  const router = useRouter()
  const [username, setUsername] = useState(null)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const u = typeof window !== 'undefined' ? localStorage.getItem('username') : null
    if (!token && router.pathname !== '/login' && router.pathname !== '/register') {
      router.push('/login')
    }
    setUsername(u)
  }, [router])

  const logout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <>
      <header>
        <nav>
          <Link href="/">Home</Link> |{' '}
          <Link href="/activity">Actividad</Link> |{' '}
          <Link href="/monitor">Monitoreo</Link> |{' '}
          {username && <button onClick={logout}>Logout</button>}
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>Proyecto DSS1 – 2025</p>
      </footer>
    </>
  )
}
