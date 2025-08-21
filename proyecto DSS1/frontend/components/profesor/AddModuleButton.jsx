// frontend/components/profesor/AddModuleButton.jsx
import { useState } from 'react'
import { addModuleToCourse } from '@/lib/activities'

export default function AddModuleButton({ courseId, onCreated }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    try {
      setLoading(true)
      setError(null)
      const m = await addModuleToCourse(courseId, name.trim())
      setName('')
      setOpen(false)
      if (onCreated) onCreated(m)
    } catch (e) {
      setError(e?.response?.data?.detail || e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-block">
      {!open ? (
        <button onClick={() => setOpen(true)} className="px-3 py-2 rounded bg-blue-600 text-white">
          + Agregar módulo
        </button>
      ) : (
        <form onSubmit={submit} className="flex items-center gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre del módulo"
            className="border rounded px-2 py-1"
          />
          <button disabled={loading} className="px-3 py-1 rounded bg-green-600 text-white">
            {loading ? 'Creando…' : 'Crear'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded bg-gray-200">
            Cancelar
          </button>
          {error && <span className="text-red-600 text-sm ml-2">{error}</span>}
        </form>
      )}
    </div>
  )
}
