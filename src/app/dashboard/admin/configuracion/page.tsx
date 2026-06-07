'use client'
// src/app/dashboard/admin/configuracion/page.tsx
// FIX CRÍTICO: perfil del administrador (persona) separado de datos del establecimiento (director)
import { useState, useEffect } from 'react'

export default function ConfiguracionPage() {
  const [config,       setConfig]       = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState<string | null>(null)
  const [msg,          setMsg]          = useState('')
  const [tab,          setTab]          = useState<'sistema'|'establecimiento'>('sistema')

  // Datos del establecimiento (director/institución)
  const [estab,        setEstab]        = useState<any>({})
  const [savingEstab,  setSavingEstab]  = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  useEffect(() => {
    Promise.all([
      fetch('/api/configuracion').then(r => r.json()).catch(() => []),
      fetch('/api/establecimiento').then(r => r.json()).catch(() => ({})),
    ]).then(([cfg, est]) => {
      setConfig(Array.isArray(cfg) ? cfg : [])
      setEstab(est ?? {})
    }).finally(() => setLoading(false))
  }, [])

  const actualizarParam = async (parametro: string, valor: string) => {
    setSaving(parametro)
    const res = await fetch('/api/configuracion', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ parametro, valor }),
    })
    if (res.ok) {
      setConfig(prev => prev.map(c => c.parametro === parametro ? { ...c, valor } : c))
      flash('✅ Parámetro actualizado')
    } else flash('❌ Error al actualizar')
    setSaving(null)
  }

  const guardarEstab = async () => {
    setSavingEstab(true)
    const res = await fetch('/api/establecimiento', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(estab),
    })
    flash(res.ok ? '✅ Datos del establecimiento actualizados' : '❌ Error al guardar')
    setSavingEstab(false)
  }

  const PARAM_LABELS: Record<string, { label: string; desc: string; seccion: string }> = {
    ciclo_escolar_actual:  { label: 'Ciclo escolar actual', desc: 'Afecta todo el sistema', seccion: 'Académico' },
    porcentaje_tareas:     { label: '% Tareas (zona)',      desc: 'Ponderación de tareas (defecto: 60)', seccion: 'Académico' },
    porcentaje_examenes:   { label: '% Exámenes',           desc: 'Ponderación de exámenes (defecto: 40)', seccion: 'Académico' },
    nota_minima_promocion: { label: 'Nota mínima',          desc: 'Para promover por área (defecto: 60)', seccion: 'Académico' },
    puntos_max_tareas:     { label: 'Puntos máx. tareas',   desc: 'Por área por libro (defecto: 30)', seccion: 'Académico' },
    puntos_max_examen:     { label: 'Puntos máx. examen',   desc: 'Por área por libro (defecto: 20)', seccion: 'Académico' },
    INTENTOS_LOGIN:        { label: 'Intentos de login',    desc: 'Antes de bloquear la cuenta', seccion: 'Seguridad' },
    MINUTOS_BLOQUEO_LOGIN: { label: 'Minutos de bloqueo',   desc: 'Tiempo de bloqueo tras intentos fallidos', seccion: 'Seguridad' },
  }

  const porSeccion: Record<string, any[]> = {}
  config.forEach(c => {
    const info = PARAM_LABELS[c.parametro]
    const sec  = info?.seccion ?? 'Otros'
    if (!porSeccion[sec]) porSeccion[sec] = []
    porSeccion[sec].push({ ...c, info })
  })

  const E = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setEstab((p: any) => ({ ...p, [k]: e.target.value }))

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
      <div className="pc max-w-4xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Tabs */}
        <div className="flex gap-2 mb-5 border-b">
          {[
            { k:'sistema',        l:'⚙️ Parámetros del Sistema' },
            { k:'establecimiento', l:'🏛️ Datos del Establecimiento' },
          ].map(t => (
            <button key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${tab===t.k ? 'border-pronea text-pronea bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Tab: Sistema */}
        {tab === 'sistema' && (
          <div className="space-y-4">
            {Object.entries(porSeccion).map(([seccion, params]) => (
              <div key={seccion} className="card">
                <div className="card-title">{seccion}</div>
                <div className="space-y-3">
                  {params.map((c: any) => (
                    <div key={c.parametro}
                      className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-800">{c.info?.label ?? c.parametro}</div>
                        <div className="text-xs text-gray-400">{c.info?.desc}</div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <input
                          className="inp w-28 text-right font-mono text-sm"
                          defaultValue={c.valor}
                          onBlur={e => { if (e.target.value !== c.valor) actualizarParam(c.parametro, e.target.value) }}
                          onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                        />
                        {saving === c.parametro && (
                          <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {config.length === 0 && (
              <div className="card text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">⚙️</div>
                <div>Sin parámetros. Ejecuta el SQL del Batch 1.</div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Establecimiento — datos del DIRECTOR, NO del admin */}
        {tab === 'establecimiento' && (
          <div className="card">
            <div className="card-title">🏛️ Datos del Establecimiento PRONEA</div>
            <div className="alert al-i mb-4 text-xs">
              Estos datos aparecen en la pantalla de login y en los documentos generados.
              Aquí va el nombre del <b>director del programa</b>, no del administrador del sistema.
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="fg"><label className="lbl">Nombre completo del establecimiento</label>
                  <input className="inp" value={estab.nombre_completo ?? ''} onChange={E('nombre_completo')} /></div>
                <div className="fg"><label className="lbl">Nombre corto</label>
                  <input className="inp" value={estab.nombre_corto ?? ''} onChange={E('nombre_corto')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="fg"><label className="lbl">Nombre del Director del Programa</label>
                  <input className="inp" value={estab.director_nombre ?? ''} onChange={E('director_nombre')}
                    placeholder="Ej: Mario Alfonso Toj Tepáz" /></div>
                <div className="fg"><label className="lbl">Título del Director</label>
                  <input className="inp" value={estab.director_titulo ?? ''} onChange={E('director_titulo')}
                    placeholder="Ej: Director(a) PRONEA Sacatepéquez" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="fg"><label className="lbl">Departamento</label>
                  <input className="inp" value={estab.departamento ?? ''} onChange={E('departamento')} /></div>
                <div className="fg"><label className="lbl">Municipio</label>
                  <input className="inp" value={estab.municipio ?? ''} onChange={E('municipio')} /></div>
              </div>
              <div className="fg"><label className="lbl">Dirección</label>
                <input className="inp" value={estab.direccion ?? ''} onChange={E('direccion')} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" value={estab.telefono ?? ''} onChange={E('telefono')} /></div>
                <div className="fg"><label className="lbl">WhatsApp</label>
                  <input className="inp" value={estab.whatsapp ?? ''} onChange={E('whatsapp')} /></div>
                <div className="fg"><label className="lbl">Correo institucional</label>
                  <input type="email" className="inp" value={estab.correo ?? ''} onChange={E('correo')} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="fg"><label className="lbl">Horario de atención</label>
                  <input className="inp" value={estab.horario_atencion ?? ''} onChange={E('horario_atencion')}
                    placeholder="Lunes a viernes 8:00 a 16:00" /></div>
                <div className="fg"><label className="lbl">Facebook</label>
                  <input className="inp" value={estab.facebook ?? ''} onChange={E('facebook')} /></div>
              </div>
              <div className="flex justify-end mt-2">
                <button className="btn btn-p" onClick={guardarEstab} disabled={savingEstab}>
                  {savingEstab
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    : '💾 Guardar datos del establecimiento'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
