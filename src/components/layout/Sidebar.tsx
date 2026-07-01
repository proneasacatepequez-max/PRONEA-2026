'use client'
// src/components/layout/Sidebar.tsx — ACTUALIZADO: director/escalas agregado
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { RolUsuario } from '@/types'

const cn = (...classes: (string | boolean | undefined)[]) =>
  classes.filter(Boolean).join(' ')

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
      { href: '/dashboard/admin',             icon: '📊', label: 'Dashboard'         },
      { href: '/dashboard/admin/usuarios',    icon: '👥', label: 'Usuarios'          },
      { href: '/dashboard/admin/estudiantes', icon: '🎓', label: 'Estudiantes'       },
      { href: '/dashboard/admin/establecimiento', icon: '🏛️', label: 'Establecimiento'},
    ]},
    { section: 'Permisos', items: [
      { href: '/dashboard/admin/permisos',       icon: '🔐', label: 'Permisos Globales' },
      { href: '/dashboard/admin/autorizaciones', icon: '✅', label: 'Autorizaciones'    },
      { href: '/dashboard/admin/visibilidad',    icon: '👁️', label: 'Visibilidad'       },
    ]},
    { section: 'Académico', items: [
      { href: '/dashboard/admin/libros',   icon: '📚', label: 'Libros y Tareas' },
      { href: '/dashboard/admin/sedes',    icon: '🏫', label: 'Sedes'           },
      { href: '/dashboard/admin/recursos', icon: '🎬', label: 'Recursos'        },
      { href: '/dashboard/admin/ajustes',  icon: '♿', label: 'Tipos de Ajuste' },
    ]},
    { section: 'SIREEX', items: [
      { href: '/dashboard/admin/sireex', icon: '📤', label: 'Grupos SIREEX' },
    ]},
    { section: 'Sistema', items: [
      { href: '/dashboard/admin/configuracion', icon: '⚙️', label: 'Configuración' },
      { href: '/dashboard/admin/auditoria',     icon: '📋', label: 'Auditoría'     },
    ]},
  ],

  tecnico: [
    { section: 'Principal', items: [
      { href: '/dashboard/tecnico',             icon: '📊', label: 'Mi Dashboard'    },
      { href: '/dashboard/tecnico/estudiantes', icon: '🎓', label: 'Mis Estudiantes' },
      { href: '/dashboard/tecnico/inscribir',   icon: '➕', label: 'Inscribir'       },
    ]},
    { section: 'Notas y Escalas', items: [
      { href: '/dashboard/tecnico/notas',   icon: '📝', label: 'Registrar Notas'   },
      { href: '/dashboard/tecnico/escalas', icon: '📊', label: 'Escalas Numéricas' },
    ]},
    { section: 'Gestión', items: [
      { href: '/dashboard/tecnico/sedes-enlaces', icon: '🏢', label: 'Mis Sedes y Enlaces' },
      { href: '/dashboard/tecnico/sireex',        icon: '📤', label: 'Grupos SIREEX'       },
      { href: '/dashboard/tecnico/ajustes',       icon: '♿', label: 'Adecuaciones'         },
      { href: '/dashboard/tecnico/dua',           icon: '📐', label: 'Planif. DUA'          },
      { href: '/dashboard/tecnico/sesiones',      icon: '🗓️', label: 'Sesiones'             },
    ]},
    { section: 'Recursos', items: [
      { href: '/dashboard/tecnico/recursos', icon: '🎬', label: 'Recursos Apoyo' },
    ]},
  ],

  director: [
    { section: 'Mi Sede', items: [
      { href: '/dashboard/director',             icon: '📊', label: 'Resumen'             },
      { href: '/dashboard/director/tecnicos',    icon: '👨‍🏫', label: 'Técnicos y Enlaces'  },
      { href: '/dashboard/director/estudiantes', icon: '🎓', label: 'Estudiantes'          },
    ]},
    { section: 'Escalas y Notas', items: [
      { href: '/dashboard/director/escalas', icon: '📊', label: 'Escalas Numéricas' },
    ]},
    { section: 'SIREEX', items: [
      { href: '/dashboard/director/sireex', icon: '📤', label: 'Grupos SIREEX' },
    ]},
    { section: 'Permisos', items: [
      { href: '/dashboard/director/autorizaciones', icon: '🔐', label: 'Autorizar Enlaces' },
    ]},
  ],

  coordinador_digeex: [
    { section: 'Principal', items: [
      { href: '/dashboard/coordinador',        icon: '📊', label: 'Dashboard'   },
      { href: '/dashboard/coordinador/grupos', icon: '📤', label: 'Grupos SIREEX' },
    ]},
    { section: 'Exportar', items: [
      { href: '/dashboard/coordinador/exportar', icon: '📥', label: 'Exportar datos' },
    ]},
  ],

  enlace_institucional: [
    { section: 'Mi Institución', items: [
      { href: '/dashboard/enlace',             icon: '📊', label: 'Resumen'     },
      { href: '/dashboard/enlace/estudiantes', icon: '🎓', label: 'Estudiantes' },
      { href: '/dashboard/enlace/inscribir',   icon: '➕', label: 'Inscribir'   },
    ]},
    { section: 'Notas y Escalas', items: [
      { href: '/dashboard/enlace/notas',   icon: '📝', label: 'Notas'             },
      { href: '/dashboard/enlace/escalas', icon: '📊', label: 'Escalas Numéricas' },
    ]},
    { section: 'Recursos', items: [
      { href: '/dashboard/enlace/recursos', icon: '🎬', label: 'Recursos Apoyo' },
    ]},
  ],

  estudiante: [
    { section: 'Mi Espacio', items: [
      { href: '/dashboard/estudiante',                icon: '🏠', label: 'Inicio'      },
      { href: '/dashboard/estudiante/calificaciones', icon: '📝', label: 'Mis Notas'   },
      { href: '/dashboard/estudiante/documentos',     icon: '📎', label: 'Documentos'  },
      { href: '/dashboard/estudiante/recursos',       icon: '🎬', label: 'Recursos'    },
    ]},
  ],
}

