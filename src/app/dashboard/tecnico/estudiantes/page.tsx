'use client'
// src/app/dashboard/admin/estudiantes/page.tsx — NUEVA PÁGINA
// Administrador ve TODOS los estudiantes con tabla horizontal completa
import { useState, useEffect, useCallback } from 'react'

export default function AdminEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [buscar,        setBuscar]        = useState('')
  const [filtroEtapa,   setFiltroEtapa]   = useState('')
  const [filtroSede,    setFiltroSede]    = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [tecnicos,      setTecnicos]      = useState<any[]>([])
  const [sedes,         setSedes]         = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')
  const [modalEst,      setModalEst]      = useState<any>(null)
  const [modalTipo,     setModalTipo]     = useState<'detalle'|'editar'>('detalle')
  const [formEst,       setFormEst]       = useState<any>({})
  const [savingEst,     setSavingEst]     = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ins, et, se, tec] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=todos`).then(r => r.json()).catch(() => ({ data:[] })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setInscripciones(ins.data ?? [])
    setEtapas(Array.isArray(et) ? et : [])
    setSedes(Array.isArray(se) ? se : [])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    const tec = i.tecnico as any
    return (!buscar        || nom.includes(buscar.toLowerCase()))
        && (!filtroEtapa   || String((i.etapa as any)?.id) === filtroEtapa)
        && (!filtroSede    || (i.sede as any)?.id === filtroSede)
        && (!filtroTecnico || (i.tecnico as any)?.id === filtroTecnico)
  })

  const abrirEditar = (insc: any) => {
    const e = insc.estudiante as any
    setFormEst({
      id:                   e.id,
      codigo_estudiante:    e.codigo_estudiante    ?? '',
      cui:                  e.cui                  ?? '',
      primer_nombre:        e.primer_nombre        ?? '',
      segundo_nombre:       e.segundo_nombre       ?? '',
      primer_apellido:      e.primer_apellido      ?? '',
      segundo_apellido:     e.segundo_apellido     ?? '',
      telefono:             e.telefono             ?? '',
      telefono_alternativo: e.telefono_alternativo ?? '',
      correo:               e.correo               ?? '',
      fecha_nacimiento:     e.fecha_nacimiento     ?? '',
      genero:               e.genero               ?? '',
      direccion:            e.direccion            ?? '',
    })
    setModalEst(insc); setModalTipo('editar')
  }

  const guardarEdicion = async () => {
    if (!formEst.primer_nombre || !formEst.primer_apellido) {
      flash('❌ Nombre y apellido requeridos'); return
    }
    setSavingEst(true)
    const res = await fetch(`/api/estudiantes/${formEst.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formEst),
    })
    const d = await res.json()
    flash(res.ok ? '✅ ' + (d.mensaje ?? 'Actualizado') : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModalEst(null); cargar() }
    setSavingEst(false)
  }

  const descargarExcel = async () => {
    setDescargando(true)
    const res = await fetch(`/api/admin/exportar-estudiantes?ciclo=${ciclo}`)
    if (!res.ok) { flash('❌ Error al exportar'); setDescargando(false); return }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `Todos-Estudiantes-${ciclo}.xlsx`; a.click()
    URL.revokeObjectURL(url); setDescargando(false)
  }

  const FE = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setFormEst((p: any) => ({ ...p, [k]: e.target.value }))

  const edad = (fn?: string) =>
    fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Todos los Estudiantes</div>
          <div className="text-xs text-gray-400">{filtrados.length} de {inscripciones.length} · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando || loading}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
        </div>
      </header>

      <div className="pc">
        {/* Filtros */}
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
            <div className="w-44">
              <label className="lbl">Sede</label>
              <select className="inp" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="">Todas</option>
                {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Técnico</label>
              <select className="inp" value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)}>
                <option value="">Todos</option>
                {tecnicos.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.primer_nombre} {t.primer_apellido}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroEtapa(''); setFiltroSede(''); setFiltroTecnico('') }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🎓</div>
              <div className="font-semibold">Sin resultados</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-left">
                    {['#','Código MINEDUC','Nombre completo','CUI','Edad','Tel.','Etapa','Libro','Sede','Técnico','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-blue-700 last:border-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((insc: any, idx: number) => {
                    const e   = insc.estudiante as any
                    const par = idx % 2 === 0
                    return (
                      <tr key={insc.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${par ? 'bg-white' : 'bg-sky-50/40'}`}>
                        <td className="px-3 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {e?.codigo_estudiante ?? <span className="text-gray-300 italic">Sin código</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold whitespace-nowrap text-gray-900">
                            {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre} {e?.segundo_nombre}
                          </div>
                          {insc.tiene_ajuste_discapacidad && (
                            <span className="text-xs text-yellow-600">♿ Ajuste</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{e?.cui ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <div>{edad(e?.fecha_nacimiento)}</div>
                          <div className="text-gray-400">{e?.genero?.charAt(0)?.toUpperCase() ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{e?.telefono ?? '—'}</td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">{(insc.etapa as any)?.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {insc.version_libro === 'nuevo' ? '📗' : '📙'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600">{(insc.sede as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>
                            {insc.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setModalEst(insc); setModalTipo('detalle') }}
                              className="btn btn-g btn-sm" title="Ver detalle">👁️</button>
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
                {modalTipo === 'detalle' ? '👁️ Detalle del estudiante' : '✏️ Editar estudiante'}
              </h3>
              <button onClick={() => setModalEst(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                ×
              </button>
            </div>

            {modalTipo === 'detalle' && (() => {
              const e = modalEst.estudiante as any
              return (
                <div className="mbd">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ['Código MINEDUC', e?.codigo_estudiante ?? 'Sin código'],
                      ['CUI', e?.cui ?? 'Pendiente'],
                      ['Nombre completo', `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.segundo_apellido ?? ''}`.trim()],
                      ['Fecha nacimiento', e?.fecha_nacimiento ?? '—'],
                      ['Género', e?.genero ?? '—'],
                      ['Teléfono', e?.telefono ?? '—'],
                      ['Correo', e?.correo ?? '—'],
                      ['Etapa', (modalEst.etapa as any)?.nombre],
                      ['Versión libro', modalEst.version_libro],
                      ['Sede', (modalEst.sede as any)?.nombre],
                      ['Técnico', `${(modalEst.tecnico as any)?.primer_nombre ?? ''} ${(modalEst.tecnico as any)?.primer_apellido ?? ''}`],
                      ['Estado', modalEst.estado],
                      ['Fecha inscripción', modalEst.fecha_inscripcion],
                      ['Discapacidad', (e?.discapacidad as any)?.nombre ?? 'Ninguna'],
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

            {modalTipo === 'editar' && (
              <div className="mbd space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k:'codigo_estudiante', l:'Código MINEDUC (editable)', type:'text', mono:true },
                    { k:'cui', l:'CUI (editable)', type:'text', mono:true },
                    { k:'primer_nombre', l:'Primer nombre *', type:'text' },
                    { k:'segundo_nombre', l:'Segundo nombre', type:'text' },
                    { k:'primer_apellido', l:'Primer apellido *', type:'text' },
                    { k:'segundo_apellido', l:'Segundo apellido', type:'text' },
                    { k:'telefono', l:'Teléfono', type:'text' },
                    { k:'correo', l:'Correo', type:'email' },
                    { k:'fecha_nacimiento', l:'Fecha nacimiento', type:'date' },
                    { k:'direccion', l:'Dirección', type:'text' },
                  ].map(({ k, l, type, mono }) => (
                    <div key={k} className="fg">
                      <label className="lbl">{l}</label>
                      <input type={type} className={`inp ${mono ? 'font-mono' : ''}`}
                        value={formEst[k] ?? ''} onChange={FE(k)} />
                    </div>
                  ))}
                  <div className="fg">
                    <label className="lbl">Género</label>
                    <select className="inp" value={formEst.genero ?? ''} onChange={FE('genero')}>
                      <option value="">— Seleccionar —</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                </div>
                <div className="mf">
                  <button className="btn btn-g" onClick={() => setModalTipo('detalle')}>Cancelar</button>
                  <button className="btn btn-p" onClick={guardarEdicion} disabled={savingEst}>
                    {savingEst ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span> : '💾 Guardar'}
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
