'use client'
// src/app/dashboard/director/escalas/page.tsx
// CORREGIDO: carga libros y tareas DIRECTAMENTE desde libros+tareas_catalogo
// El director puede VER el catálogo (solo lectura) y ASIGNAR técnicos a escalas
import { useState, useEffect, useCallback } from 'react'

export default function DirectorEscalasPage() {
  // Navegación catálogo
  const [etapas,     setEtapas]     = useState<any[]>([])
  const [etapaSel,   setEtapaSel]   = useState<any>(null)
  const [libros,     setLibros]     = useState<any[]>([])
  const [libroSel,   setLibroSel]   = useState<any>(null)
  const [areas,      setAreas]      = useState<any[]>([])
  const [areaSel,    setAreaSel]    = useState('')
  const [tareas,     setTareas]     = useState<any[]>([])
  const [examenes,   setExamenes]   = useState<any[]>([])
  const [loadLib,    setLoadLib]    = useState(false)
  const [loadTareas, setLoadTareas] = useState(false)
  const [loading,    setLoading]    = useState(true)

  // Asignaciones de escalas (para asignar técnicos)
  const [tecnicos,     setTecnicos]     = useState<any[]>([])
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [ciclo,        setCiclo]        = useState('2026')

  // Modal asignar técnico
  const [modalAsignar,  setModalAsignar]  = useState(false)
  const [formAsig,      setFormAsig]      = useState({ tecnico_id:'', observaciones:'' })
  const [asignando,     setAsignando]     = useState(false)
  const [msg,           setMsg]           = useState('')

  // Modal editar/crear tarea
  const [modalTarea,  setModalTarea]  = useState<'crear' | any>(null)
  const [formTarea,   setFormTarea]   = useState<any>({})
  const [guardandoTarea, setGuardandoTarea] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [et, ar, tec, asig] = await Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
      fetch(`/api/escala-asignaciones?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
    ])
    setEtapas(Array.isArray(et)   ? et   : [])
    setAreas(Array.isArray(ar)    ? ar   : [])
    setTecnicos(Array.isArray(tec)? tec  : [])
    setAsignaciones(Array.isArray(asig)? asig : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  // Cargar libros por etapa
  const seleccionarEtapa = async (etapa: any) => {
    setEtapaSel(etapa)
    setLibroSel(null)
    setLibros([])
    setTareas([])
    setExamenes([])
    setAreaSel('')
    if (!etapa) return
    setLoadLib(true)
    const d = await fetch(`/api/libros?etapa_id=${etapa.id}`)
      .then(r => r.json()).catch(() => [])
    setLibros(Array.isArray(d) ? d : [])
    setLoadLib(false)
  }

  // Cargar tareas por libro
  const seleccionarLibro = async (libro: any) => {
    setLibroSel(libro)
    setTareas([])
    setExamenes([])
    setAreaSel('')
    if (!libro) return
    setLoadTareas(true)
    const d = await fetch(`/api/tareas-catalogo?libro_id=${libro.id}&tipo=ambos`)
      .then(r => r.json()).catch(() => ({ tareas:[], examenes:[] }))
    setTareas(d.tareas   ?? [])
    setExamenes(d.examenes ?? [])
    setLoadTareas(false)
  }

  const areasConTareas = areas.filter(a =>
    tareas.some((t: any) => t.area?.id === a.id) ||
    examenes.some((e: any) => e.area?.id === a.id)
  )
  const versiones = [...new Set(libros.map((l: any) => l.version))]
  const librosPorVersion = (v: string) =>
    libros.filter((l: any) => l.version === v).sort((a: any, b: any) => a.numero - b.numero)
  const tareasVista   = areaSel ? tareas.filter((t: any) => String(t.area?.id) === areaSel) : tareas
  const examenesVista = areaSel ? examenes.filter((e: any) => String(e.area?.id) === areaSel) : examenes

  const esBach    = etapaSel?.codigo?.startsWith('BA') ?? false
  const campoProy = esBach ? 'proyecto' : 'leccion'
  const labelProy = esBach ? 'Proyecto' : 'Lección'

  // Asignar técnico a una escala
  const asignarTecnico = async () => {
    if (!formAsig.tecnico_id || !etapaSel || !libroSel) {
      flash('❌ Selecciona técnico, etapa y libro')
      return
    }
    setAsignando(true)
    const res = await fetch('/api/escala-asignaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etapa_id:      etapaSel.id,
        libro_id:      libroSel.id,
        tecnico_id:    formAsig.tecnico_id,
        ciclo_escolar: parseInt(ciclo),
        observaciones: formAsig.observaciones || null,
      }),
    })
    const d = await res.json()
    if (res.ok || res.status === 409) {
      flash(res.status === 409 ? '⚠️ Ya existe una asignación para esta escala' : '✅ Técnico asignado')
      setModalAsignar(false)
      cargar()
    } else {
      flash('❌ ' + (d.error ?? 'Error al asignar'))
    }
    setAsignando(false)
  }

  // Asignación actual para el libro seleccionado
  const asignacionActual = asignaciones.find((a: any) =>
    String((a.etapa as any)?.id) === String(etapaSel?.id) &&
    String((a.libro as any)?.id) === String(libroSel?.id)
  )

  // ── Editar / crear / eliminar tarea ──────────────────────────────────
  const abrirEditarTarea = (t: any, areaIdDefault?: number) => {
    if (t === 'crear') {
      setFormTarea({
        numero_tarea: '', nombre: '', paginas: '', proyecto: '', leccion: '',
        puntos_max: 5, area_id: areaIdDefault ?? areasConTareas[0]?.id ?? '',
      })
      setModalTarea('crear')
    } else {
      setFormTarea({
        numero_tarea: t.numero_tarea ?? '',
        nombre:       t.nombre ?? '',
        paginas:      t.paginas ?? '',
        proyecto:     t.proyecto ?? '',
        leccion:      t.leccion ?? '',
        puntos_max:   t.puntos_max ?? 5,
        area_id:      t.area?.id ?? '',
      })
      setModalTarea(t)
    }
  }

  const guardarTarea = async () => {
    if (!formTarea.nombre?.trim()) return flash('❌ El nombre de la tarea es requerido')
    if (!formTarea.area_id)        return flash('❌ Selecciona un área')
    setGuardandoTarea(true)
    try {
      const esNueva = modalTarea === 'crear'
      const res = await fetch('/api/tareas-catalogo', {
        method: esNueva ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(esNueva ? { libro_id: libroSel.id } : { id: modalTarea.id }),
          tipo: 'tarea',
          area_id:      formTarea.area_id,
          numero_tarea: formTarea.numero_tarea,
          nombre:       formTarea.nombre,
          paginas:      formTarea.paginas,
          proyecto:     formTarea.proyecto,
          leccion:      formTarea.leccion,
          puntos_max:   formTarea.puntos_max,
        }),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al guardar')); return }
      flash(esNueva ? '✅ Tarea creada' : '✅ Tarea actualizada')
      setModalTarea(null)
      seleccionarLibro(libroSel)
    } catch { flash('❌ Error de conexión') }
    finally { setGuardandoTarea(false) }
  }

  const eliminarTarea = async (t: any) => {
    if (!confirm(`¿Eliminar la tarea "${t.nombre}"? Si ya tiene notas registradas, solo se desactivará.`)) return
    setEliminandoId(t.id)
    try {
      const res = await fetch(`/api/tareas-catalogo?id=${t.id}&tipo=tarea`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al eliminar')); return }
      flash(d.accion === 'desactivada' ? '⚠️ Tarea desactivada (ya tenía notas)' : '✅ Tarea eliminada')
      seleccionarLibro(libroSel)
    } catch { flash('❌ Error de conexión') }
    finally { setEliminandoId(null) }
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas</div>
          <div className="text-xs text-gray-400">Consulta, corrige el catálogo y asigna técnicos</div>
        </div>
        <div className="flex gap-2 items-center">
          {msg && <span className={`text-xs font-bold ${msg.startsWith('✅')?'text-green-600':msg.startsWith('⚠️')?'text-yellow-600':'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          {libroSel && etapaSel && (
            <button className="btn btn-p text-sm"
              onClick={() => { setFormAsig({ tecnico_id:'', observaciones:'' }); setModalAsignar(true) }}>
              👨‍🏫 Asignar técnico
            </button>
          )}
        </div>
      </header>

      <div className="pc">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* PANEL IZQUIERDO */}
          <div className="lg:col-span-1 space-y-3">
            <div className="card">
              <div className="card-title text-sm mb-2">📚 Etapa</div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : etapas.map((et: any) => (
                <button key={et.id} onClick={() => seleccionarEtapa(et)}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs transition-all mb-1 ${
                    etapaSel?.id === et.id
                      ? 'border-blue-500 bg-blue-50 font-bold'
                      : 'border-gray-100 hover:border-blue-200'
                  }`}>
                  {et.nombre}
                </button>
              ))}
            </div>

            {etapaSel && (
              <div className="card">
                <div className="card-title text-sm mb-2">📖 Libro</div>
                {loadLib ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : libros.length === 0 ? (
                  <div className="text-xs text-orange-500 text-center py-3">⚠️ Sin libros</div>
                ) : versiones.map(ver => (
                  <div key={ver} className="mb-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {ver === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}
                    </div>
                    {librosPorVersion(ver).map((l: any) => (
                      <button key={l.id} onClick={() => seleccionarLibro(l)}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs transition-all mb-1 ${
                          libroSel?.id === l.id
                            ? 'border-blue-500 bg-blue-50 font-bold'
                            : 'border-gray-100 hover:border-blue-200'
                        }`}>
                        Libro {l.numero} — {l.nombre}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {libroSel && areasConTareas.length > 0 && (
              <div className="card">
                <div className="card-title text-sm mb-2">📌 Área</div>
                <button onClick={() => setAreaSel('')}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs mb-1 transition-all ${
                    !areaSel ? 'border-blue-500 bg-blue-50 font-bold' : 'border-gray-100 hover:border-blue-200'
                  }`}>
                  Todas
                </button>
                {areasConTareas.map((a: any) => (
                  <button key={a.id} onClick={() => setAreaSel(String(a.id))}
                    className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs mb-1 transition-all ${
                      areaSel === String(a.id)
                        ? 'border-blue-500 bg-blue-50 font-bold'
                        : 'border-gray-100 hover:border-blue-200'
                    }`}>
                    {a.nombre}
                  </button>
                ))}
              </div>
            )}

            {/* Asignación actual */}
            {libroSel && (
              <div className={`card text-xs space-y-1 ${asignacionActual ? 'border-green-200 bg-green-50/50' : 'border-orange-200 bg-orange-50/50'}`}>
                <div className="font-bold text-gray-600">👨‍🏫 Técnico asignado</div>
                {asignacionActual ? (
                  <>
                    <div className="font-semibold text-green-700">
                      {(asignacionActual.tecnico as any)?.primer_nombre}{' '}
                      {(asignacionActual.tecnico as any)?.primer_apellido}
                    </div>
                    <div className="text-gray-400">{(asignacionActual.tecnico as any)?.codigo_tecnico}</div>
                    <span className={`inline-block px-2 py-0.5 rounded-full font-bold ${
                      asignacionActual.estado === 'completado' ? 'bg-green-100 text-green-700'
                      : asignacionActual.estado === 'en_proceso' ? 'bg-blue-100 text-blue-700'
                      : 'bg-yellow-100 text-yellow-700'
                    }`}>{asignacionActual.estado}</span>
                  </>
                ) : (
                  <div className="text-orange-600">Sin técnico asignado</div>
                )}
              </div>
            )}
          </div>

          {/* PANEL DERECHO */}
          <div className="lg:col-span-3">
            {!etapaSel ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📚</div>
                <p className="font-semibold text-gray-600">Selecciona una etapa</p>
              </div>
            ) : !libroSel ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📖</div>
                <p className="font-semibold text-gray-600">Selecciona un libro</p>
              </div>
            ) : loadTareas ? (
              <div className="card flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tareas.length === 0 && examenes.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <p className="font-semibold text-gray-600">Sin tareas en este libro</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="card py-3 border-l-4 border-l-green-500">
                  <div className="font-extrabold text-gray-800">
                    {etapaSel.nombre} — Libro {libroSel.numero}
                    <span className="ml-2 text-xs font-normal text-gray-400">
                      ({libroSel.version === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'})
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {tareasVista.length} tareas · {examenesVista.length} exámenes
                  </div>
                </div>

                {areasConTareas
                  .filter(a => !areaSel || String(a.id) === areaSel)
                  .map((area: any) => {
                    const tareasArea = tareasVista
                      .filter((t: any) => t.area?.id === area.id)
                      .sort((a: any, b: any) => a.numero_tarea - b.numero_tarea)
                    const examenArea = examenesVista.find((e: any) => e.area?.id === area.id)
                    if (tareasArea.length === 0 && !examenArea) return null
                    const ptsMax = tareasArea.reduce((s: number, t: any) => s + (t.puntos_max ?? 5), 0)

                    return (
                      <div key={area.id} className="card">
                        <div className="font-extrabold text-gray-700 text-sm mb-3 flex items-center justify-between">
                          <span>📌 {area.nombre}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-normal text-gray-400">
                              {tareasArea.length} tareas · zona máx {ptsMax} pts
                            </span>
                            <button className="btn btn-g btn-sm text-xs"
                              onClick={() => abrirEditarTarea('crear', area.id)}>
                              ＋ Tarea
                            </button>
                          </div>
                        </div>

                        {tareasArea.length > 0 && (
                          <div className="overflow-x-auto mb-3">
                            <table className="w-full text-xs border-collapse min-w-[500px]">
                              <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide text-left">
                                  <th className="px-2 py-1.5 w-8">#</th>
                                  <th className="px-2 py-1.5 w-20">{labelProy}</th>
                                  <th className="px-2 py-1.5 w-12">Pág.</th>
                                  <th className="px-2 py-1.5">Descripción</th>
                                  <th className="px-2 py-1.5 text-center w-12">Pts</th>
                                  <th className="px-2 py-1.5 text-center w-16">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tareasArea.map((t: any, idx: number) => (
                                  <tr key={t.id}
                                    className={`border-b ${idx%2===0?'bg-white':'bg-gray-50/50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-400 font-bold">{t.numero_tarea}</td>
                                    <td className="px-2 py-1.5 text-gray-400 truncate max-w-[80px]">{t[campoProy] ?? '—'}</td>
                                    <td className="px-2 py-1.5 font-mono text-gray-400">{t.paginas ?? '—'}</td>
                                    <td className="px-2 py-1.5 text-gray-700">{t.nombre}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-blue-600">{t.puntos_max}</td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center justify-center gap-1">
                                        <button
                                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-blue-50 text-blue-600"
                                          title="Editar tarea"
                                          onClick={() => abrirEditarTarea({ ...t, area: { id: area.id } })}>
                                          ✏️
                                        </button>
                                        <button
                                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-500 disabled:opacity-40"
                                          title="Eliminar tarea"
                                          disabled={eliminandoId === t.id}
                                          onClick={() => eliminarTarea(t)}>
                                          {eliminandoId === t.id ? '⏳' : '🗑️'}
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {examenArea && (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-purple-700">📝 {examenArea.nombre}</div>
                              <div className="text-xs text-gray-400">Examen de área · máx. {examenArea.puntos_max} pts</div>
                            </div>
                            <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                              /100 → /{examenArea.puntos_max} pts
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal asignar técnico */}
      {modalAsignar && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">👨‍🏫 Asignar técnico a escala</h3>
              <button onClick={() => setModalAsignar(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <div className="font-bold text-blue-700">Escala seleccionada</div>
                <div className="text-gray-600 mt-1">{etapaSel?.nombre} — Libro {libroSel?.numero} ({libroSel?.version})</div>
              </div>
              <div className="fg"><label className="lbl">Técnico responsable *</label>
                <select className="inp" value={formAsig.tecnico_id}
                  onChange={e => setFormAsig(f => ({ ...f, tecnico_id: e.target.value }))}>
                  <option value="">— Seleccionar técnico —</option>
                  {tecnicos.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.primer_nombre} {t.primer_apellido}
                      {t.codigo_tecnico ? ` (${t.codigo_tecnico})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg"><label className="lbl">Observaciones</label>
                <textarea className="inp" rows={2}
                  value={formAsig.observaciones}
                  onChange={e => setFormAsig(f => ({ ...f, observaciones: e.target.value }))} /></div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalAsignar(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={asignarTecnico} disabled={asignando}>
                {asignando ? '⏳ Asignando...' : '✅ Asignar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal editar/crear tarea */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">
                {modalTarea === 'crear' ? '＋ Nueva tarea' : '✏️ Editar tarea'}
              </h3>
              <button onClick={() => setModalTarea(null)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm">
                <div className="text-gray-600">{etapaSel?.nombre} — Libro {libroSel?.numero} ({libroSel?.version})</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="fg">
                  <label className="lbl">Área *</label>
                  <select className="inp" value={formTarea.area_id ?? ''}
                    onChange={e => setFormTarea((f: any) => ({ ...f, area_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">No. de tarea</label>
                  <input type="number" className="inp" value={formTarea.numero_tarea ?? ''}
                    onChange={e => setFormTarea((f: any) => ({ ...f, numero_tarea: e.target.value }))} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Nombre de la tarea *</label>
                <input className="inp" value={formTarea.nombre ?? ''}
                  onChange={e => setFormTarea((f: any) => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="fg">
                  <label className="lbl">Página</label>
                  <input className="inp" value={formTarea.paginas ?? ''}
                    onChange={e => setFormTarea((f: any) => ({ ...f, paginas: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="lbl">{labelProy}</label>
                  <input className="inp" value={formTarea[campoProy] ?? formTarea.proyecto ?? formTarea.leccion ?? ''}
                    onChange={e => setFormTarea((f: any) => ({ ...f, [campoProy]: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="lbl">Puntos máx.</label>
                  <input type="number" step="0.5" className="inp" value={formTarea.puntos_max ?? 5}
                    onChange={e => setFormTarea((f: any) => ({ ...f, puntos_max: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalTarea(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardarTarea} disabled={guardandoTarea}>
                {guardandoTarea ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