export default function Sidebar({
  rol, nombre, correo,
}: { rol: RolUsuario; nombre: string; correo: string }) {
  const path   = usePathname()
  const router = useRouter()

  const iniciales = nombre
    .split(' ').filter(Boolean).slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '').join('')

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  const isActive = (href: string) => {
    // Raíces exactas del dashboard — solo activo si es exactamente esa ruta
    const roots = [
      '/dashboard/admin', '/dashboard/tecnico', '/dashboard/director',
      '/dashboard/coordinador', '/dashboard/enlace', '/dashboard/estudiante',
    ]
    if (roots.includes(href)) return path === href
    return path.startsWith(href)
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sb-logo">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">
          P
        </div>
        <div>
          <div className="text-white font-extrabold text-base leading-tight">PRONEA</div>
          <div className="text-white/50 text-[9px] font-bold tracking-widest uppercase">Sacatepéquez</div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 py-2 overflow-y-auto scrollbar-thin">
        {(NAV[rol] ?? []).map(({ section, items }) => (
          <div key={section}>
            <div className="sb-section">{section}</div>
            {items.map(({ href, icon, label }) => (
              <Link key={href} href={href}>
                <div className={cn('sb-item', isActive(href) && 'active')}>
                  <span className="w-5 text-center text-sm flex-shrink-0">{icon}</span>
                  <span className="truncate">{label}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* Perfil + Cerrar sesión */}
      <div className="border-t border-white/10 mt-1">
        <Link href={PERFIL[rol] ?? '/dashboard'}>
          <div className={cn('sb-item mx-2 my-1', isActive(PERFIL[rol]) && 'active')}>
            <span className="w-5 text-center text-sm flex-shrink-0">👤</span>
            <span>Mi Perfil</span>
          </div>
        </Link>

        <div className="sb-user">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {iniciales || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-xs font-bold truncate">{nombre || 'Usuario'}</div>
            <div className="text-white/50 text-[10px] truncate">{correo}</div>
          </div>
          <button
            onClick={logout}
            title="Cerrar sesión"
            className="flex items-center gap-1 text-white/60 hover:text-red-400 hover:bg-white/10 transition-all rounded-lg px-2 py-1.5 text-xs font-semibold flex-shrink-0"
          >
            <span>Salir</span>
            <span className="text-base">→</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
