'use client'
// src/app/dashboard/admin/configuracion/page.tsx
// CORRECCIÓN: incluye sección de perfil personal del administrador
import { useState, useEffect } from 'react'

const BOOLEAN_PARAMS = [
  'documentos_obligatorios','documentos_visibles','documentos_visibles_estudiante',
  'documentos_visibles_tecnico','permisos_delegados_activos','asistencia_qr_activa',
  'sireex_codigo_manual','coordinador_filtro_depto',
]

const PARAM_LABELS: Record<string, { label: string; desc: string; seccion: string }> = {
  INTENTOS_LOGIN:                 { label: 'Intentos de login',            desc: 'Intentos fallidos antes de bloquear la cuenta',             seccion: 'Seguridad' },
  MINUTOS_BLOQUEO_LOGIN:          { label: 'Minutos de bloqueo',           desc: 'Tiempo de bloqueo tras agotar intentos fallidos',            seccion: 'Seguridad' },
  ciclo_escolar_actual:           { label: 'Ciclo escolar actual',         desc: 'Año del ciclo escolar vigente — afecta todo el sistema',     seccion: 'Académico' },
  porcentaje_tareas:              { label: '% Ponderación tareas',         desc: 'Porcentaje que valen las tareas (defecto: 60)',              seccion: 'Académico' },
  porcentaje_examenes:            { label: '% Ponderación exámenes',       desc: 'Porcentaje que valen los exámenes (defecto: 40)',            seccion: 'Académico' },
  nota_minima_promocion:          { label: 'Nota mínima promoción',        desc: 'Nota mínima para promover por área (defecto: 60)',           seccion: 'Académico' },
  puntos_max_tareas:              { label: 'Puntos máx. tareas',           desc: 'Puntos máximos de tareas por área por libro (defecto: 30)', seccion: 'Académico' },
  puntos_max_examen:              { label: 'Puntos máx. examen',           desc: 'Puntos máximos de examen por área por libro (defecto: 20)', seccion: 'Académico' },
  documentos_obligatorios:        { label: 'Documentos obligatorios',      desc: 'Requiere documentos para inscribir estudiante',             seccion: 'Inscripción' },
  documentos_visibles:            { label: 'Documentos visibles',          desc: 'Documentos visibles en el portal',                          seccion: 'Inscripción' },
  documentos_visibles_estudiante: { label: 'Documentos visibles al estudiante', desc: 'El estudiante puede ver sus documentos',             seccion: 'Inscripción' },
  documentos_visibles_tecnico:    { label: 'Documentos visibles al técnico',    desc: 'El técnico puede ver documentos de sus estudiantes', seccion: 'Inscripción' },
  asistencia_qr_activa:           { label: 'Asistencia QR activa',         desc: 'Habilita asistencia por código QR',                         seccion: 'Asistencia' },
  asistencia_radio_default_m:     { label: 'Radio GPS asistencia (metros)', desc: 'Distancia máxima desde la sede para marcar asistencia',   seccion: 'Asistencia' },
  dua_max_estudiantes:            { label: 'Máx. estudiantes por grupo DUA', desc: 'Número máximo de estudiantes en un grupo DUA',           seccion: 'DUA' },
  sireex_codigo_manual:           { label: 'Código SIREEX manual',         desc: 'El técnico ingresa el código SIREEX de MINEDUC manualmente', seccion: 'SIREEX' },
  coordinador_filtro_depto:       { label: 'Filtro departamental coordinador', desc: 'Los coordinadores solo ven datos de su departamento',  seccion: 'Coordinadores' },
  permisos_delegados_activos:     { label: 'Permisos delegados activos',   desc: 'Sistema de delegación de permisos a enlaces',              seccion: 'Permisos' },
}

