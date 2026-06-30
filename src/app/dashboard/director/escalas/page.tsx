'use client'
// src/app/dashboard/director/escalas/page.tsx
// FIX: selector "Libro 1/2" — comparación consistente de tipos (todo string)
// AGREGADO: tabla de tareas guardadas visible en el detalle
// FIX #5: ASSIGN TÉCNICO - Funcionalidad para asignar técnico a escala pendiente
import { useState, useEffect, useCallback } from 'react'

export default function DirectorEscalasPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [etapas,       setEtapas]       = useState<any[]>([])
  const [libros,       setLibros]       = useState<any[]>([])
  const [areas,        setAreas]        = useState<any[]>([])
  const [tecnicos,     setTecnicos]     = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState('')
  const [modal,        setModal]        = useState<'crear'|'editar'|'ver'|null>(null)
  const [editando,     setEditando]     = useState<any>(null)
  const [ciclo,        setCiclo]        = useState('2026')
  const [tareasVer,    setTareasVer]    = useState<any[]>([])
  const [loadTareas,   setLoadTareas]   = useState(false)

  // FIX #5: Estados para asignar técnico
  const [modalAsignarTecnico, setModalAsignarTecnico] = useState(false)
  const [escalaPendiente, setEscalaPendiente] = useState<any>(null)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState('')
  const [asignandoTecnico, setAsignandoTecnico] = useState(false)

  const [form, setForm] = useState({
    etapa_id: '', libro_id: '', area_id: '',
    tecnico_id: '', version_libro: 'nuevo',
    observaciones: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [asig, et, tec] = await Promise.all([
      fetch(`/api/escala-asignaciones?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setAsignaciones(Array.isArray(asig) ? asig : [])
    setEtapas(Array.isArray(et) ? et : [])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  // Cargar áreas filtradas por etapa seleccionada (bachillerato tiene áreas distintas)
  useEffect(() => {
    if (!form.etapa_id) { setAreas([]); return }
    fetch(`/api/areas?etapa_id=${form.etapa_id}`)
      .then(r => r.json())
      .then(d => setAreas(Array.isArray(d) ? d : []))
      .catch(() => setAreas([]))
  }, [form.etapa_id])

  // FIX: cargar libros filtrados por etapa Y versión, comparando todo como string
  useEffect(() => {
    if (!form.etapa_id) { setLibros([]); return }
    const params = new URLSearchParams()
    params.set('etapa_id', form.etapa_id)
    if (form.version_libro) params.set('version', form.version_libro)
    fetch(`/api/libros?${params.toString()}`)
      .then(r => r.json())
      .then(d => setLibros(Array.isArray(d) ? d : []))
      .catch(() => setLibros([]))
  }, [form.etapa_id, form.version_libro])

  // Áreas ya asignadas para etapa+libro (evitar duplicar asignación)
  const areasYaAsignadas = new Set(
    asignaciones
      .filter((a: any) =>
        String((a.etapa as any)?.id) === form.etapa_id &&
        (!form.libro_id || (a.libro as any)?.id === form.libro_id)
      )
      .map((a: any) => String((a.area as any)?.id))
      .filter(Boolean)
  )

  const areasDisponibles = areas.filter((a: any) =>
    modal === 'editar' ? true : !areasYaAsignadas.has(String(a.id))
  )

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => {
    setForm({ etapa_id:'', libro_id:'', area_id:'', tecnico_id:'', version_libro:'nuevo', observaciones:'' })
    setEditando(null)
    setModal('crear')
  }

  const abrirEditar = (a: any) => {
    setEditando(a)
    setForm({
      etapa_id:      (a.etapa as any)?.id ? String((a.etapa as any).id) : '',
      libro_id:      (a.libro as any)?.id ?? '',
      area_id:       (a.area  as any)?.id ? String((a.area as any).id)  : '',
      tecnico_id:    (a.tecnico as any)?.id ?? '',
      version_libro: a.version_libro ?? 'nuevo',
      observaciones: a.observaciones ?? '',
    })
    setModal('editar')
  }

  const abrirVerTareas = async (a: any) => {
    setEditando(a)
    setModal('ver')
    if (!(a.libro as any)?.id) { setTareasVer([]); return }
    setLoadTareas(true)
    const areaId = (a.area as any)?.id
    const url = `/api/tareas-catalogo?libro_id=${(a.libro as any).id}&tipo=tareas${areaId ? `&area_id=${areaId}` : ''}`
    const d = await fetch(url).then(r => r.json()).catch(() => ({ tareas: [] }))
    setTareasVer(d.tareas ?? [])
    setLoadTareas(false)
  }

  // FIX #5: Función para asignar técnico a escala pendiente
  const asignarTecnico = async () => {
    if (!escalaPendiente || !tecnicoSeleccionado) {
      flash('❌ Selecciona un técnico')
      return
    }

    setAsignandoTecnico(true)
    const res = await fetch('/api/escala-asignaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etapa_id: escalaPendiente.etapa_id,
        libro_id: escalaPendiente.libro_id || undefined,
        area_id: escalaPendiente.area_id || undefined,
        tecnico_id: tecnicoSeleccionado,
        ciclo_escolar: parseInt(ciclo),
        version_libro: escalaPendiente.version_libro || 'nuevo',
        observaciones: escalaPendiente.observaciones || null,
      }),
    })
    const d = await res.json()

    if (res.ok) {
      flash('✅ Técnico asignado correctamente')
      setModalAsignarTecnico(false)
      setEscalaPendiente(null)
      setTecnicoSeleccionado('')
      await cargar()
    } else {
      flash('❌ ' + (d.error ?? 'Error al asignar'))
    }
    setAsignandoTecnico(false)
  }

  const guardar = async () => {
    if (!form.etapa_id || !form.tecnico_id) { flash('❌ Etapa y técnico son requeridos'); return }
    setSaving(true)

    if (modal === 'editar' && editando) {
      const res = await fetch('/api/escala-asignaciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editando.id, tecnico_id: form.tecnico_id,
          observaciones: form.observaciones || null,
          _tecnico_anterior: (editando.tecnico as any)?.id,
        }),
      })
      const d = await res.json()
      flash(res.ok ? '✅ ' + (d.mensaje ?? 'Actualizada') : '❌ ' + (d.error ?? 'Error'))
      if (res.ok) { setModal(null); await cargar() }
    } else {
      const res = await fetch('/api/escala-asignaciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa_id: parseInt(form.etapa_id),
          libro_id: form.libro_id || null,
          area_id:  form.area_id ? parseInt(form.area_id) : null,
          tecnico_id: form.tecnico_id,
          version_libro: form.version_libro,
          ciclo_escolar: parseInt(ciclo),
          observaciones: form.observaciones || null,
        }),
      })
      const d = await res.json()
      flash(res.ok ? '✅ ' + d.mensaje : '❌ ' + (d.error ?? 'Error'))
      if (res.ok) { setModal(null); await cargar() }
    }
    setSaving(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta asignación? El técnico ya no verá esta escala.')) return
    const res = await fetch(`/api/escala-asignaciones?id=${id}`, { method: 'DELETE' })
    flash(res.ok ? '✅ Asignación eliminada' : '❌ Error al eliminar')
    if (res.ok) await cargar()
  }

  const ESTADO_COLOR: Record<string, string> = {
    pendiente: 'badge-yellow', en_progreso: 'badge-blue', completado: 'badge-green',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Asignar Técnico — Escala Numérica</div>
          <div className="text-xs text-gray-400">El técnico construye la escala y queda visible para todos</div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={abrirCrear}>＋ Nueva asignación</button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="font-semibold">Sin asignaciones de escala</div>
              <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Primera asignación</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-left">
                    {['Etapa','Libro','Área','Versión','Técnico Asignado','Tareas','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase whitespace-nowrap border-r border-green-600 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a: any, idx: number) => (
                    <tr key={a.id} className={`border-b hover:bg-green-50 ${idx%2===0?'bg-white':'bg-emerald-50/20'}`}>
                      <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{(a.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                        {(a.libro as any)?.nombre ?? '— Todos —'}
                        {(a.libro as any)?.numero && <div className="text-xs text-gray-400">Libro {(a.libro as any).numero}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{(a.area as any)?.nombre ?? '— Todas —'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${a.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>
                          {a.version_libro==='nuevo'?'📗 Nuevo':'📙 Viejo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {a.tecnico ? (
                          <>
                            <div className="font-semibold text-sm">{(a.tecnico as any)?.primer_nombre} {(a.tecnico as any)?.primer_apellido}</div>
                            <div className="text-xs text-gray-400 font-mono">{(a.tecnico as any)?.codigo_tecnico}</div>
                          </>
                        ) : (
                          <span className="text-xs text-orange-500 font-semibold">⚠️ Sin asignar</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => abrirVerTareas(a)}
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold cursor-pointer hover:scale-110 transition-transform ${a.tareas_construidas>0?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}
                          title="Ver tareas guardadas">
                          {a.tareas_construidas}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${ESTADO_COLOR[a.estado]??'badge-gray'}`}>{a.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-g btn-sm" onClick={() => abrirVerTareas(a)} title="Ver tareas">👁️</button>
                          {!a.tecnico && (
                            <button 
                              className="btn btn-sm btn-g" 
                              title="Asignar técnico responsable"
                              onClick={() => {
                                setEscalaPendiente({
                                  etapa_id: (a.etapa as any)?.id,
                                  libro_id: (a.libro as any)?.id,
                                  area_id: (a.area as any)?.id,
                                  version_libro: a.version_libro,
                                  observaciones: a.observaciones,
                                })
                                setTecnicoSeleccionado('')
                                setModalAsignarTecnico(true)
                              }}
                            >
                              🧑‍🏫 Asignar
                            </button>
                          )}
                          <button className="btn btn-p btn-sm" onClick={() => abrirEditar(a)} title="Editar / Transferir">✏️</button>
                          <button className="btn btn-d btn-sm" onClick={() => eliminar(a.id)} title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {(modal === 'crear' || modal === 'editar') && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {modal === 'crear' ? '📊 Nueva asignación de escala' : '✏️ Editar / Transferir técnico'}
                </h3>
                <button onClick={() => setModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">

                {modal === 'crear' && (
                  <>
                    <div className="fg">
                      <label className="lbl">Etapa *</label>
                      <select className="inp" value={form.etapa_id}
                        onChange={e => setForm(p => ({ ...p, etapa_id: e.target.value, libro_id:'', area_id:'' }))}>
                        <option value="">— Seleccionar etapa —</option>
                        {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="fg">
                        <label className="lbl">Versión del libro</label>
                        <select className="inp" value={form.version_libro}
                          onChange={e => setForm(p => ({ ...p, version_libro: e.target.value, libro_id: '' }))}>
                          <option value="nuevo">📗 Libro Nuevo</option>
                          <option value="viejo">📙 Libro Viejo</option>
                        </select>
                      </div>
                      <div className="fg">
                        <label className="lbl">Libro específico</label>
                        <select className="inp" value={form.libro_id} onChange={F('libro_id')}
                          disabled={!form.etapa_id}>
                          <option value="">
                            {!form.etapa_id ? '— Elige etapa primero —' : libros.length === 0 ? '— Sin libros para esta versión —' : '— Todos los libros —'}
                          </option>
                          {libros.map((l: any) => (
                            <option key={l.id} value={l.id}>Libro {l.numero} — {l.nombre}</option>
                          ))}
                        </select>
                        {form.etapa_id && libros.length === 0 && (
                          <div className="text-xs text-orange-500 mt-1">
                            ⚠️ No hay libros "{form.version_libro}" creados para esta etapa. Crear en Admin → Libros y Tareas.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="fg">
                      <label className="lbl">Área específica (opcional)</label>
                      <select className="inp" value={form.area_id} onChange={F('area_id')}>
                        <option value="">— Todas las áreas —</option>
                        {areasDisponibles.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                      </select>
                      {areasDisponibles.length === 0 && form.etapa_id && (
                        <div className="text-xs text-orange-500 mt-1">⚠️ Todas las áreas ya tienen técnico asignado</div>
                      )}
                    </div>
                  </>
                )}

                {modal === 'editar' && editando && (
                  <div className="alert al-i text-xs mb-2">
                    <b>Escala:</b> {(editando.etapa as any)?.nombre}
                    {(editando.libro as any)?.nombre && ` — ${(editando.libro as any).nombre}`}
                    {(editando.area as any)?.nombre  && ` — Área: ${(editando.area as any).nombre}`}
                    <br /><b>Técnico actual:</b> {(editando.tecnico as any)?.primer_nombre} {(editando.tecnico as any)?.primer_apellido}
                  </div>
                )}

                <div className="fg">
                  <label className="lbl">{modal === 'editar' ? 'Transferir a técnico *' : 'Técnico digitalizador *'}</label>
                  <select className="inp" value={form.tecnico_id} onChange={F('tecnico_id')}>
                    <option value="">— Seleccionar técnico —</option>
                    {tecnicos.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})</option>
                    ))}
                  </select>
                </div>

                <div className="fg">
                  <label className="lbl">Observaciones (opcional)</label>
                  <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving ? '...' : modal === 'crear' ? '✅ Asignar técnico' : '✏️ Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal ver tareas guardadas */}
      {modal === 'ver' && editando && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-12">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h3 className="text-base font-extrabold">📋 Tareas guardadas</h3>
                  <div className="text-xs text-gray-400">
                    {(editando.etapa as any)?.nombre} — {(editando.libro as any)?.nombre ?? ''} — {(editando.area as any)?.nombre ?? 'Todas las áreas'}
                  </div>
                </div>
                <button onClick={() => setModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5">
                {loadTareas ? (
                  <div className="flex justify-center py-8">
                    <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : tareasVer.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">📋</div>
                    El técnico aún no ha guardado ninguna tarea
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-2 py-2 text-left font-bold">#</th>
                          <th className="px-2 py-2 text-left font-bold">Área</th>
                          <th className="px-2 py-2 text-left font-bold">Página</th>
                          <th className="px-2 py-2 text-left font-bold">Descripción</th>
                          <th className="px-2 py-2 text-center font-bold">Pts. máx.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tareasVer.map((t: any) => (
                          <tr key={t.id} className="border-b">
                            <td className="px-2 py-1.5 font-mono">{t.numero_tarea}</td>
                            <td className="px-2 py-1.5">{(t.area as any)?.nombre}</td>
                            <td className="px-2 py-1.5 font-mono">{t.paginas ?? '—'}</td>
                            <td className="px-2 py-1.5">{t.nombre}</td>
                            <td className="px-2 py-1.5 text-center font-bold text-blue-600">{t.puntos_max}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="flex justify-end px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FIX #5: Modal Asignar Técnico */}
      {modalAsignarTecnico && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-base">🧑‍🏫 Asignar técnico responsable</h3>
              <button 
                onClick={() => {
                  setModalAsignarTecnico(false)
                  setEscalaPendiente(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {escalaPendiente && (
                <div className="p-3 bg-blue-50 rounded text-sm">
                  <div className="font-bold text-blue-700">Escala seleccionada:</div>
                  <div className="text-gray-600 mt-1">
                    {etapas.find(e => e.id === escalaPendiente.etapa_id)?.nombre || '—'} 
                    {escalaPendiente.libro_id ? ` - Libro ${libros.find(l => l.id === escalaPendiente.libro_id)?.numero || ''}` : ''}
                    {escalaPendiente.area_id ? ` - Área ${areas.find(a => a.id === escalaPendiente.area_id)?.nombre || ''}` : ''}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Versión: {escalaPendiente.version_libro === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}
                  </div>
                </div>
              )}

              <div className="fg">
                <label className="lbl">Técnico responsable *</label>
                <select 
                  className="inp" 
                  value={tecnicoSeleccionado} 
                  onChange={e => setTecnicoSeleccionado(e.target.value)}
                >
                  <option value="">— Seleccionar técnico —</option>
                  {tecnicos.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})
                    </option>
                  ))}
                </select>
                {tecnicos.length === 0 && (
                  <div className="text-xs text-red-500 mt-1">
                    ⚠️ No hay técnicos disponibles
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
              <button 
                className="btn btn-g" 
                onClick={() => {
                  setModalAsignarTecnico(false)
                  setEscalaPendiente(null)
                }}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-p" 
                onClick={asignarTecnico}
                disabled={asignandoTecnico || !tecnicoSeleccionado}
              >
                {asignandoTecnico ? '⏳ Asignando...' : '✓ Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
