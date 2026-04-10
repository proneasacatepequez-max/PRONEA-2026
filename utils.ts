'use client'
// src/components/layout/Sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RolUsuario } from '@/types'

const NAV: Record<RolUsuario, {section:string; items:{href:string;icon:string;label:string}[]}[]> = {
  administrador: [
    { section:'Principal', items:[
      {href:'/dashboard/admin', icon:'📊', label:'Dashboard'},
      {href:'/dashboard/admin/usuarios', icon:'👥', label:'Usuarios'},
      {href:'/dashboard/admin/establecimiento', icon:'🏛️', label:'Establecimiento'},
    ]},
    { section:'Sistema de Permisos', items:[
      {href:'/dashboard/admin/permisos', icon:'🔐', label:'Permisos Globales'},
      {href:'/dashboard/admin/autorizaciones', icon:'✅', label:'Autorizaciones'},
      {href:'/dashboard/admin/visibilidad', icon:'👁️', label:'Visibilidad'},
    ]},
    { section:'Académico', items:[
      {href:'/dashboard/admin/libros', icon:'📚', label:'Libros'},
      {href:'/dashboard/admin/sedes', icon:'🏫', label:'Sedes'},
      {href:'/dashboard/admin/recursos', icon:'🎬', label:'Recursos'},
      {href:'/dashboard/admin/ajustes', icon:'♿', label:'Ajustes Disc.'},
    ]},
    { section:'SIREEX', items:[
      {href:'/dashboard/admin/sireex', icon:'📤', label:'Grupos SIREEX'},
    ]},
    { section:'Sistema', items:[
      {href:'/dashboard/admin/configuracion', icon:'⚙️', label:'Configuración'},
      {href:'/dashboard/admin/auditoria', icon:'📋', label:'Auditoría'},
    ]},
  ],
  tecnico: [
    { section:'Principal', items:[
      {href:'/dashboard/tecnico', icon:'📊', label:'Mi Dashboard'},
      {href:'/dashboard/tecnico/estudiantes', icon:'🎓', label:'Mis Estudiantes'},
      {href:'/dashboard/tecnico/notas', icon:'📝', label:'Registrar Notas'},
    ]},
    { section:'Gestión', items:[
      {href:'/dashboard/tecnico/inscribir', icon:'➕', label:'Inscribir Estudiante'},
      {href:'/dashboard/tecnico/sireex', icon:'📤', label:'Grupos SIREEX'},
      {href:'/dashboard/tecnico/escalas', icon:'📄', label:'Escalas PDF'},
    ]},
    { section:'Recursos', items:[
      {href:'/dashboard/tecnico/recursos', icon:'🎬', label:'Recursos Apoyo'},
    ]},
  ],
  director: [
    { section:'Mi Sede', items:[
      {href:'/dashboard/director', icon:'📊', label:'Resumen'},
      {href:'/dashboard/director/tecnicos', icon:'👨‍🏫', label:'Mis Técnicos'},
      {href:'/dashboard/director/estudiantes', icon:'🎓', label:'Estudiantes'},
    ]},
    { section:'Permisos', items:[
      {href:'/dashboard/director/autorizaciones', icon:'🔐', label:'Autorizar Enlaces'},
    ]},
  ],
  coordinador_digeex: [
    { section:'SIREEX', items:[
      {href:'/dashboard/coordinador', icon:'✅', label:'Validación'},
      {href:'/dashboard/coordinador/grupos', icon:'📤', label:'Grupos'},
      {href:'/dashboard/coordinador/exportar', icon:'📥', label:'Exportar'},
    ]},
  ],
  enlace_institucional: [
    { section:'Mi Institución', items:[
      {href:'/dashboard/enlace', icon:'📊', label:'Resumen'},
      {href:'/dashboard/enlace/estudiantes', icon:'🎓', label:'Estudiantes'},
      {href:'/dashboard/enlace/notas', icon:'📝', label:'Ingresar Notas'},
    ]},
  ],
  estudiante: [
    { section:'Mi Espacio', items:[
      {href:'/dashboard/estudiante', icon:'🏠', label:'Inicio'},
      {href:'/dashboard/estudiante/calificaciones', icon:'📝', label:'Mis Notas'},
      {href:'/dashboard/estudiante/documentos', icon:'📎', label:'Documentos'},
      {href:'/dashboard/estudiante/recursos', icon:'🎬', label:'Recursos'},
      {href:'/dashboard/estudiante/perfil', icon:'👤', label:'Mi Perfil'},
    ]},
  ],
}

export default function Sidebar({ rol, nombre, correo }: { rol:RolUsuario; nombre:string; correo:string }) {
  const path = usePathname()
  const iniciales = nombre.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase()

  const logout = async () => {
    await fetch('/api/auth/logout', { method:'POST' })
    window.location.href = '/login'
  }

  return (
    <aside className="sidebar">
      <div className="sb-logo">
        <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0">P</div>
        <div>
          <div className="text-white font-extrabold text-base leading-tight">PRONEA</div>
          <div className="text-white/50 text-[9px] font-bold tracking-widest uppercase">Sacatepéquez</div>
        </div>
      </div>

      <nav className="flex-1 py-2">
        {(NAV[rol] ?? []).map(({ section, items }) => (
          <div key={section}>
            <div className="sb-section">{section}</div>
            {items.map(({ href, icon, label }) => (
              <Link key={href} href={href}>
                <div className={cn('sb-item', path===href && 'active')}>
                  <span className="w-5 text-center text-sm">{icon}</span>
                  <span>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sb-user">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{iniciales}</div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-xs font-bold truncate">{nombre}</div>
          <div className="text-white/50 text-[10px] truncate">{correo}</div>
        </div>
        <button onClick={logout} title="Salir" className="text-white/50 hover:text-red-400 transition-colors text-sm px-1">⬅</button>
      </div>
    </aside>
  )
}
