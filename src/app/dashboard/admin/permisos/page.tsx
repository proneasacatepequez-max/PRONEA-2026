'use client'
// src/app/dashboard/admin/permisos/page.tsx
// CORRECCIÓN: toggle usa PUT (no PATCH) y actualiza estado localmente sin recargar
import { useState, useEffect } from 'react'

const PERMISO_INFO: Record<string, { label: string; desc: string; rol: string; color: string; obligatorio?: boolean }> = {
  inscribir_estudiantes_enlace: {
    label: 'Inscribir estudiantes',
    desc:  'El enlace puede inscribir nuevos estudiantes sin necesitar autorización adicional del director. Recomendado: ACTIVADO.',
    rol: 'Enlace', color: 'orange', obligatorio: true,
  },
  ingresar_notas_enlace: {
    label: 'Ingresar notas',
    desc:  'Habilita globalmente que los enlaces puedan ingresar notas. El director también debe autorizar a cada enlace específicamente.',
    rol: 'Enlace', color: 'orange',
  },
  ver_documentos_enlace: {
    label: 'Ver documentos',
    desc:  'El enlace puede consultar documentos de sus estudiantes.',
    rol: 'Enlace', color: 'orange',
  },
  exportar_datos_enlace: {
    label: 'Exportar datos Excel',
    desc:  'El enlace puede descargar Excel de sus estudiantes.',
    rol: 'Enlace', color: 'orange', obligatorio: true,
  },
  modificar_escalas_tecnico: {
    label: 'Crear/modificar escalas',
    desc:  'El técnico puede crear y llenar escalas numéricas de calificación.',
    rol: 'Técnico', color: 'blue', obligatorio: true,
  },
  aprobar_escalas_director: {
    label: 'Aprobar escalas',
    desc:  'El director puede aprobar o bloquear escalas numéricas de sus técnicos.',
    rol: 'Director', color: 'green', obligatorio: true,
  },
}

const ROL_COLOR: Record<string, string> = {
  Enlace:   'bg-orange-50 border-l-4 border-l-orange-400',
  Técnico:  'bg-blue-50   border-l-4 border-l-blue-400',
  Director: 'bg-green-50  border-l-4 border-l-green-400',
}

const BADGE_COLOR: Record<string, string> = {
  Enlace:   'bg-orange-100 text-orange-700',
  Técnico:  'bg-blue-100   text-blue-700',
  Director: 'bg-green-100  text-green-700',
}

export default function PermisosPage() {
  const [permisos, setPermisos] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [msg,      setMsg]      = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const cargar = async () => {
    setLoading(true)
    const res = await fetch('/api/permisos')
    const d   = await res.json()
    // Si no existen aún, crear la estructura base
    if (Array.isArray(d) && d.length === 0) {
      // Crear permisos base
      await fetch('/api/permisos/init', { method: 'POST' }).catch(() => {})
      const res2 = await fetch('/api/permisos')
      const d2 = await res2.json()
      setPermisos(Array.isArray(d2) ? d2 : [])
    } else {
      setPermisos(Array.isArray(d) ? d : [])
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const toggle = async (permiso: string, activo: boolean) => {
    setSaving(permiso)
    const res = await fetch('/api/permisos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ permiso, activo: !activo }),
    })
    if (res.ok) {
      // Actualizar estado local inmediatamente
      setPermisos(prev => prev.map(p =>
        p.permiso === permiso ? { ...p, activo: !activo } : p
      ))
      const info = PERMISO_INFO[permiso]
      flash(`✅ "${info?.label ?? permiso}" ${!activo ? 'ACTIVADO' : 'DESACTIVADO'}`)
    } else {
      const d = await res.json()
      flash('❌ ' + (d.error ?? 'Error al actualizar'))
    }
    setSaving(null)
  }

  // Agrupar por rol
  const porRol: Record<string, any[]> = {}
  const ordenRoles = ['Enlace', 'Técnico', 'Director']
  const todosLosPermisos = Object.keys(PERMISO_INFO)

  // Mezclar permisos de BD con los definidos
  const permisosMap = new Map(permisos.map(p => [p.permiso, p]))
  todosLosPermisos.forEach(clave => {
    const info = PERMISO_INFO[clave]
    if (!info) return
    if (!porRol[info.rol]) porRol[info.rol] = []
    porRol[info.rol].push(permisosMap.get(clave) ?? { permiso: clave, activo: false })
  })

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">🔐 Permisos Globales</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">🔐 Permisos Globales del Sistema</div>
      </header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Explicación */}
        <div className="alert al-i mb-5 text-sm">
          <div>
            <b>¿Cómo funcionan los permisos?</b><br />
            <b>Permisos Globales (aquí)</b>: el administrador activa o desactiva cada función para todo el sistema.
            Si un permiso está desactivado aquí, nadie puede usarlo aunque el director lo haya autorizado.<br />
            <b>Autorizaciones (siguiente pantalla)</b>: el director autoriza a cada enlace específico. Para que surta
            efecto, el permiso global también debe estar activo.
          </div>
        </div>

        <div className="space-y-4">
          {ordenRoles.map(rol => (
            <div key={rol} className="card">
              <div className="flex items-center gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-extrabold ${BADGE_COLOR[rol]}`}>
                  {rol === 'Enlace' ? '🔗 Permisos del Enlace' : rol === 'Técnico' ? '👨‍🏫 Permisos del Técnico' : '🏫 Permisos del Director'}
                </span>
              </div>
              <div className="space-y-3">
                {(porRol[rol] ?? []).map((p: any) => {
                  const info    = PERMISO_INFO[p.permiso]
                  const activo  = p.activo ?? false
                  const isSav   = saving === p.permiso

                  return (
                    <div key={p.permiso}
                      className={`rounded-xl p-4 ${ROL_COLOR[rol]} flex items-start justify-between gap-4`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-extrabold text-gray-800">{info?.label ?? p.permiso}</span>
                          {info?.obligatorio && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              Recomendado activo
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{info?.desc}</div>
                        <div className="text-xs mt-1.5">
                          <span className={`font-bold ${activo ? 'text-green-600' : 'text-red-500'}`}>
                            {activo ? '✅ ACTIVO — los usuarios pueden usar esta función' : '🔴 INACTIVO — la función está deshabilitada para todos'}
                          </span>
                        </div>
                      </div>

                      {/* Toggle switch */}
                      <button
                        onClick={() => toggle(p.permiso, activo)}
                        disabled={isSav}
                        className={`relative flex-shrink-0 w-12 h-6 rounded-full transition-all duration-200 ${activo ? 'bg-green-500' : 'bg-gray-300'} ${isSav ? 'opacity-60' : 'cursor-pointer hover:opacity-90'}`}
                        title={activo ? 'Desactivar' : 'Activar'}
                      >
                        {isSav ? (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          </span>
                        ) : (
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${activo ? 'translate-x-6' : 'translate-x-0'}`} />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="alert al-i mt-5 text-xs">
          <b>Nota:</b> "Inscribir estudiantes" para el enlace debe permanecer activo — es una función básica del rol enlace
          y no requiere autorización del director.
        </div>
      </div>
    </div>
  )
}
