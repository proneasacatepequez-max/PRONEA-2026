'use client'
// src/app/dashboard/enlace/inscribir/page.tsx
// FIX: el enlace ya NO selecciona sede — viene fija de su perfil
// Mismo flujo buscar→nuevo/reinscribir que el técnico
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Modo = 'buscar' | 'nuevo' | 'reinscribir' | 'exito'

export default function EnlaceInscribirPage() {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('buscar')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [miPerfil, setMiPerfil] = useState<any>(null)

  const [buscarQ, setBuscarQ] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [estudianteSel, setEstudianteSel] = useState<any>(null)

  const [departamentos, setDepts]  = useState<any[]>([])
  const [municipios,    setMunis]  = useState<any[]>([])
  const [etapas,        setEtapas] = useState<any[]>([])
  const [discapacidades,setDiscap] = useState<any[]>([])

  const [est, setEst] = useState({
    primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
    cui:'', cui_pendiente:false, codigo_estudiante:'',
    fecha_nacimiento:'', genero:'', telefono:'', telefono_alternativo:'', correo:'',
    departamento_id:'', municipio_id:'', direccion:'', discapacidad_id:'',
    es_extranjero:false, numero_documento:'', tipo_documento:'DPI',
  })

  const [insc, setInsc] = useState({ etapa_id:'', version_libro:'nuevo', ciclo_escolar:'2026' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  useEffect(() => {
    Promise.all([
      fetch('/api/mi-perfil').then(r => r.json()).catch(() => null),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
    ]).then(([perfil, dep, et, di]) => {
      setMiPerfil(perfil?.perfil ?? null)
      setDepts(Array.isArray(dep) ? dep : [])
      setEtapas(Array.isArray(et) ? et : [])
      setDiscap(Array.isArray(di) ? di : [])
    })
  }, [])

  useEffect(() => {
    if (!est.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${est.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [est.departamento_id])

  useEffect(() => {
    if (buscarQ.trim().length < 3) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(buscarQ.trim())}`)
        .then(r => r.json()).then(d => setResultados(d.encontrados ?? []))
        .finally(() => setBuscando(false))
    }, 400)
    return () => clearTimeout(t)
  }, [buscarQ])

  const E = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setEst(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))
  const I = (k: string) => (e: React.ChangeEvent<HTMLSelectElement>) => setInsc(p => ({ ...p, [k]: e.target.value }))

  const seleccionarExistente = (estudiante: any) => {
    setEstudianteSel(estudiante)
    setInsc({ etapa_id:'', version_libro:'nuevo', ciclo_escolar:'2026' })
    setModo('reinscribir')
  }

  const empezarNuevo = () => {
    setEst({ primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
      cui: buscarQ.match(/^\d{13}$/) ? buscarQ : '', cui_pendiente:false,
      codigo_estudiante: buscarQ.match(/^EST-/) ? buscarQ : '',
      fecha_nacimiento:'', genero:'', telefono:'', telefono_alternativo:'', correo:'',
      departamento_id:'', municipio_id:'', direccion:'', discapacidad_id:'',
      es_extranjero:false, numero_documento:'', tipo_documento:'DPI' })
    setInsc({ etapa_id:'', version_libro:'nuevo', ciclo_escolar:'2026' })
    setModo('nuevo')
  }

  const validarPaso1 = () => {
    if (!est.primer_nombre.trim())   { flash('❌ Primer nombre requerido'); return false }
    if (!est.primer_apellido.trim()) { flash('❌ Primer apellido requerido'); return false }
    if (!est.telefono.trim())        { flash('❌ Teléfono requerido'); return false }
    return true
  }

  const confirmarInscripcion = async (estudianteId: string) => {
    if (!insc.etapa_id) { flash('❌ Selecciona la etapa'); setSaving(false); return }
    try {
      const resInsc = await fetch('/api/inscripciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: estudianteId,
          etapa_id: parseInt(insc.etapa_id),
          version_libro: insc.version_libro,
          ciclo_escolar: parseInt(insc.ciclo_escolar),
          // sede_id y tecnico_id se resuelven automáticamente en el backend
          // desde el perfil del enlace — no se envían aquí
        }),
      })
      const text = await resInsc.text()
      let d: any = {}
      try { d = JSON.parse(text) } catch { flash('❌ Respuesta inválida del servidor'); setSaving(false); return }

      if (!resInsc.ok) { flash('❌ ' + (d.error ?? 'Error al inscribir')); setSaving(false); return }
      setModo('exito')
    } catch (e: any) {
      flash('❌ Error inesperado: ' + (e?.message ?? ''))
    } finally {
      setSaving(false)
    }
  }

  const inscribirNuevo = async () => {
    if (!validarPaso1()) return
    if (saving) return
    setSaving(true)
    const resEst = await fetch('/api/estudiantes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        primer_nombre: est.primer_nombre.trim(),
        segundo_nombre: est.segundo_nombre.trim() || null,
        primer_apellido: est.primer_apellido.trim(),
        segundo_apellido: est.segundo_apellido.trim() || null,
        cui: est.cui.trim() || null,
        cui_pendiente: Boolean(est.cui_pendiente),
        codigo_estudiante: est.codigo_estudiante.trim() || null,
        fecha_nacimiento: est.fecha_nacimiento || null,
        genero: est.genero || null,
        telefono: est.telefono.trim(),
        telefono_alternativo: est.telefono_alternativo.trim() || null,
        correo: est.correo.trim() || null,
        municipio_id: est.municipio_id ? parseInt(est.municipio_id) : null,
        discapacidad_id: est.discapacidad_id ? parseInt(est.discapacidad_id) : null,
        tipo_documento: est.tipo_documento,
        es_extranjero: Boolean(est.es_extranjero),
        numero_documento: est.numero_documento.trim() || null,
        direccion: est.direccion.trim() || null,
      }),
    })
    const textEst = await resEst.text()
    let dEst: any = {}
    try { dEst = JSON.parse(textEst) } catch { flash('❌ Respuesta inválida del servidor'); setSaving(false); return }
    if (!resEst.ok) { flash('❌ ' + (dEst.error ?? 'Error al crear estudiante')); setSaving(false); return }
    await confirmarInscripcion(dEst.id)
  }

  const inscribirExistente = async () => {
    if (!estudianteSel) return
    setSaving(true)
    await confirmarInscripcion(estudianteSel.id)
  }

  const resetTodo = () => { setModo('buscar'); setBuscarQ(''); setResultados([]); setEstudianteSel(null); setMsg('') }
  const edad = (fn?: string) => fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  const sedeNombre   = (miPerfil?.sede as any)?.nombre ?? null
  const tecnicoNombre = (miPerfil as any)?.tecnico
    ? `${(miPerfil as any).tecnico.primer_nombre} ${(miPerfil as any).tecnico.primer_apellido}`
    : null

  // Si el enlace no tiene sede o técnico asignado, bloquear con mensaje claro
  if (miPerfil && (!sedeNombre || !tecnicoNombre)) {
    return (
      <div className="ap">
        <header className="topbar"><div className="page-title">📋 Inscribir Estudiante</div></header>
        <div className="pc max-w-lg">
          <div className="card border-l-4 border-l-orange-400 text-center py-8">
            <div className="text-4xl mb-3">⚠️</div>
            <div className="font-bold text-gray-700 mb-2">No puedes inscribir todavía</div>
            <div className="text-sm text-gray-500">
              Tu cuenta de enlace no tiene {!sedeNombre && 'sede'}{!sedeNombre && !tecnicoNombre && ' ni '}{!tecnicoNombre && 'técnico responsable'} asignado(a).
              <br />Pide al director o administrador que complete esta configuración.
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (modo === 'exito') return (
    <div className="ap">
      <header className="topbar"><div className="page-title">✅ Inscripción exitosa</div></header>
      <div className="pc max-w-lg text-center">
        <div className="card py-10">
          <div className="text-5xl mb-4">🎓</div>
          <h2 className="text-xl font-extrabold text-green-600 mb-2">¡Inscripción registrada!</h2>
          <div className="flex gap-3 justify-center mt-4">
            <button className="btn btn-g" onClick={resetTodo}>＋ Inscribir otro</button>
            <button className="btn btn-p" onClick={() => router.push('/dashboard/enlace/estudiantes')}>Ver estudiantes →</button>
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
          <div className="text-xs text-gray-400">Sede: {sedeNombre} · Técnico: {tecnicoNombre}</div>
        </div>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {modo === 'buscar' && (
          <div className="card">
            <div className="card-title">🔍 ¿El estudiante ya está registrado?</div>
            <input className="inp" placeholder="Nombre, apellido, CUI o código MINEDUC..."
              value={buscarQ} onChange={e => setBuscarQ(e.target.value)} autoFocus />

            {buscando && <div className="flex justify-center py-4"><div className="w-6 h-6 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>}

            {!buscando && buscarQ.trim().length >= 3 && resultados.length === 0 && (
              <div className="mt-4 text-center py-6 bg-gray-50 rounded-xl">
                <div className="text-sm text-gray-500 mb-3">No se encontró ningún estudiante</div>
                <button className="btn btn-p" onClick={empezarNuevo}>＋ Crear nuevo registro</button>
              </div>
            )}

            {resultados.length > 0 && (
              <div className="mt-4 space-y-2">
                {resultados.map((r: any) => (
                  <button key={r.id} onClick={() => seleccionarExistente(r)}
                    className="w-full text-left p-3 rounded-xl border-2 border-gray-100 hover:border-blue-300 hover:bg-blue-50/40 transition-all">
                    <div className="font-bold text-gray-800">{r.primer_nombre} {r.primer_apellido} {r.segundo_apellido}</div>
                    <div className="text-xs text-gray-400">
                      {r.codigo_estudiante && <span className="font-mono">{r.codigo_estudiante}</span>}
                      {r.ultima_etapa && <span className="ml-2 badge badge-blue text-xs">Última: {r.ultima_etapa.nombre}</span>}
                    </div>
                  </button>
                ))}
                <div className="text-center pt-2">
                  <button className="btn btn-g text-sm" onClick={empezarNuevo}>Ninguno — ＋ Crear nuevo registro</button>
                </div>
              </div>
            )}
          </div>
        )}

        {modo === 'reinscribir' && estudianteSel && (
          <div className="card">
            <div className="card-title">🔄 Avanzar de etapa</div>
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="font-bold">{estudianteSel.primer_nombre} {estudianteSel.primer_apellido}</div>
              <div className="text-sm text-gray-500">{edad(estudianteSel.fecha_nacimiento)}</div>
            </div>
            <div className="fg"><label className="lbl">Nueva etapa *</label>
              <select className="inp" value={insc.etapa_id} onChange={I('etapa_id')}>
                <option value="">— Seleccionar —</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="flex justify-between mt-4">
              <button className="btn btn-g" onClick={resetTodo}>← Buscar otro</button>
              <button className="btn btn-p" onClick={inscribirExistente} disabled={saving}>
                {saving ? '...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        )}

        {modo === 'nuevo' && (
          <div className="space-y-4">
            <div className="card">
              <div className="card-title">👤 Datos personales</div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Primer nombre *</label><input className="inp" value={est.primer_nombre} onChange={E('primer_nombre')} /></div>
                  <div className="fg"><label className="lbl">Segundo nombre</label><input className="inp" value={est.segundo_nombre} onChange={E('segundo_nombre')} /></div>
                  <div className="fg"><label className="lbl">Primer apellido *</label><input className="inp" value={est.primer_apellido} onChange={E('primer_apellido')} /></div>
                  <div className="fg"><label className="lbl">Segundo apellido</label><input className="inp" value={est.segundo_apellido} onChange={E('segundo_apellido')} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">CUI</label><input className="inp font-mono" value={est.cui} onChange={E('cui')} disabled={est.cui_pendiente} maxLength={13} /></div>
                  <div className="fg"><label className="lbl">Teléfono *</label><input className="inp" value={est.telefono} onChange={E('telefono')} /></div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={est.cui_pendiente} onChange={e => setEst(p => ({ ...p, cui_pendiente: e.target.checked, cui:'' }))} className="w-4 h-4" />
                  <span>CUI pendiente</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Fecha nacimiento</label><input type="date" className="inp" value={est.fecha_nacimiento} onChange={E('fecha_nacimiento')} /></div>
                  <div className="fg"><label className="lbl">Género</label>
                    <select className="inp" value={est.genero} onChange={E('genero')}>
                      <option value="">—</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">📋 Inscripción</div>
              <div className="fg"><label className="lbl">Etapa *</label>
                <select className="inp" value={insc.etapa_id} onChange={I('etapa_id')}>
                  <option value="">— Seleccionar —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="flex justify-between mt-4">
                <button className="btn btn-g" onClick={resetTodo}>← Buscar otro</button>
                <button className="btn btn-p" onClick={inscribirNuevo} disabled={saving}>{saving ? '...' : '✅ Crear e inscribir'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
