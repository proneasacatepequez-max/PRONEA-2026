'use client'
// src/components/layout/Sidebar.tsx
// CORRECCIONES:
// 1. Botón cerrar sesión con texto claro y visible
// 2. Enlace a "Mi Perfil" en todos los roles
// 3. Enlace SIREEX del técnico mantenido
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RolUsuario } from '@/types'

const PERFIL: Record<RolUsuario, string> = {
  administrador:        '/dashboard/admin/configuracion',
  tecnico:              '/dashboard/tecnico/perfil',
  director:             '/dashboard/director/perfil',
  coordinador_digeex:   '/dashboard/coordinador/perfil',
  enlace_institucional: '/dashboard/enlace/perfil',
  estudiante:           '/dashboard/estudiante/perfil',
}

const NAV: Record<RolUsuario, { section: string; items: { href: string; icon: string; label: string }[] }[]> = {
  administrador: [
    { section: 'Principal', items: [
      { href: '/dashboard/admin',          icon: '📊', label: 'Dashboard' },
      { href: '/dashboard/admin/usuarios', icon: '👥', label: 'Usuarios' },
      { href: '/dashboard/admin/establecimiento', icon: '🏛️', label: 'Establecimiento' },
    ]},
    { section: 'Permisos', items: [
      { href: '/dashboard/admin/permisos',        icon: '🔐', label: 'Permisos Globales' },
      { href: '/dashboard/admin/autorizaciones',   icon: '✅', label: 'Autorizaciones' },
      { href: '/dashboard/admin/visibilidad',      icon: '👁️', label: 'Visibilidad' },
    ]},
    { section: 'Académico', items: [
      { href: '/dashboard/admin/libros',   icon: '📚', label: 'Libros y Tareas' },
      { href: '/dashboard/admin/sedes',    icon: '🏫', label: 'Sedes' },
      { href: '/dashboard/admin/recursos', icon: '🎬', label: 'Recursos' },
      { href: '/dashboard/admin/ajustes',  icon: '♿', label: 'Tipos de Ajuste' },
    ]},
    { section: 'SIREEX', items: [
      { href: '/dashboard/admin/sireex',   icon: '📤', label: 'Grupos SIREEX' },
    ]},
    { section: 'Sistema', items: [
      { href: '/dashboard/admin/configuracion', icon: '⚙️', label: 'Configuración' },
      { href: '/dashboard/admin/auditoria',     icon: '📋', label: 'Auditoría' },
    ]},
  ],

  tecnico: [
    { section: 'Principal', items: [
      { href: '/dashboard/tecnico',             icon: '📊', label: 'Mi Dashboard' },
      { href: '/dashboard/tecnico/estudiantes', icon: '🎓', label: 'Mis Estudiantes' },
    ]},
    { section: 'Notas y Escalas', items: [
      { href: '/dashboard/tecnico/notas',   icon: '📝', label: 'Registrar Notas' },
      { href: '/dashboard/tecnico/escalas', icon: '📊', label: 'Escalas Numéricas' },
    ]},
    { section: 'Gestión', items: [
      { href: '/dashboard/tecnico/inscribir', icon: '➕', label: 'Inscribir Estudiante' },
      { href: '/dashboard/tecnico/sireex',    icon: '📤', label: 'Grupos SIREEX' },
      { href: '/dashboard/tecnico/ajustes',   icon: '♿', label: 'Adecuaciones' },
      { href: '/dashboard/tecnico/dua',       icon: '📐', label: 'Planif. DUA' },
    ]},
    { section: 'Recursos', items: [
      { href: '/dashboard/tecnico/recursos', icon: '🎬', label: 'Recursos Apoyo' },
    ]},
  ],

  director: [
    { section: 'Mi Sede', items: [
      { href: '/dashboard/director',             icon: '📊', label: 'Resumen' },
      { href: '/dashboard/director/tecnicos',    icon: '👨‍🏫', label: 'Técnicos y Enlaces' },
      { href: '/dashboard/director/estudiantes', icon: '🎓', label: 'Estudiantes' },
    ]},
    { section: 'Permisos', items: [
      { href: '/dashboard/director/autorizaciones', icon: '🔐', label: 'Autorizar Enlaces' },
    ]},
  ],

  coordinador_digeex: [
    { section: 'SIREEX', items: [
      { href: '/dashboard/coordinador',          icon: '✅', label: 'Validación' },
      { href: '/dashboard/coordinador/grupos',   icon: '📤', label: 'Grupos' },
      { href: '/dashboard/coordinador/exportar', icon: '📥', label: 'Exportar' },
    ]},
  ],

  enlace_institucional: [
    { section: 'Mi Institución', items: [
      { href: '/dashboard/enlace',             icon: '📊', label: 'Resumen' },
      { href: '/dashboard/enlace/estudiantes', icon: '🎓', label: 'Estudiantes' },
      { href: '/dashboard/enlace/inscribir',   icon: '➕', label: 'Inscribir' },
      { href: '/dashboard/enlace/notas',       icon: '📝', label: 'Ingresar Notas' },
    ]},
  ],

  estudiante: [
    { section: 'Mi Espacio', items: [
      { href: '/dashboard/estudiante',                  icon: '🏠', label: 'Inicio' },
      { href: '/dashboard/estudiante/calificaciones',   icon: '📝', label: 'Mis Notas' },
      { href: '/dashboard/estudiante/documentos',       icon: '📎', label: 'Documentos' },
      { href: '/dashboard/estudiante/recursos',         icon: '🎬', label: 'Recursos' },
    ]},
  ],
}

export default function Sidebar({ rol, nombre, correo }: { rol: RolUsuario; nombre: string; correo: string }) {
  const path = usePathname()
  const router = useRouter()
  const iniciales = nombre.split(' ').slice(0, 2).map(n => n[0] ?? '').join('').toUpperCase()
  const perfilHref = PERFIL[rol] ?? '/dashboard'

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">P</div>
        <div>
          <div className="text-white font-extrabold text-base leading-tight">PRONEA</div>
          <div className="text-white/50 text-[9px] font-bold tracking-widest uppercase">Sacatepéquez</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {(NAV[rol] ?? []).map(({ section, items }) => (
          <div key={section}>
            <div className="sb-section">{section}</div>
            {items.map(({ href, icon, label }) => (
              <Link key={href} href={href}>
                <div className={cn('sb-item', path === href && 'active')}>
                  <span className="w-5 text-center text-sm">{icon}</span>
                  <span>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Perfil y cerrar sesión */}
      <div className="border-t border-white/10 mt-1">
        {/* Mi Perfil */}
        <Link href={perfilHref}>
          <div className={cn('sb-item mx-2 my-1', path === perfilHref && 'active')}>
            <span className="w-5 text-center text-sm">👤</span>
            <span>Mi Perfil</span>
          </div>
        </Link>

        {/* Usuario + Cerrar sesión */}
        <div className="sb-user">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {iniciales}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-bold truncate">{nombre}</div>
            <div className="text-white/50 text-[10px] truncate">{correo}</div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center gap-1 text-white/60 hover:text-red-400 hover:bg-white/10 transition-all rounded-lg px-2 py-1 text-xs font-semibold"
          >
            <span>Salir</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
