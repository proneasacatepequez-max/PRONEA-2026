'use client'
// src/app/dashboard/enlace/estudiantes/page.tsx
// COMPLETO: tabla horizontal, edición de código MINEDUC/CUI, Excel, botón notas condicional
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function EnlaceEstudiantesPage() {
  const [inscripciones,  setInscripciones]  = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [tienePermNotas, setTienePermNotas] = useState(false)
  const [buscar,         setBuscar]         = useState('')
  const [ciclo,          setCiclo]          = useState('2026')
  const [descargando,    setDescargando]    = useState(false)
  const [msg,            setMsg]            = useState('')
  const [modalEst,       setModalEst]       = useState<any>(null)
  const [modoModal,      setModoModal]      = useState<'detalle'|'editar'>('detalle')
  const [formEst,        setFormEst]        = useState<any>({})
  const [savingEst,      setSavingEst]      = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ins, perms] = await Promise.all([
      // /api/inscripciones ya filtra por institución del enlace (Batch 2)
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/permisos').then(r => r.json()).catch(() => []),
    ])
    setInscripciones(ins.data ?? [])
    setTienePermNotas(
      Array.isArray(perms) &&
      perms.some((p: any) => p.permiso === 'ingresar_notas_enlace' && p.activo)
    )
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const txt = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    return !buscar || txt.includes(buscar.toLowerCase())
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
      correo:               e.correo               ?? '',
      fecha_nacimiento:     e.fecha_nacimiento     ?? '',
      genero:               e.genero               ?? '',
    })
    setModalEst(insc); setModoModal('editar')
  }

  const guardarEdicion = async () => {
    setSavingEst(true)
    const res = await fetch(`/api/estudiantes/${formEst.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formEst),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Datos actualizados' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModalEst(null); cargar() }
    setSavingEst(false)
  }

  const descargarExcel = async () => {
    setDescargando(true)
    const res = await fetch(`/api/tecnico/exportar-estudiantes?ciclo=${ciclo}`)
    if (!res.ok) { flash('❌ Error al exportar'); setDescargando(false); return }
    const blob = await res.blob()
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob); a.download = `Mis-Estudiantes-${ciclo}.xlsx`; a.click()
    setDescargando(false)
  }

  const FE = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFormEst((p: any) => ({ ...p, [k]: e.target.value }))

  const edad = (fn?: string) =>
    fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Estudiantes de mi Institución</div>
          <div className="text-xs text-gray-400">{filtrados.length} estudiante(s) · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando || loading}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
        </div>
      </header>

      <div className="pc">
        {/* Aviso de permisos */}
        {tienePermNotas
          ? <div className="alert al-s mb-4 text-sm">✅ Tienes autorización para ingresar notas</div>
          : <div className="alert al-i mb-4 text-sm">ℹ️ Solo lectura — para ingresar notas el técnico debe solicitar autorización al director</div>}

        <div className="card mb-4">
          <input className="inp" placeholder="🔍 Buscar por nombre, código o CUI..."
            value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-2">🎓</div>
              <div className="font-semibold text-gray-600">
                {buscar ? 'Sin resultados' : 'Sin estudiantes en tu institución'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-left">
                    {['#','Código MINEDUC','Nombre completo','CUI','Edad','Teléfono','Etapa','Libro','Sede','Técnico','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-orange-500 last:border-0">
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
                        className={`border-b hover:bg-orange-50 transition-colors ${par ? 'bg-white' : 'bg-amber-50/30'}`}>
                        <td className="px-3 py-2 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-xs font-bold text-orange-700 whitespace-nowrap">
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
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{(insc.sede as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>
                            {insc.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-nowrap">
                            <button onClick={() => { setModalEst(insc); setModoModal('detalle') }}
                              className="btn btn-g btn-sm" title="Detalle">👁️</button>
                            <button onClick={() => abrirEditar(insc)}
                              className="btn btn-g btn-sm" title="Editar código/CUI">✏️</button>
                            {tienePermNotas && (
                              <Link href={`/dashboard/enlace/notas?id=${insc.id}`}
                                className="btn btn-p btn-sm" title="Ingresar notas">📝</Link>
                            )}
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
                {modoModal === 'detalle' ? '👁️ Detalle del estudiante' : '✏️ Editar datos'}
              </h3>
              <button onClick={() => setModalEst(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                ×
              </button>
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
                      ['Género', e?.genero ?? '—'],
                      ['Teléfono', e?.telefono ?? '—'],
                      ['Correo', e?.correo ?? '—'],
                      ['Etapa', (modalEst.etapa as any)?.nombre],
                      ['Versión libro', modalEst.version_libro],
                      ['Sede', (modalEst.sede as any)?.nombre],
                      ['Técnico', `${(modalEst.tecnico as any)?.primer_nombre ?? ''} ${(modalEst.tecnico as any)?.primer_apellido ?? ''}`],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <div className="lbl">{l}</div>
                        <div className="font-semibold text-gray-800">{v ?? '—'}</div>
                      </div>
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
                <div className="alert al-i text-xs">
                  Puedes actualizar el código MINEDUC y CUI cuando el estudiante los traiga.
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Código MINEDUC (editable)</label>
                    <input className="inp font-mono" value={formEst.codigo_estudiante} onChange={FE('codigo_estudiante')}
                      placeholder="Código asignado por MINEDUC" />
                  </div>
                  <div className="fg">
                    <label className="lbl">CUI (editable)</label>
                    <input className="inp font-mono" value={formEst.cui} onChange={FE('cui')}
                      placeholder="1234 56789 0101" />
                  </div>
                  <div className="fg">
                    <label className="lbl">Primer nombre *</label>
                    <input className="inp" value={formEst.primer_nombre} onChange={FE('primer_nombre')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Segundo nombre</label>
                    <input className="inp" value={formEst.segundo_nombre} onChange={FE('segundo_nombre')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Primer apellido *</label>
                    <input className="inp" value={formEst.primer_apellido} onChange={FE('primer_apellido')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Segundo apellido</label>
                    <input className="inp" value={formEst.segundo_apellido} onChange={FE('segundo_apellido')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Teléfono</label>
                    <input className="inp" value={formEst.telefono} onChange={FE('telefono')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Correo</label>
                    <input type="email" className="inp" value={formEst.correo} onChange={FE('correo')} />
                  </div>
                </div>
                <div className="mf">
                  <button className="btn btn-g" onClick={() => setModoModal('detalle')}>Cancelar</button>
                  <button className="btn btn-p" onClick={guardarEdicion} disabled={savingEst}>
                    {savingEst
                      ? <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Guardando...
                        </span>
                      : '💾 Guardar cambios'}
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
