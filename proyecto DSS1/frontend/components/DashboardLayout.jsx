import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'

export default function DashboardLayout({ title, menu, children, onLogout }) {
  const router = useRouter()
  const [role, setRole] = useState('')

  useEffect(() => {
    const r = typeof window !== 'undefined' ? localStorage.getItem('role') : ''
    setRole(r || '')
  }, [])

  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-[#0b0f14] text-white">
      {/* Sidebar */}
      <aside className="border-r border-white/10 p-4">
        <div className="font-bold text-xl mb-6">Evaluation</div>
        <nav className="space-y-1">
          {menu.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-3 py-2 rounded-lg hover:bg-white/10 transition ${
                router.asPath === item.href ? 'bg-white/10' : ''
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-6 text-xs text-white/60">Rol: {role}</div>
        <button
          onClick={onLogout}
          className="mt-4 w-full py-2 rounded-lg bg-[#5b87f5] hover:opacity-90"
        >
          Cerrar sesión
        </button>
      </aside>

      {/* Main */}
      <main className="p-6">
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">{title}</h1>
        </header>
        <section>{children}</section>
      </main>
    </div>
  )
}