export default function ConfiguracionPage() {
  const [config,  setConfig]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState<string | null>(null)
  const [msg,     setMsg]     = useState('')

  // Perfil del admin
  const [perfil,        setPerfil]        = useState<any>({})
  const [savingPerfil,  setSavingPerfil]  = useState(false)
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' })
  const [savingPwd,     setSavingPwd]     = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  useEffect(() => {
    Promise.all([
      fetch('/api/configuracion').then(r => r.json()).catch(() => []),
      fetch('/api/mi-perfil').then(r => r.json()).catch(() => ({})),
    ]).then(([cfg, prf]) => {
      setConfig(Array.isArray(cfg) ? cfg : [])
      setPerfil(prf?.perfil ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const actualizarParam = async (parametro: string, valor: string) => {
    setSaving(parametro)
    await fetch('/api/configuracion', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parametro, valor }),
    })
    setConfig(prev => prev.map(c => c.parametro === parametro ? { ...c, valor } : c))
    setSaving(null)
    flash('✅ Parámetro actualizado')
  }

  const guardarPerfil = async () => {
    setSavingPerfil(true)
    await fetch('/api/establecimiento', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        director_nombre: perfil.director_nombre,
        director_titulo: perfil.director_titulo,
        telefono:        perfil.telefono,
        whatsapp:        perfil.whatsapp,
        correo:          perfil.correo,
      }),
    })
    flash('✅ Datos del responsable actualizados')
    setSavingPerfil(false)
  }

  const cambiarPassword = async () => {
    if (!pwd.actual || !pwd.nueva || !pwd.confirmar) { flash('❌ Todos los campos requeridos'); return }
    if (pwd.nueva !== pwd.confirmar) { flash('❌ Las contraseñas no coinciden'); return }
    if (pwd.nueva.length < 8) { flash('❌ Mínimo 8 caracteres'); return }
    setSavingPwd(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: pwd.actual, contrasena_nueva: pwd.nueva }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) setPwd({ actual: '', nueva: '', confirmar: '' })
    setSavingPwd(false)
  }

  // Agrupar parámetros por sección
  const porSeccion: Record<string, any[]> = {}
  config.forEach(c => {
    const info = PARAM_LABELS[c.parametro]
    const sec = info?.seccion ?? 'Otros'
    if (!porSeccion[sec]) porSeccion[sec] = []
    porSeccion[sec].push({ ...c, info })
  })

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">⚙️ Configuración</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">⚙️ Configuración del Sistema</div>
      </header>
      <div className="pc max-w-3xl space-y-5">
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* ── PERFIL DEL RESPONSABLE ── */}
        <div className="card">
          <div className="card-title">👤 Datos del Responsable / Administrador</div>
          <div className="text-xs text-gray-400 mb-4">
            Correo de acceso: <span className="font-mono font-bold">{perfil.correo ?? '—'}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { k: 'director_nombre', label: 'Nombre del director / responsable', placeholder: 'Nombre completo' },
              { k: 'director_titulo', label: 'Título o cargo',                    placeholder: 'Director(a) PRONEA' },
              { k: 'telefono',        label: 'Teléfono institucional',             placeholder: '2222-3333' },
              { k: 'whatsapp',        label: 'WhatsApp',                          placeholder: '5555-1234' },
            ].map(({ k, label, placeholder }) => (
              <div key={k} className="fg">
                <label className="lbl">{label}</label>
                <input className="inp" value={perfil[k] ?? ''} placeholder={placeholder}
                  onChange={e => setPerfil((p: any) => ({ ...p, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          <div className="mt-3">
            <button className="btn btn-p" onClick={guardarPerfil} disabled={savingPerfil}>
              {savingPerfil ? '...' : '💾 Guardar datos del responsable'}
            </button>
          </div>
        </div>

        {/* ── CAMBIAR CONTRASEÑA ── */}
        <div className="card">
          <div className="card-title">🔒 Cambiar Contraseña</div>
          <div className="space-y-3">
            <div className="fg">
              <label className="lbl">Contraseña actual</label>
              <input type="password" className="inp" value={pwd.actual}
                onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} />
            </div>
            <div className="fg2">
              <div className="fg">
                <label className="lbl">Nueva contraseña</label>
                <input type="password" className="inp" value={pwd.nueva}
                  onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="lbl">Confirmar nueva</label>
                <input type="password" className="inp" value={pwd.confirmar}
                  onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
              </div>
            </div>
            <button className="btn btn-g" onClick={cambiarPassword} disabled={savingPwd}>
              {savingPwd ? '...' : '🔒 Actualizar contraseña'}
            </button>
          </div>
        </div>

        {/* ── PARÁMETROS DEL SISTEMA ── */}
        {Object.entries(porSeccion).map(([seccion, params]) => (
          <div key={seccion} className="card">
            <div className="card-title">{seccion}</div>
            <div className="space-y-3">
              {params.map((c: any) => {
                const esBoolean = BOOLEAN_PARAMS.includes(c.parametro)
                const valor = c.valor === 'true' ? true : c.valor === 'false' ? false : c.valor
                return (
                  <div key={c.parametro} className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-gray-800">{c.info?.label ?? c.parametro}</div>
                      <div className="text-xs text-gray-400">{c.info?.desc}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {esBoolean ? (
                        <button
                          onClick={() => actualizarParam(c.parametro, valor ? 'false' : 'true')}
                          disabled={saving === c.parametro}
                          className={`relative w-11 h-6 rounded-full transition-colors ${valor ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${valor ? 'translate-x-5' : ''}`} />
                        </button>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            className="inp w-28 text-right font-mono text-sm"
                            defaultValue={c.valor}
                            onBlur={e => {
                              if (e.target.value !== c.valor) actualizarParam(c.parametro, e.target.value)
                            }}
                            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          />
                          {saving === c.parametro && (
                            <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block mt-1" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {config.length === 0 && (
          <div className="card text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">⚙️</div>
            <div className="font-semibold">Sin parámetros de configuración</div>
            <div className="text-sm mt-1">Ejecuta el SQL del Batch 1 para crear los parámetros base</div>
          </div>
        )}
      </div>
    </div>
  )
}

