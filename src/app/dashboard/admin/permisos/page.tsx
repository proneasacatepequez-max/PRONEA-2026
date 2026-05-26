'use client'
// src/app/dashboard/admin/permisos/page.tsx
// FIX: Los permisos que activa el admin se reflejan en todos los usuarios
import { useState, useEffect } from 'react'

const PERMISO_INFO: Record<string, { label: string; desc: string; rol: string }> = {
  ingresar_notas_enlace:        { label: 'Ingresar notas',         desc: 'El enlace puede registrar notas de tareas y exámenes',    rol: 'Enlace' },
  ver_documentos_enlace:        { label: 'Ver documentos',         desc: 'El enlace puede consultar documentos de estudiantes',     rol: 'Enlace' },
  inscribir_estudiantes_enlace: { label: 'Inscribir estudiantes',  desc: 'El enlace puede inscribir nuevos estudiantes',            rol: 'Enlace' },
  exportar_datos_enlace:        { label: 'Exportar datos',         desc: 'El enlace puede exportar listados en CSV',                rol: 'Enlace' },
  gestionar_sesiones_enlace:    { label: 'Gestionar sesiones',     desc: 'El enlace puede registrar sesiones de tutoría',           rol: 'Enlace' },
  modificar_escalas_tecnico:    { label: 'Modificar escalas',      desc: 'El técnico puede editar sus propias escalas numéricas',   rol: 'Técnico' },
  aprobar_escalas_director:     { label: 'Aprobar escalas',        desc: 'El director puede aprobar o bloquear escalas numéricas',  rol: 'Director' },
}

export default function PermisosPage() {
  const [permisos, setPermisos]   = useState<any[]>([])
  const [loading,  setLoading]    = useState(true)
  const [saving,   setSaving]     = useState<string | null>(null)
  const [msg,      setMsg]        = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    fetch('/api/permisos').then(r => r.json())
      .then(d => setPermisos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const togglePermiso = async (permiso: string, activo: boolean) => {
    setSaving(permiso)
    const res = await fetch('/api/permisos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permiso, activo: !activo }),
    })
    const d = await res.json()
    if (res.ok) {
      setPermisos(p => p.map(pp => pp.permiso === permiso ? { ...pp, activo: !activo } : pp))
      flash(`✅ Permiso "${PERMISO_INFO[permiso]?.label ?? permiso}" ${!activo ? 'activado' : 'desactivado'}`)
    } else {
      flash('❌ ' + (d.error ?? 'Error'))
    }
    setSaving(null)
  }

  // Agrupar por rol
  const porRol: Record<string, any[]> = {}
  permisos.forEach(p => {
    const info = PERMISO_INFO[p.permiso]
    const rol  = info?.rol ?? 'Otro'
    if (!porRol[rol]) porRol[rol] = []
    porRol[rol].push(p)
  })

  const ROL_COLOR: Record<string, string> = {
    'Enlace':   'bg-orange-100 text-orange-800 border-orange-200',
    'Técnico':  'bg-blue-100 text-blue-800 border-blue-200',
    'Director': 'bg-green-100 text-green-800 border-green-200',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🔐 Permisos del Sistema</div>
          <div className="text-xs text-gray-400">Los cambios se reflejan inmediatamente en todos los usuarios</div>
        </div>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-5">
          <div className="text-xs">
            <b>📋 Cómo funcionan los permisos:</b><br />
            1. El <b>Admin</b> activa el permiso global aquí<br />
            2. El <b>Director</b> crea una autorización específica para un enlace<br />
            3. El <b>Admin</b> confirma la autorización del director<br />
            4. El <b>Enlace</b> puede ejecutar la acción
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : permisos.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">🔐</div>
            <div className="font-semibold">Sin permisos configurados</div>
            <div className="text-sm mt-1">Ejecuta el SQL maestro v8 en Supabase para crear los permisos</div>
          </div>
        ) : (
          Object.entries(porRol).map(([rol, perms]) => (
            <div key={rol} className="card mb-4">
              <div className="card-title">
                <span className={`badge border ${ROL_COLOR[rol] ?? 'badge-gray'} mr-2`}>{rol}</span>
                Permisos para {rol}
              </div>
              <div className="space-y-3">
                {perms.map((p: any) => {
                  const info = PERMISO_INFO[p.permiso]
                  return (
                    <div key={p.permiso} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                      <div className="flex-1 min-w-0 mr-4">
                        <div className="text-sm font-bold text-gray-700">{info?.label ?? p.permiso}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{info?.desc}</div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`badge text-xs ${p.activo ? 'badge-green' : 'badge-red'}`}>
                          {p.activo ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                        {saving === p.permiso ? (
                          <div className="w-10 h-5 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <div
                            className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${p.activo ? 'bg-pronea-secondary' : 'bg-gray-300'}`}
                            onClick={() => togglePermiso(p.permiso, p.activo)}>
                            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.activo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
