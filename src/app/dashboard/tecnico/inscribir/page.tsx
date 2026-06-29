'use client'
// src/app/dashboard/tecnico/inscribir/page.tsx
// CORREGIDO: confirmarInscripcion ahora envía tecnico_id (bug crítico que causaba 400)
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Modo = 'buscar' | 'nuevo' | 'reinscribir' | 'exito'

export default function InscribirEstudiantePage() {
  const router = useRouter()
  const [modo,    setModo]    = useState<Modo>('buscar')
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  // Perfil del técnico logueado — necesario para tecnico_id
  const [miTecnicoId, setMiTecnicoId] = useState<string | null>(null)

  // Búsqueda
  const [buscarQ,       setBuscarQ]       = useState('')
  const [buscando,      setBuscando]      = useState(false)
  const [resultados,    setResultados]    = useState<any[]>([])
  const [estudianteSel, setEstudianteSel] = useState<any>(null)

  // Catálogos
  const [departamentos, setDepts]  = useState<any[]>([])
  const [municipios,    setMunis]  = useState<any[]>([])
  const [etapas,        setEtapas] = useState<any[]>([])
  const [sedes,         setSedes]  = useState<any[]>([])
  const [discapacidades,setDiscap] = useState<any[]>([])

  // Form nuevo estudiante
  const [est, setEst] = useState({
    primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
    cui:'', cui_pendiente:false, codigo_estudiante:'',
    fecha_nacimiento:'', genero:'',
    telefono:'', telefono_alternativo:'', correo:'',
    departamento_id:'', municipio_id:'',
    direccion:'', discapacidad_id:'',
    es_extranjero:false, numero_documento:'', tipo_documento:'DPI',
  })

  // Form inscripción
  const [insc, setInsc] = useState({
    etapa_id:'', sede_id:'', version_libro:'nuevo', ciclo_escolar:'2026',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  // Cargar catálogos y perfil del técnico
  useEffect(() => {
    Promise.all([
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
      // CORREGIDO: obtener el id del técnico logueado
      fetch('/api/tecnicos?mi_perfil=1').then(r => r.json()).catch(() => null),
    ]).then(([dep, et, se, di, tec]) => {
      setDepts(Array.isArray(dep) ? dep : [])
      setEtapas(Array.isArray(et) ? et : [])
      setSedes(Array.isArray(se) ? se : [])
      setDiscap(Array.isArray(di) ? di : [])
      // El endpoint devuelve el objeto técnico directamente cuando mi_perfil=1
      if (tec?.id) setMiTecnicoId(tec.id)
    })
  }, [])

  useEffect(() => {
    if (!est.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${est.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [est.departamento_id])

  // Buscar con debounce
  useEffect(() => {
    if (buscarQ.trim().length < 3) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(buscarQ.trim())}`)
        .then(r => r.json())
        .then(d => setResultados(d.encontrados ?? []))
        .finally(() => setBuscando(false))
    }, 400)
    return () => clearTimeout(t)
  }, [buscarQ])

  const E = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setEst(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  const I = (k: string) => (e: React.ChangeEvent<HTMLSelectElement|HTMLInputElement>) =>
    setInsc(p => ({ ...p, [k]: e.target.value }))

  const seleccionarExistente = (estudiante: any) => {
    setEstudianteSel(estudiante)
    setInsc({ etapa_id:'', sede_id:'', version_libro:'nuevo', ciclo_escolar:'2026' })
    setModo('reinscribir')
  }

  const empezarNuevo = () => {
    setEst({
      primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
      cui: buscarQ.match(/^\d{13}$/) ? buscarQ : '',
      cui_pendiente:false,
      codigo_estudiante: buscarQ.match(/^EST-/) ? buscarQ : '',
      fecha_nacimiento:'', genero:'', telefono:'', telefono_alternativo:'',
      correo:'', departamento_id:'', municipio_id:'', direccion:'',
      discapacidad_id:'', es_extranjero:false, numero_documento:'', tipo_documento:'DPI',
    })
    setInsc({ etapa_id:'', sede_id:'', version_libro:'nuevo', ciclo_escolar:'2026' })
    setModo('nuevo')
  }

  const validar = () => {
    if (!est.primer_nombre.trim())   { flash('❌ Primer nombre requerido'); return false }
    if (!est.primer_apellido.trim()) { flash('❌ Primer apellido requerido'); return false }
    if (!est.telefono.trim())        { flash('❌ Teléfono requerido'); return false }
    return true
  }

  // CORREGIDO: ahora incluye tecnico_id en el POST de inscripciones
  const confirmarInscripcion = async (estudianteId: string) => {
    if (!miTecnicoId) {
      flash('❌ No se pudo obtener tu perfil de técnico. Recarga la página e intenta de nuevo.')
      setSaving(false)
      return
    }
    try {
      const res = await fetch('/api/inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: estudianteId,
          etapa_id:      parseInt(insc.etapa_id),
          sede_id:       insc.sede_id,
          tecnico_id:    miTecnicoId,       // ← CORREGIDO: antes faltaba este campo
          version_libro: insc.version_libro,
          ciclo_escolar: parseInt(insc.ciclo_escolar),
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) {
        flash('❌ ' + (d.error ?? 'Error al inscribir'))
        setSaving(false)
        return
      }
      setModo('exito')
    } catch (e: any) {
      flash('❌ Error inesperado: ' + (e?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  const inscribirNuevo = async () => {
    if (!validar()) return
    if (!insc.etapa_id || !insc.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    if (saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/estudiantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primer_nombre:        est.primer_nombre.trim(),
          segundo_nombre:       est.segundo_nombre.trim()   || null,
          primer_apellido:      est.primer_apellido.trim(),
          segundo_apellido:     est.segundo_apellido.trim() || null,
          cui:                  est.cui.trim()              || null,
          cui_pendiente:        Boolean(est.cui_pendiente),
          codigo_estudiante:    est.codigo_estudiante.trim()|| null,
          fecha_nacimiento:     est.fecha_nacimiento        || null,
          genero:               est.genero                  || null,
          telefono:             est.telefono.trim(),
          telefono_alternativo: est.telefono_alternativo.trim() || null,
          correo:               est.correo.trim()           || null,
          municipio_id:         est.municipio_id ? parseInt(est.municipio_id) : null,
          discapacidad_id:      est.discapacidad_id ? parseInt(est.discapacidad_id) : null,
          tipo_documento:       est.tipo_documento,
          es_extranjero:        Boolean(est.es_extranjero),
          numero_documento:     est.numero_documento.trim() || null,
          direccion:            est.direccion.trim()        || null,
        }),
      })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al crear estudiante')); setSaving(false); return }
      await confirmarInscripcion(d.id)
    } catch (e: any) {
      flash('❌ Error inesperado: ' + (e?.message ?? ''))
      setSaving(false)
    }
  }

  const inscribirExistente = async () => {
    if (!insc.etapa_id || !insc.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    if (!estudianteSel) return
    setSaving(true)
    await confirmarInscripcion(estudianteSel.id)
  }

  const resetTodo = () => {
    setModo('buscar'); setBuscarQ(''); setResultados([]); setEstudianteSel(null); setMsg('')
  }

  const edad = (fn?: string) => fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  if (modo === 'exito') return (
    <div className="ap">
      <header className="topbar"><div className="page-title">✅ Inscripción exitosa</div></header>
      <div className="pc max-w-lg text-center">
        <div className="card py-10">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-extrabold text-green-600 mb-2">¡Inscripción registrada!</h2>
          <p className="text-gray-500 text-sm mb-5">
            {estudianteSel
              ? `${estudianteSel.primer_nombre} ${estudianteSel.primer_apellido} fue inscrito en la nueva etapa.`
              : `${est.primer_nombre} ${est.primer_apellido} fue registrado e inscrito.`}
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-g" onClick={resetTodo}>＋ Inscribir otro</button>
            <button className="btn btn-p" onClick={() => router.push('/dashboard/tecnico/estudiantes')}>
              Ver mis estudiantes →
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📋 Inscribir Estudiante</div>
          <div className="text-xs text-gray-400">
            {modo === 'buscar' ? 'Paso 1: Buscar si ya está registrado'
              : modo === 'nuevo' ? 'Nuevo registro estudiantil'
              : 'Avanzar de etapa'}
          </div>
        </div>
        {!miTecnicoId && (
          <span className="text-xs text-orange-500 bg-orange-50 px-2 py-1 rounded-lg">
            ⚠️ Cargando perfil...
          </span>
        )}
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* PASO 0: BUSCAR */}
        {modo === 'buscar' && (
          <div className="card">
            <div className="card-title">🔍 ¿El estudiante ya está registrado?</div>
            <p className="text-sm text-gray-500 mb-4">
              Busca por nombre, apellido, CUI o código MINEDUC antes de crear un registro nuevo.
            </p>
            <input
              className="inp" autoFocus
              placeholder="Nombre, CUI (13 dígitos) o código MINEDUC..."
              value={buscarQ}
              onChange={e => setBuscarQ(e.target.value)}
            />

            {buscando && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!buscando && buscarQ.trim().length >= 3 && resultados.length === 0 && (
              <div className="mt-4 text-center py-6 bg-gray-50 rounded-xl">
                <div className="text-3xl mb-2">🔍</div>
                <div className="text-sm text-gray-500 mb-3">No se encontró ningún estudiante con esos datos</div>
                <button className="btn btn-p" onClick={empezarNuevo}>＋ Crear nuevo registro</button>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="text-xs font-bold text-gray-400 uppercase">
                  {resultados.length} resultado(s) — selecciona uno
                </div>
                {resultados.map((r: any) => (
                  <button key={r.id}
                    onClick={() => seleccionarExistente(r)}
                    className="w-full text-left p-3 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-gray-800">
                          {r.primer_nombre} {r.segundo_nombre} {r.primer_apellido} {r.segundo_apellido}
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5 space-x-2">
                          {r.codigo_estudiante && <span className="font-mono">📋 {r.codigo_estudiante}</span>}
                          {r.cui && <span className="font-mono">🪪 {r.cui}</span>}
                          {r.cui_pendiente && <span className="text-orange-500">CUI pendiente</span>}
                        </div>
                      </div>
                      <div className="text-right text-xs">
                        {r.ultima_etapa && (
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                            {r.ultima_etapa.nombre}
                          </span>
                        )}
                        {r.inscripcion_activa && (
                          <div className="text-green-600 mt-1">✓ Activo</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
                <div className="text-center pt-2">
                  <button className="btn btn-g text-sm" onClick={empezarNuevo}>
                    Ninguno — ＋ Crear nuevo registro
                  </button>
                </div>
              </div>
            )}

            {buscarQ.trim().length > 0 && buscarQ.trim().length < 3 && (
              <div className="text-xs text-gray-400 mt-2">Escribe al menos 3 caracteres...</div>
            )}
          </div>
        )}

        {/* REINSCRIBIR EXISTENTE */}
        {modo === 'reinscribir' && estudianteSel && (
          <div className="card">
            <div className="card-title">🔄 Avanzar de etapa</div>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="font-bold text-gray-800">
                {estudianteSel.primer_nombre} {estudianteSel.segundo_nombre}{' '}
                {estudianteSel.primer_apellido} {estudianteSel.segundo_apellido}
              </div>
              <div className="text-sm text-gray-500 mt-1 space-x-3">
                {estudianteSel.codigo_estudiante && <span className="font-mono">📋 {estudianteSel.codigo_estudiante}</span>}
                {estudianteSel.cui && <span className="font-mono">🪪 {estudianteSel.cui}</span>}
              </div>
              <div className="text-sm text-gray-500">{edad(estudianteSel.fecha_nacimiento)}</div>
              {estudianteSel.ultima_etapa && (
                <div className="text-xs text-blue-600 mt-2">
                  📚 Última etapa: <b>{estudianteSel.ultima_etapa.nombre}</b>
                </div>
              )}
              {estudianteSel.inscripcion_activa && (
                <div className="text-xs text-orange-500 mt-1">
                  ⚠️ Inscripción activa en: {estudianteSel.inscripcion_activa.etapa?.nombre}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="fg"><label className="lbl">Nueva etapa *</label>
                <select className="inp" value={insc.etapa_id} onChange={I('etapa_id')}>
                  <option value="">— Seleccionar etapa —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">Sede *</label>
                <select className="inp" value={insc.sede_id} onChange={I('sede_id')}>
                  <option value="">— Seleccionar sede —</option>
                  {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="fg"><label className="lbl">Versión del libro</label>
                  <select className="inp" value={insc.version_libro} onChange={I('version_libro')}>
                    <option value="nuevo">📗 Libro Nuevo</option>
                    <option value="viejo">📙 Libro Viejo</option>
                  </select>
                </div>
                <div className="fg"><label className="lbl">Ciclo escolar</label>
                  <select className="inp" value={insc.ciclo_escolar} onChange={I('ciclo_escolar')}>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-4">
              <button className="btn btn-g" onClick={resetTodo}>← Buscar otro</button>
              <button className="btn btn-p" onClick={inscribirExistente} disabled={saving || !miTecnicoId}>
                {saving
                  ? <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inscribiendo...
                    </span>
                  : '✅ Confirmar avance de etapa'}
              </button>
            </div>
          </div>
        )}

        {/* NUEVO REGISTRO COMPLETO */}
        {modo === 'nuevo' && (
          <div className="space-y-4">
            <div className="card">
              <div className="card-title">👤 Datos personales</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Primer nombre *</label>
                    <input className="inp" value={est.primer_nombre} onChange={E('primer_nombre')} /></div>
                  <div className="fg"><label className="lbl">Segundo nombre</label>
                    <input className="inp" value={est.segundo_nombre} onChange={E('segundo_nombre')} /></div>
                  <div className="fg"><label className="lbl">Primer apellido *</label>
                    <input className="inp" value={est.primer_apellido} onChange={E('primer_apellido')} /></div>
                  <div className="fg"><label className="lbl">Segundo apellido</label>
                    <input className="inp" value={est.segundo_apellido} onChange={E('segundo_apellido')} /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Tipo de documento</label>
                    <select className="inp" value={est.tipo_documento} onChange={E('tipo_documento')}>
                      <option value="DPI">DPI (CUI — 13 dígitos)</option>
                      <option value="Pasaporte">Pasaporte</option>
                      <option value="Documento Consular">Documento Consular</option>
                      <option value="Carnet Refugiado">Carnet Refugiado</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">CUI (13 dígitos)</label>
                    <input className="inp font-mono" value={est.cui} onChange={E('cui')}
                      disabled={est.cui_pendiente}
                      placeholder={est.cui_pendiente ? 'Pendiente' : '1234567890123'} maxLength={13} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 items-center">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={est.cui_pendiente}
                      onChange={e => setEst(p => ({ ...p, cui_pendiente: e.target.checked, cui:'' }))}
                      className="w-4 h-4" />
                    <span>CUI pendiente (en trámite)</span>
                  </label>
                  <div className="fg"><label className="lbl">Código MINEDUC</label>
                    <input className="inp font-mono" value={est.codigo_estudiante}
                      onChange={E('codigo_estudiante')} placeholder="Opcional — se genera si no lo tiene" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="fg"><label className="lbl">Fecha nacimiento</label>
                    <input type="date" className="inp" value={est.fecha_nacimiento} onChange={E('fecha_nacimiento')} /></div>
                  <div className="fg"><label className="lbl">Género</label>
                    <select className="inp" value={est.genero} onChange={E('genero')}>
                      <option value="">— Seleccionar —</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">Teléfono *</label>
                    <input className="inp" value={est.telefono} onChange={E('telefono')} placeholder="5555-1234" /></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Correo electrónico</label>
                    <input type="email" className="inp" value={est.correo} onChange={E('correo')} /></div>
                  <div className="fg"><label className="lbl">Discapacidad</label>
                    <select className="inp" value={est.discapacidad_id} onChange={E('discapacidad_id')}>
                      <option value="">Sin discapacidad</option>
                      {discapacidades.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Departamento de residencia</label>
                    <select className="inp" value={est.departamento_id}
                      onChange={e => setEst(p => ({ ...p, departamento_id: e.target.value, municipio_id:'' }))}>
                      <option value="">— Seleccionar —</option>
                      {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">Municipio de residencia</label>
                    <select className="inp" value={est.municipio_id} onChange={E('municipio_id')}
                      disabled={!est.departamento_id}>
                      <option value="">{!est.departamento_id ? '— Selecciona depto —' : '— Seleccionar —'}</option>
                      {municipios.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="fg"><label className="lbl">Dirección completa</label>
                  <textarea className="inp" rows={2} value={est.direccion} onChange={E('direccion')}
                    placeholder="Colonia, calle, número de casa..." /></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">📋 Datos de inscripción</div>
              <div className="space-y-3">
                <div className="fg"><label className="lbl">Etapa *</label>
                  <select className="inp" value={insc.etapa_id} onChange={I('etapa_id')}>
                    <option value="">— Seleccionar etapa —</option>
                    {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="lbl">Sede *</label>
                  <select className="inp" value={insc.sede_id} onChange={I('sede_id')}>
                    <option value="">— Seleccionar sede —</option>
                    {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Versión del libro</label>
                    <select className="inp" value={insc.version_libro} onChange={I('version_libro')}>
                      <option value="nuevo">📗 Libro Nuevo</option>
                      <option value="viejo">📙 Libro Viejo</option>
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">Ciclo escolar</label>
                    <select className="inp" value={insc.ciclo_escolar} onChange={I('ciclo_escolar')}>
                      <option value="2026">2026</option>
                      <option value="2025">2025</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button className="btn btn-g" onClick={resetTodo}>← Buscar otro</button>
                <button className="btn btn-p" onClick={inscribirNuevo}
                  disabled={saving || !miTecnicoId}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registrando...
                      </span>
                    : '✅ Crear registro e inscribir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
