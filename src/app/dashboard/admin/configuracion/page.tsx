'use client'
// src/app/dashboard/admin/configuracion/page.tsx
// FIX: Configuración con secciones claras y parámetros bien descritos
import { useState, useEffect } from 'react'

const BOOLEAN_PARAMS = [
  'documentos_obligatorios',
  'documentos_visibles',
  'documentos_visibles_estudiante',
  'documentos_visibles_tecnico',
  'permisos_delegados_activos',
  'asistencia_qr_activa',
  'sireex_codigo_manual',
  'coordinador_filtro_depto',
]

const PARAM_LABELS: Record<string, { label: string; desc: string; seccion: string }> = {
  INTENTOS_LOGIN:                  { label: 'Intentos de login', desc: 'Intentos fallidos antes de bloquear la cuenta', seccion: 'Seguridad' },
  MINUTOS_BLOQUEO_LOGIN:           { label: 'Minutos de bloqueo', desc: 'Tiempo de bloqueo tras agotar intentos fallidos', seccion: 'Seguridad' },
  documentos_obligatorios:         { label: 'Documentos obligatorios', desc: 'Si se requieren documentos para inscribir un estudiante', seccion: 'Inscripción' },
  documentos_visibles:             { label: 'Documentos visibles', desc: 'Si los documentos son visibles en el portal', seccion: 'Inscripción' },
  documentos_visibles_estudiante:  { label: 'Documentos visibles al estudiante', desc: 'Si el estudiante puede ver sus documentos', seccion: 'Inscripción' },
  documentos_visibles_tecnico:     { label: 'Documentos visibles al técnico', desc: 'Si el técnico puede ver documentos de sus estudiantes', seccion: 'Inscripción' },
  ciclo_escolar_actual:            { label: 'Ciclo escolar actual', desc: 'Año del ciclo escolar vigente', seccion: 'Académico' },
  asistencia_qr_activa:            { label: 'Asistencia QR activa', desc: 'Habilita el sistema de asistencia por código QR', seccion: 'Asistencia' },
  asistencia_radio_default_m:      { label: 'Radio GPS asistencia (metros)', desc: 'Distancia máxima permitida desde la sede para marcar asistencia', seccion: 'Asistencia' },
  dua_max_estudiantes:             { label: 'Máx. estudiantes por grupo DUA', desc: 'Número máximo de estudiantes en un grupo DUA', seccion: 'DUA' },
  sireex_codigo_manual:            { label: 'Código SIREEX manual', desc: 'El técnico ingresa el código SIREEX de MINEDUC manualmente', seccion: 'SIREEX' },
  coordinador_filtro_depto:        { label: 'Filtro departamental coordinador', desc: 'Los coordinadores solo ven datos de su departamento', seccion: 'Coordinadores' },
  permisos_delegados_activos:      { label: 'Permisos delegados activos', desc: 'Sistema de delegación de permisos a enlaces', seccion: 'Permisos' },
}

export default function ConfiguracionPage() {
  const [config, setConfig]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [msg,     setMsg]     = useState('')

  useEffect(() => {
    fetch('/api/configuracion').then(r => r.json())
      .then(d => setConfig(d.raw ?? []))
      .finally(() => setLoading(false))
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const actualizar = async (parametro: string, valor: string) => {
    setSaving(parametro)
    const res = await fetch('/api/configuracion', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parametro, valor }),
    })
    const d = await res.json()
    if (res.ok) {
      setConfig(c => c.map((cc: any) => cc.parametro === parametro ? { ...cc, valor } : cc))
      flash(`✅ ${PARAM_LABELS[parametro]?.label ?? parametro} actualizado`)
    } else {
      flash(`❌ ${d.error}`)
    }
    setSaving(null)
  }

  // Agrupar por sección
  const secciones: Record<string, any[]> = {}
  config.forEach(c => {
    const info = PARAM_LABELS[c.parametro]
    const sec  = info?.seccion ?? 'Otros'
    if (!secciones[sec]) secciones[sec] = []
    secciones[sec].push(c)
  })

  const SECCION_ICONS: Record<string, string> = {
    Seguridad: '🔒', Inscripción: '📋', Académico: '📚',
    Asistencia: '📍', DUA: '♿', SIREEX: '📤',
    Coordinadores: '👁️', Permisos: '🔐', Otros: '⚙️',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">⚙️ Configuración del Sistema</div>
      </header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : config.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">⚙️</div>
            <div className="font-semibold">Sin configuración</div>
            <div className="text-sm mt-1">Ejecuta las migraciones SQL para cargar la configuración inicial</div>
          </div>
        ) : (
          Object.entries(secciones).map(([seccion, params]) => (
            <div key={seccion} className="card mb-4">
              <div className="card-title">
                {SECCION_ICONS[seccion] ?? '⚙️'} {seccion}
              </div>
              <div className="space-y-3">
                {params.map((c: any) => {
                  const info = PARAM_LABELS[c.parametro]
                  const isBoolean = BOOLEAN_PARAMS.includes(c.parametro)
                  return (
                    <div key={c.parametro} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 gap-4">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-700">{info?.label ?? c.parametro}</div>
                        <div className="text-xs text-gray-400">{info?.desc ?? c.descripcion ?? ''}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isBoolean ? (
                          <>
                            <span className={`badge ${c.valor === 'true' ? 'badge-green' : 'badge-red'}`}>
                              {c.valor === 'true' ? 'Activo' : 'Inactivo'}
                            </span>
                            {saving === c.parametro
                              ? <div className="w-10 h-5 flex items-center justify-center"><div className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
                              : (
                                <div
                                  className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${c.valor === 'true' ? 'bg-pronea-secondary' : 'bg-gray-300'}`}
                                  onClick={() => actualizar(c.parametro, c.valor === 'true' ? 'false' : 'true')}>
                                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${c.valor === 'true' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                </div>
                              )
                            }
                          </>
                        ) : (
                          saving === c.parametro
                            ? <div className="w-5 h-5 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                            : <input
                                className="inp w-24 text-center text-sm font-bold"
                                defaultValue={c.valor}
                                onBlur={e => { if (e.target.value !== c.valor) actualizar(c.parametro, e.target.value) }}
                                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              />
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
