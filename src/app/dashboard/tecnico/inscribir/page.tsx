'use client'
// src/app/dashboard/tecnico/inscribir/page.tsx
// FIX: Dropdown cascada País → Departamento → Municipio
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const GUATEMALA_ID = 1  // id del país Guatemala en tabla paises

export default function InscribirEstudiantePage() {
  const router = useRouter()
  const [step,  setStep]  = useState<1|2|3>(1) // 1=datos personales, 2=inscripción, 3=confirmación
  const [saving, setSaving] = useState(false)
  const [msg,    setMsg]   = useState('')

  // Catálogos
  const [paises,      setPaises]      = useState<any[]>([])
  const [departamentos, setDepts]     = useState<any[]>([])
  const [municipios,  setMunis]       = useState<any[]>([])
  const [etapas,      setEtapas]      = useState<any[]>([])
  const [sedes,       setSedes]       = useState<any[]>([])
  const [discapacidades, setDiscap]   = useState<any[]>([])

  // Form estudiante
  const [est, setEst] = useState({
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    cui: '', cui_pendiente: false,
    fecha_nacimiento: '', genero: '',
    telefono: '', telefono_alternativo: '', correo: '',
    pais_id: String(GUATEMALA_ID),
    departamento_id: '', municipio_id: '',
    direccion: '', discapacidad_id: '',
    es_extranjero: false, numero_documento: '', tipo_documento: 'DPI',
  })

  // Form inscripción
  const [insc, setInsc] = useState({
    etapa_id: '', sede_id: '', version_libro: 'nuevo',
    ciclo_escolar: '2026', modalidad_id: '',
  })

  // Cargar catálogos
  useEffect(() => {
    Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
    ]).then(([et, se, di, de]) => {
      setEtapas(Array.isArray(et) ? et : [])
      setSedes(Array.isArray(se) ? se : [])
      setDiscap(Array.isArray(di) ? di : [])
      setDepts(Array.isArray(de) ? de : [])
    })
  }, [])

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    if (!est.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${est.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [est.departamento_id])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const E = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setEst(p => ({ ...p, [k]: e.target.value }))
  const I = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) =>
    setInsc(p => ({ ...p, [k]: e.target.value }))

  const esGuatemala = est.pais_id === String(GUATEMALA_ID) || est.pais_id === 'Guatemala'

  const inscribir = async () => {
    if (!insc.etapa_id || !insc.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    if (!est.primer_nombre || !est.primer_apellido || !est.telefono) {
      flash('❌ Nombre, apellido y teléfono son requeridos'); return
    }
    if (!est.cui_pendiente && !est.cui && !est.numero_documento) {
      flash('❌ Ingresa el CUI o marca "CUI pendiente"'); return
    }
    setSaving(true)
    try {
      // 1. Crear estudiante
      const resEst = await fetch('/api/estudiantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...est,
          pais_id:       est.pais_id       ? parseInt(est.pais_id)       : null,
          municipio_id:  est.municipio_id  ? parseInt(est.municipio_id)  : null,
          discapacidad_id: est.discapacidad_id ? parseInt(est.discapacidad_id) : null,
        }),
      })
      const dEst = await resEst.json()
      if (!resEst.ok) { flash('❌ Error al crear estudiante: ' + dEst.error); setSaving(false); return }

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
      if (!resInsc.ok) { flash('❌ Error al inscribir: ' + dInsc.error); setSaving(false); return }

      setStep(3)
    } catch (e: any) {
      flash('❌ Error: ' + e.message)
    }
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
            {est.primer_nombre} {est.primer_apellido} fue inscrito correctamente en el ciclo {insc.ciclo_escolar}.
          </p>
          <div className="flex gap-3 justify-center">
            <button className="btn btn-g" onClick={() => { setStep(1); setEst({ primer_nombre:'',segundo_nombre:'',primer_apellido:'',segundo_apellido:'',cui:'',cui_pendiente:false,fecha_nacimiento:'',genero:'',telefono:'',telefono_alternativo:'',correo:'',pais_id:String(GUATEMALA_ID),departamento_id:'',municipio_id:'',direccion:'',discapacidad_id:'',es_extranjero:false,numero_documento:'',tipo_documento:'DPI' }); setInsc({ etapa_id:'',sede_id:'',version_libro:'nuevo',ciclo_escolar:'2026',modalidad_id:'' }) }}>
              ＋ Inscribir otro
            </button>
            <button className="btn btn-p" onClick={() => router.push('/dashboard/tecnico/estudiantes')}>
              Ver mis estudiantes
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

        {/* Progreso */}
        <div className="flex gap-3 mb-5">
          {[{n:1,l:'Datos personales'},{n:2,l:'Datos de inscripción'}].map(s => (
            <div key={s.n} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${step === s.n ? 'bg-pronea text-white' : step > s.n ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs bg-white/20">{step > s.n ? '✓' : s.n}</span>
              {s.l}
            </div>
          ))}
        </div>

        {/* ── PASO 1: Datos personales ── */}
        {step === 1 && (
          <div className="card">
            <div className="card-title">👤 Datos personales del estudiante</div>
            <div className="space-y-3">
              <div className="fg2">
                <div className="fg"><label className="lbl">Primer nombre *</label>
                  <input className="inp" value={est.primer_nombre} onChange={E('primer_nombre')} /></div>
                <div className="fg"><label className="lbl">Segundo nombre</label>
                  <input className="inp" value={est.segundo_nombre} onChange={E('segundo_nombre')} /></div>
                <div className="fg"><label className="lbl">Primer apellido *</label>
                  <input className="inp" value={est.primer_apellido} onChange={E('primer_apellido')} /></div>
                <div className="fg"><label className="lbl">Segundo apellido</label>
                  <input className="inp" value={est.segundo_apellido} onChange={E('segundo_apellido')} /></div>
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Tipo de documento *</label>
                  <select className="inp" value={est.tipo_documento} onChange={E('tipo_documento')}>
                    <option value="DPI">DPI (CUI)</option>
                    <option value="Pasaporte">Pasaporte</option>
                    <option value="Documento Consular">Documento Consular</option>
                    <option value="Carnet Refugiado">Carnet Refugiado</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">
                    {est.tipo_documento === 'DPI' ? 'CUI' : 'Número de documento'}
                    {!est.cui_pendiente && ' *'}
                  </label>
                  <input className="inp" value={est.cui} onChange={E('cui')}
                    disabled={est.cui_pendiente} placeholder={est.cui_pendiente ? 'Pendiente' : '...'} />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600">
                <input type="checkbox" checked={est.cui_pendiente}
                  onChange={e => setEst(p => ({ ...p, cui_pendiente: e.target.checked, cui: e.target.checked ? '' : p.cui }))}
                  className="w-4 h-4" />
                <span>CUI pendiente (en trámite)</span>
              </label>

              <div className="fg2">
                <div className="fg"><label className="lbl">Fecha de nacimiento</label>
                  <input type="date" className="inp" value={est.fecha_nacimiento} onChange={E('fecha_nacimiento')} /></div>
                <div className="fg"><label className="lbl">Género</label>
                  <select className="inp" value={est.genero} onChange={E('genero')}>
                    <option value="">— Seleccionar —</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </div>
              </div>

              <div className="fg2">
                <div className="fg"><label className="lbl">Teléfono *</label>
                  <input className="inp" value={est.telefono} onChange={E('telefono')} placeholder="5555-1234" /></div>
                <div className="fg"><label className="lbl">Teléfono alternativo</label>
                  <input className="inp" value={est.telefono_alternativo} onChange={E('telefono_alternativo')} /></div>
              </div>

              <div className="fg"><label className="lbl">Correo electrónico</label>
                <input type="email" className="inp" value={est.correo} onChange={E('correo')} /></div>

              {/* ── UBICACIÓN CON CASCADA ── */}
              <div className="border-t pt-3 mt-1">
                <div className="text-sm font-bold text-gray-600 mb-3">📍 Lugar de residencia</div>

                {/* País */}
                <div className="fg mb-2">
                  <label className="lbl">País *</label>
                  <select className="inp" value={est.pais_id} onChange={e => setEst(p => ({ ...p, pais_id: e.target.value, departamento_id: '', municipio_id: '' }))}>
                    <option value={String(GUATEMALA_ID)}>Guatemala</option>
                    <option value="otro">Otro país</option>
                  </select>
                </div>

                {esGuatemala ? (
                  <div className="fg2">
                    <div className="fg">
                      <label className="lbl">Departamento</label>
                      <select className="inp" value={est.departamento_id}
                        onChange={e => setEst(p => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                        <option value="">— Seleccionar —</option>
                        {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                      </select>
                    </div>
                    <div className="fg">
                      <label className="lbl">Municipio</label>
                      <select className="inp" value={est.municipio_id} onChange={E('municipio_id')} disabled={!est.departamento_id}>
                        <option value="">— Seleccionar departamento primero —</option>
                        {municipios.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="fg2">
                    <div className="fg"><label className="lbl">Estado / Departamento</label>
                      <input className="inp" placeholder="Ingresa el estado o departamento..." onChange={e => setEst(p => ({ ...p, departamento_id: e.target.value }))} /></div>
                    <div className="fg"><label className="lbl">Ciudad / Municipio</label>
                      <input className="inp" placeholder="Ingresa la ciudad o municipio..." onChange={e => setEst(p => ({ ...p, municipio_id: e.target.value }))} /></div>
                  </div>
                )}
              </div>

              <div className="fg"><label className="lbl">Dirección</label>
                <textarea className="inp" rows={2} value={est.direccion} onChange={E('direccion')} /></div>

              <div className="fg"><label className="lbl">Discapacidad</label>
                <select className="inp" value={est.discapacidad_id} onChange={E('discapacidad_id')}>
                  <option value="">Sin discapacidad</option>
                  {discapacidades.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="mf mt-4">
              <button className="btn btn-p" onClick={() => {
                if (!est.primer_nombre || !est.primer_apellido || !est.telefono) {
                  flash('❌ Nombre, apellido y teléfono son requeridos'); return
                }
                setStep(2)
              }}>
                Continuar → Datos de inscripción
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Datos de inscripción ── */}
        {step === 2 && (
          <div className="card">
            <div className="card-title">📋 Datos de inscripción</div>
            <div className="space-y-3">
              <div className="fg">
                <label className="lbl">Etapa *</label>
                <select className="inp" value={insc.etapa_id} onChange={I('etapa_id')}>
                  <option value="">— Seleccionar etapa —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Sede *</label>
                <select className="inp" value={insc.sede_id} onChange={I('sede_id')}>
                  <option value="">— Seleccionar sede —</option>
                  {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Versión de libro</label>
                  <select className="inp" value={insc.version_libro} onChange={I('version_libro')}>
                    <option value="nuevo">📗 Nuevo (versión actualizada)</option>
                    <option value="viejo">📙 Viejo (versión anterior)</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Ciclo escolar</label>
                  <select className="inp" value={insc.ciclo_escolar} onChange={I('ciclo_escolar')}>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mf mt-4">
              <button className="btn btn-g" onClick={() => setStep(1)}>← Volver</button>
              <button className="btn btn-p" onClick={inscribir} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Inscribiendo...</span>
                  : '✅ Confirmar inscripción'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
