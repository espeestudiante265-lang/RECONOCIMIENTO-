// frontend/lib/menu.js
export const MENU = {
  estudiante: [
    { label: 'Cursos',         href: '/dashboard/estudiante' },
    { label: 'Asignaciones',   href: '/dashboard/estudiante/asignaciones' },
    { label: 'Asistencia',     href: '/dashboard/estudiante/asistencia' },
    { label: 'Monitoreo',      href: '/dashboard/estudiante/monitor' }, // ← aquí
    { label: 'Notas',          href: '/dashboard/estudiante/notas' },
  ],
  profesor: [
    { label: 'Cursos',  href: '/dashboard/profesor' },
    { label: 'Actividades',    href: '/dashboard/profesor/actividades' },
    { label: 'Entregas',       href: '/dashboard/profesor/entregas' },
    { label: 'Reporte asistencia', href: '/dashboard/profesor/asistencia' },
  ],
  admin: [
    { label: 'Usuarios', href: '/dashboard/admin' },
    { label: 'Cursos', href: '/dashboard/admin/cursos' },
    { label: 'Parámetros',      href: '/dashboard/admin/parametros' },
    { label: 'Reportes',        href: '/dashboard/admin/reportes' },
  ],
}
