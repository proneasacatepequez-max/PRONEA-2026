'use client'
// src/app/dashboard/director/estudiantes/page.tsx
// Director ve estudiantes de sus sedes en tabla horizontal completa
import { useState, useEffect, useCallback } from 'react'

export default function DirectorEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [buscar,        setBuscar]        = useState('')
  const [filtroEtapa,   setFiltroEtapa]   = useState('')
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')
  const [modalEst,      setModalEst]      = useState<any>(null)
  const [formEst,       setFormEst]       = useState<any>({})
  const [savingEst,     setSavingEst]     = useState(false)
  const [modoModal,     setModoModal]     = useState<'detalle'|'editar'>('detalle')
  const [catalogos,     setCatalogos]     = useState<any>({})

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [insRes, et] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`)
        .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
        .catch(() => ({ ok: false, body: { error: 'Error de conexión' } })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
    ])
    if (!insRes.ok) {
      flash('❌ ' + (insRes.body?.error ?? 'Error al cargar estudiantes'))
      setInscripciones([])
    } else {
      setInscripciones(insRes.body?.data ?? [])
    }
    setEtapas(Array.isArray(et) ? et : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    fetch('/api/catalogos').then(r => r.json()).then(setCatalogos).catch(() => {})
  }, [])

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    return (!buscar      || nom.includes(buscar.toLowerCase()))
        && (!filtroEtapa || String((i.etapa as any)?.id) === filtroEtapa)
  })

  const abrirEditar = (insc: any) => {
    const e = insc.estudiante as any
    setFormEst({
      id:               e.id,
      codigo_estudiante: e.codigo_estudiante ?? '',
      cui:              e.cui               ?? '',
      primer_nombre:    e.primer_nombre     ?? '',
      segundo_nombre:   e.segundo_nombre    ?? '',
      primer_apellido:  e.primer_apellido   ?? '',
      segundo_apellido: e.segundo_apellido  ?? '',
      telefono:         e.telefono          ?? '',
      correo:           e.correo            ?? '',
      fecha_nacimiento: e.fecha_nacimiento  ?? '',
      genero:           e.genero            ?? '',
      direccion:              e.direccion              ?? '',
      estado_civil_id:        e.estado_civil_id         ?? '',
      pueblo_id:              e.pueblo_id               ?? '',
      idioma_id:              e.idioma_id               ?? '',
      tipo_vivienda_id:       e.tipo_vivienda_id        ?? '',
      ocupacion:              e.ocupacion               ?? '',
      contacto_emergencia_nombre: e.contacto_emergencia_nombre ?? '',
      contacto_emergencia_tel:    e.contacto_emergencia_tel    ?? '',
      contacto_emergencia_parent: e.contacto_emergencia_parent ?? '',
      fecha_inscripcion: insc.fecha_inscripcion ?? '',
    })
    setModalEst(insc); setModoModal('editar')
  }

  const guardarEdicion = async () => {
    setSavingEst(true)
    const { fecha_inscripcion, ...datosEstudiante } = formEst
    const [resEst, resInsc] = await Promise.all([
      fetch(`/api/estudiantes/${formEst.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosEstudiante),
      }),
      fecha_inscripcion
        ? fetch('/api/inscripciones', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: modalEst.id, fecha_inscripcion }),
          })
        : Promise.resolve(null),
    ])
    const d = await resEst.json()
    const errInsc = resInsc && !resInsc.ok ? (await resInsc.json())?.error : null
    flash(resEst.ok && !errInsc
      ? '✅ ' + (d.mensaje ?? 'Actualizado')
      : '❌ ' + (d.error ?? errInsc ?? 'Error'))
    if (resEst.ok) { setModalEst(null); cargar() }
    setSavingEst(false)
  }

  const descargarExcel = async () => {
    setDescargando(true)
    const res = await fetch(`/api/admin/exportar-estudiantes?ciclo=${ciclo}`)
    if (!res.ok) { flash('❌ Error al exportar'); setDescargando(false); return }
    const blob = await res.blob()
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `Estudiantes-${ciclo}.xlsx`; a.click()
    setDescargando(false)
  }

  const FE = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setFormEst((p: any) => ({ ...p, [k]: e.target.value }))

  const edad = (fn?: string) =>
    fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Estudiantes de mi Sede</div>
          <div className="text-xs text-gray-400">{filtrados.length} de {inscripciones.length} · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
        </div>
      </header>

      <div className="pc">
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre, código, CUI..." value={buscar}
                onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-44">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">🎓</div><div>Sin estudiantes</div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-left">
                    {['#','Código MINEDUC','Nombre completo','CUI','Edad','Teléfono','Etapa','Libro','Técnico','Sede','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-green-600 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((insc: any, idx: number) => {
                    const e   = insc.estudiante as any
                    const par = idx % 2 === 0
                    return (
                      <tr key={insc.id} className={`border-b hover:bg-green-50 transition-colors ${par ? 'bg-white' : 'bg-emerald-50/30'}`}>
                        <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs font-bold text-green-700 whitespace-nowrap">
                          {e?.codigo_estudiante ?? <span className="text-gray-300 italic">Sin código</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre} {e?.segundo_nombre}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{e?.cui ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <div>{edad(e?.fecha_nacimiento)}</div>
                          <div className="text-gray-400">{e?.genero?.charAt(0)?.toUpperCase() ?? ''}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{e?.telefono ?? '—'}</td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">{(insc.etapa as any)?.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {insc.version_libro === 'nuevo' ? '📗' : '📙'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600">{(insc.sede as any)?.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>{insc.estado}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setModalEst(insc); setModoModal('detalle') }}
                              className="btn btn-g btn-sm" title="Detalle">👁️</button>
                            <button onClick={() => abrirEditar(insc)}
                              className="btn btn-p btn-sm" title="Editar">✏️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalEst && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModalEst(null)}>
          <div className="mb max-w-2xl my-6 mx-4">
            <div className="mh">
              <h3 className="text-base font-extrabold">
                {modoModal === 'detalle' ? '👁️ Detalle' : '✏️ Editar estudiante'}
              </h3>
              <button onClick={() => setModalEst(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">×</button>
            </div>
            {modoModal === 'detalle' && (() => {
              const e = modalEst.estudiante as any
              return (
                <div className="mbd">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ['Código MINEDUC', e?.codigo_estudiante ?? 'Sin código'],
                      ['CUI', e?.cui ?? 'Pendiente'],
                      ['Nombre completo', `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.segundo_apellido ?? ''}`.trim()],
                      ['Fecha nacimiento', e?.fecha_nacimiento ?? '—'],
                      ['Teléfono', e?.telefono ?? '—'],
                      ['Correo', e?.correo ?? '—'],
                      ['Etapa', (modalEst.etapa as any)?.nombre],
                      ['Técnico', `${(modalEst.tecnico as any)?.primer_nombre ?? ''} ${(modalEst.tecnico as any)?.primer_apellido ?? ''}`],
                    ].map(([l, v]) => (
                      <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v ?? '—'}</div></div>
                    ))}
                  </div>
                  <div className="mf mt-4">
                    <button className="btn btn-g" onClick={() => setModalEst(null)}>Cerrar</button>
                    <button className="btn btn-p" onClick={() => abrirEditar(modalEst)}>✏️ Editar</button>
                  </div>
                </div>
              )
            })()}
            {modoModal === 'editar' && (
              <div className="mbd space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k:'codigo_estudiante', l:'Código MINEDUC', mono:true },
                    { k:'cui', l:'CUI', mono:true },
                    { k:'primer_nombre', l:'Primer nombre *' },
                    { k:'segundo_nombre', l:'Segundo nombre' },
                    { k:'primer_apellido', l:'Primer apellido *' },
                    { k:'segundo_apellido', l:'Segundo apellido' },
                    { k:'telefono', l:'Teléfono' },
                    { k:'correo', l:'Correo' },
                    { k:'fecha_nacimiento', l:'Fecha nacimiento', type:'date' },
                  ].map(({ k, l, mono, type }) => (
                    <div key={k} className="fg">
                      <label className="lbl">{l}</label>
                      <input type={type ?? 'text'} className={`inp ${mono ? 'font-mono' : ''}`}
                        value={formEst[k] ?? ''} onChange={FE(k)} />
                    </div>
                  ))}
                  <div className="fg">
                    <label className="lbl">Género</label>
                    <select className="inp" value={formEst.genero ?? ''} onChange={FE('genero')}>
                      <option value="">—</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t bg-amber-50 -mx-1 px-1 rounded">
                  <p className="text-xs font-bold text-amber-700 uppercase mb-2 pt-1">📅 Fecha real de inscripción</p>
                </div>
                <div className="fg">
                  <label className="lbl">
                    Fecha en que el estudiante realmente se inscribió (no la fecha en que se registró en el sistema)
                  </label>
                  <input type="date" className="inp" value={formEst.fecha_inscripcion ?? ''}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={FE('fecha_inscripcion')} />
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Datos socioeconómicos</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Estado civil</label>
                    <select className="inp" value={formEst.estado_civil_id ?? ''} onChange={FE('estado_civil_id')}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.estado_civil ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Pueblo / Pertenencia étnica</label>
                    <select className="inp" value={formEst.pueblo_id ?? ''} onChange={FE('pueblo_id')}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.pueblos ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Idioma materno</label>
                    <select className="inp" value={formEst.idioma_id ?? ''} onChange={FE('idioma_id')}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.idiomas ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Tipo de vivienda</label>
                    <select className="inp" value={formEst.tipo_vivienda_id ?? ''} onChange={FE('tipo_vivienda_id')}>
                      <option value="">— Seleccionar —</option>
                      {(catalogos.tipo_vivienda ?? []).map((c: any) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg col-span-2">
                    <label className="lbl">Dirección</label>
                    <input className="inp" value={formEst.direccion ?? ''} onChange={FE('direccion')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Ocupación</label>
                    <input className="inp" value={formEst.ocupacion ?? ''} onChange={FE('ocupacion')} />
                  </div>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-2">Contacto de emergencia</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="fg">
                    <label className="lbl">Nombre</label>
                    <input className="inp" value={formEst.contacto_emergencia_nombre ?? ''} onChange={FE('contacto_emergencia_nombre')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Teléfono</label>
                    <input className="inp" value={formEst.contacto_emergencia_tel ?? ''} onChange={FE('contacto_emergencia_tel')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Parentesco</label>
                    <input className="inp" value={formEst.contacto_emergencia_parent ?? ''} onChange={FE('contacto_emergencia_parent')} />
                  </div>
                </div>
                <div className="mf">
                  <button className="btn btn-g" onClick={() => setModoModal('detalle')}>Cancelar</button>
                  <button className="btn btn-p" onClick={guardarEdicion} disabled={savingEst}>
                    {savingEst ? '...' : '💾 Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
