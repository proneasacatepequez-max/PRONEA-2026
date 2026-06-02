'use client'
// src/app/dashboard/enlace/inscribir/page.tsx
// CORRECCIÓN: inscribir NO requiere autorización del director — es función básica del enlace
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EnlaceInscribirPage() {
  const router = useRouter()

  const [step,   setStep]   = useState<1 | 2 | 3>(1)
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]    = useState('')

  const [departamentos, setDeptos]  = useState<any[]>([])
  const [municipios,    setMunis]   = useState<any[]>([])
  const [etapas,        setEtapas]  = useState<any[]>([])
  const [sedes,         setSedes]   = useState<any[]>([])
  const [discapacidades, setDiscap] = useState<any[]>([])

  const [est, setEst] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    cui: '', cui_pendiente: false, codigo_estudiante: '',
    fecha_nacimiento: '', genero: '', telefono: '', correo: '',
    departamento_id: '', municipio_id: '', direccion: '',
    discapacidad_id: '', tipo_documento: 'DPI',
  })

  const [insc, setInsc] = useState({
    etapa_id: '', sede_id: '', version_libro: 'nuevo', ciclo_escolar: '2026',
  })

  useEffect(() => {
    Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
    ]).then(([et, se, di, de]) => {
      setEtapas(Array.isArray(et) ? et : [])
      setSedes(Array.isArray(se)  ? se : [])
      setDiscap(Array.isArray(di) ? di : [])
      setDeptos(Array.isArray(de) ? de : [])
    })
  }, [])

  useEffect(() => {
    if (!est.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${est.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [est.departamento_id])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const E = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEst(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  const I = (k: string) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setInsc(p => ({ ...p, [k]: e.target.value }))

  const validarPaso1 = () => {
    if (!est.primer_nombre.trim())   { flash('❌ Primer nombre requerido'); return false }
    if (!est.primer_apellido.trim()) { flash('❌ Primer apellido requerido'); return false }
    if (!est.telefono.trim())        { flash('❌ Teléfono requerido'); return false }
    if (!est.cui_pendiente && !est.cui.trim() && !est.codigo_estudiante.trim()) {
      flash('❌ Ingresa el CUI o el código de estudiante, o marca CUI como pendiente'); return false
    }
    return true
  }

  const inscribir = async () => {
    if (!insc.etapa_id || !insc.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    setSaving(true)
    // 1. Crear estudiante
    const resEst = await fetch('/api/estudiantes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primer_nombre:    est.primer_nombre.trim(),
        segundo_nombre:   est.segundo_nombre.trim()  || null,
        primer_apellido:  est.primer_apellido.trim(),
        segundo_apellido: est.segundo_apellido.trim() || null,
        cui:              est.cui.trim()             || null,
        cui_pendiente:    est.cui_pendiente,
        codigo_estudiante: est.codigo_estudiante.trim() || null,
        fecha_nacimiento: est.fecha_nacimiento || null,
        genero:           est.genero           || null,
        telefono:         est.telefono.trim(),
        correo:           est.correo.trim()    || null,
        municipio_id:     est.municipio_id     ? parseInt(est.municipio_id)    : null,
        discapacidad_id:  est.discapacidad_id  ? parseInt(est.discapacidad_id) : null,
        tipo_documento:   est.tipo_documento,
        direccion:        est.direccion        || null,
        pais_id:          1,
      }),
    })
    const dEst = await resEst.json()
    if (!resEst.ok) {
      flash('❌ Error al crear estudiante: ' + (dEst.error ?? 'Error desconocido'))
      setSaving(false); return
    }
    // 2. Inscribir
    const resInsc = await fetch('/api/inscripciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: dEst.id,
        etapa_id:      parseInt(insc.etapa_id),
        sede_id:       insc.sede_id,
        version_libro: insc.version_libro,
        ciclo_escolar: parseInt(insc.ciclo_escolar),
      }),
    })
    const dInsc = await resInsc.json()
    if (!resInsc.ok) {
      flash('❌ Error al inscribir: ' + (dInsc.error ?? 'Error desconocido'))
      setSaving(false); return
    }
    setStep(3)
    setSaving(false)
  }

  if (step === 3) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">✅ Inscripción exitosa</div></header>
      <div className="pc max-w-lg text-center">
        <div className="card py-10">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-extrabold text-green-600 mb-2">¡Estudiante inscrito!</h2>
          <p className="text-gray-500 text-sm mb-5">
            {est.primer_nombre} {est.primer_apellido} fue inscrito correctamente.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-g" onClick={() => {
              setStep(1)
              setEst({ primer_nombre:'',segundo_nombre:'',primer_apellido:'',segundo_apellido:'',cui:'',cui_pendiente:false,codigo_estudiante:'',fecha_nacimiento:'',genero:'',telefono:'',correo:'',departamento_id:'',municipio_id:'',direccion:'',discapacidad_id:'',tipo_documento:'DPI' })
              setInsc({ etapa_id:'',sede_id:'',version_libro:'nuevo',ciclo_escolar:'2026' })
            }}>＋ Inscribir otro</button>
            <button className="btn btn-p" onClick={() => router.push('/dashboard/enlace/estudiantes')}>
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
          <div className="text-xs text-gray-400">Paso {step} de 2</div>
        </div>
      </header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Indicador de pasos */}
        <div className="flex gap-3 mb-5">
          {[{ n:1, l:'Datos del estudiante' }, { n:2, l:'Datos de inscripción' }].map(sv => (
            <div key={sv.n} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
              step === sv.n ? 'bg-pronea text-white' :
              step > sv.n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-white/20">
                {step > sv.n ? '✓' : sv.n}
              </span>
              {sv.l}
            </div>
          ))}
        </div>

        {/* PASO 1 — Datos personales */}
        {step === 1 && (
          <div className="card">
            <div className="card-title">👤 Datos personales del estudiante</div>
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
                <div className="fg">
                  <label className="lbl">Tipo de documento</label>
                  <select className="inp" value={est.tipo_documento} onChange={E('tipo_documento')}>
                    <option value="DPI">DPI (CUI — 13 dígitos)</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Documento Consular">Documento Consular</option>
                    <option value="Carnet Refugiado">Carnet Refugiado</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">CUI (13 dígitos) {!est.cui_pendiente && '— si ya lo tiene'}</label>
                  <input className="inp font-mono" value={est.cui} onChange={E('cui')}
                    disabled={est.cui_pendiente}
                    placeholder={est.cui_pendiente ? 'Pendiente de trámite' : '1234 56789 0101'}
                    maxLength={13} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={est.cui_pendiente}
                    onChange={e => setEst(p => ({ ...p, cui_pendiente: e.target.checked, cui: '' }))}
                    className="w-4 h-4" />
                  <span>CUI pendiente (en trámite o no lo tiene aún)</span>
                </label>
                <div className="fg">
                  <label className="lbl">Código de estudiante MINEDUC (si ya lo tiene)</label>
                  <input className="inp font-mono" value={est.codigo_estudiante} onChange={E('codigo_estudiante')}
                    placeholder="Se puede ingresar después" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="fg"><label className="lbl">Fecha de nacimiento</label>
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
                <div className="fg"><label className="lbl">Departamento</label>
                  <select className="inp" value={est.departamento_id}
                    onChange={e => setEst(p => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                    <option value="">— Seleccionar —</option>
                    {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="lbl">Municipio</label>
                  <select className="inp" value={est.municipio_id} onChange={E('municipio_id')}
                    disabled={!est.departamento_id}>
                    <option value="">{!est.departamento_id ? '— Selecciona depto primero —' : '— Seleccionar —'}</option>
                    {municipios.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
              </div>

              <div className="fg"><label className="lbl">Dirección</label>
                <textarea className="inp" rows={2} value={est.direccion} onChange={E('direccion')} /></div>

              <div className="flex justify-end">
                <button className="btn btn-p" onClick={() => { if (validarPaso1()) setStep(2) }}>
                  Continuar → Datos de inscripción
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 2 — Inscripción */}
        {step === 2 && (
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
                  {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre} — {(s.municipio as any)?.nombre}</option>)}
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
              <button className="btn btn-g" onClick={() => setStep(1)}>← Volver</button>
              <button className="btn btn-p" onClick={inscribir} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inscribiendo...
                    </span>
                  : '✅ Confirmar inscripción'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
