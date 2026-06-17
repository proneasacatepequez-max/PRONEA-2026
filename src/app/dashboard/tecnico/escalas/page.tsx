'use client'
// src/app/dashboard/tecnico/escalas/page.tsx
// FIX: campos proyecto/lección, botón editar tarea, áreas sin duplicados
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function EscalasContent() {
  const sp = useSearchParams()

  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [seleccionada, setSeleccionada] = useState<any>(null)
  const [tareas,       setTareas]       = useState<any[]>([])
  const [examenes,     setExamenes]     = useState<any[]>([])
  const [areas,        setAreas]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [loadTareas,   setLoadTareas]   = useState(false)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState('')
  const [ciclo,        setCiclo]        = useState('2026')
  const [modalTarea,   setModalTarea]   = useState(false)
  const [editTarea,    setEditTarea]    = useState<any>(null)

  // Determinar si es bachillerato (tiene campo Proyecto) o básico/primaria (tiene Lección)
  const etapaCodigo = (seleccionada?.etapa as any)?.codigo ?? ''
  const esBachillerato = etapaCodigo.startsWith('BA')
  const campoProyecto  = esBachillerato ? 'Proyecto' : 'Lección'

  const [formTarea, setFormTarea] = useState({
    numero_tarea: '', nombre: '', paginas: '', puntos_max: '5',
    area_id: '', descripcion: '', proyecto: '', leccion: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [asig, ar] = await Promise.all([
      fetch(`/api/escala-asignaciones?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ])
    setAsignaciones(Array.isArray(asig) ? asig : [])
    setAreas(Array.isArray(ar) ? ar : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const cargarTareas = useCallback(async (asig: any) => {
    if (!asig?.libro?.id) { setTareas([]); setExamenes([]); return }
    setLoadTareas(true)
    const areaId = asig.area?.id
    const url = `/api/tareas-catalogo?libro_id=${asig.libro.id}&tipo=ambos${areaId ? `&area_id=${areaId}` : ''}`
    const d = await fetch(url).then(r => r.json()).catch(() => ({ tareas:[], examenes:[] }))
    setTareas(d.tareas   ?? [])
    setExamenes(d.examenes ?? [])
    setLoadTareas(false)
  }, [])

  useEffect(() => {
    if (seleccionada) cargarTareas(seleccionada)
  }, [seleccionada, cargarTareas])

  // Áreas disponibles según la asignación
  // Si la asignación tiene área específica, solo esa área
  // Si no, todas las áreas
  const areasDisponibles = seleccionada?.area?.id
    ? areas.filter((a: any) => a.id === seleccionada.area.id)
    : areas

  const abrirCrearTarea = () => {
    const siguiente = tareas.length > 0
      ? Math.max(...tareas.map((t: any) => t.numero_tarea ?? 0)) + 1
      : 1
    setFormTarea({
      numero_tarea: String(siguiente),
      nombre: '', paginas: '', puntos_max: '5',
      area_id: areasDisponibles[0]?.id ? String(areasDisponibles[0].id) : '',
      descripcion: '', proyecto: '', leccion: '',
    })
    setEditTarea(null)
    setModalTarea(true)
  }

  const abrirEditarTarea = (t: any) => {
    setFormTarea({
      numero_tarea: String(t.numero_tarea),
      nombre:       t.nombre       ?? '',
      paginas:      t.paginas      ?? '',
      puntos_max:   String(t.puntos_max ?? 5),
      area_id:      t.area?.id     ? String(t.area.id) : '',
      descripcion:  t.descripcion  ?? '',
      proyecto:     t.proyecto     ?? '',
      leccion:      t.leccion      ?? '',
    })
    setEditTarea(t)
    setModalTarea(true)
  }

  const guardarTarea = async () => {
    if (!formTarea.nombre.trim()) { flash('❌ La descripción de la tarea es requerida'); return }
    if (!formTarea.area_id)       { flash('❌ El área es requerida'); return }
    if (!seleccionada?.libro?.id) { flash('❌ Selecciona una escala primero'); return }

    setSaving(true)
    const body: any = {
      tipo:         'tarea',
      libro_id:     seleccionada.libro.id,
      area_id:      parseInt(formTarea.area_id),
      numero_tarea: parseInt(formTarea.numero_tarea) || tareas.length + 1,
      nombre:       formTarea.nombre.trim(),
      paginas:      formTarea.paginas.trim()     || null,
      puntos_max:   parseFloat(formTarea.puntos_max) || 5,
      descripcion:  formTarea.descripcion.trim() || null,
    }

    // Proyecto o lección según el nivel
    if (esBachillerato) {
      body.proyecto = formTarea.proyecto.trim() || null
    } else {
      body.leccion  = formTarea.leccion.trim()  || null
    }

    if (editTarea) body.id = editTarea.id

    const res = await fetch('/api/tareas-catalogo', {
      method:  editTarea ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Tarea ${editTarea ? 'actualizada' : 'agregada'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) {
      setModalTarea(false)
      await cargarTareas(seleccionada)
      // Actualizar estado a en_progreso
      if (seleccionada.estado === 'pendiente') {
        await fetch('/api/escala-asignaciones', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: seleccionada.id, estado: 'en_progreso' }),
        })
        await cargar()
      }
    }
    setSaving(false)
  }

  const crearExamen = async (areaId: string, areaNombre: string) => {
    if (!seleccionada?.libro?.id) return
    setSaving(true)
    const res = await fetch('/api/tareas-catalogo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tipo: 'examen', libro_id: seleccionada.libro.id,
        area_id: parseInt(areaId), area_nombre: areaNombre,
        nombre: `Examen — ${areaNombre}`,
      }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Examen creado' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) await cargarTareas(seleccionada)
    setSaving(false)
  }

  const eliminarTarea = async (id: string, tipo: string) => {
    if (!confirm('¿Eliminar esta tarea?')) return
    const res = await fetch(`/api/tareas-catalogo?id=${id}&tipo=${tipo}`, { method: 'DELETE' })
    const d   = await res.json()
    flash(res.ok ? (d.mensaje ? '⚠️ ' + d.mensaje : '✅ Eliminada') : '❌ Error')
    if (res.ok) await cargarTareas(seleccionada)
  }

  const marcarCompletado = async () => {
    if (!seleccionada) return
    const res = await fetch('/api/escala-asignaciones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: seleccionada.id, estado: 'completado' }),
    })
    flash(res.ok ? '✅ Escala completada — visible para todos los técnicos' : '❌ Error')
    if (res.ok) {
      await cargar()
      setSeleccionada((p: any) => ({ ...p, estado: 'completado' }))
    }
  }

  const FT = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setFormTarea(p => ({ ...p, [k]: e.target.value }))

  // Agrupar tareas por área
  const tareasPorArea = areas.reduce((acc: Record<string, any[]>, area: any) => {
    acc[area.id] = tareas.filter((t: any) => t.area?.id === area.id)
    return acc
  }, {})

  const ESTADO_COLOR: Record<string, string> = {
    pendiente: 'badge-yellow', en_progreso: 'badge-blue', completado: 'badge-green',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas</div>
          <div className="text-xs text-gray-400">Construye las escalas asignadas por el director</div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : msg.startsWith('⚠️') ? 'al-w' : 'al-e'}`}>{msg}</div>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Lista de escalas */}
          <div className="md:col-span-1">
            <div className="card">
              <div className="card-title">📋 Mis escalas asignadas</div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                </div>
              ) : asignaciones.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <div className="text-3xl mb-2">📊</div>
                  El director aún no ha asignado escalas
                </div>
              ) : (
                <div className="space-y-2">
                  {asignaciones.map((a: any) => (
                    <button key={a.id} onClick={() => setSeleccionada(a)}
                      className={`w-full text-left px-3 py-3 rounded-xl border-2 transition-all ${
                        seleccionada?.id === a.id
                          ? 'border-pronea bg-blue-50'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                      }`}>
                      <div className="font-semibold text-sm">{(a.etapa as any)?.nombre}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {(a.libro as any)?.nombre ?? 'Todos los libros'}
                        {(a.area as any)?.nombre && <span className="ml-1">· {(a.area as any).nombre}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`badge text-xs ${ESTADO_COLOR[a.estado]??'badge-gray'}`}>{a.estado}</span>
                        <span className="text-xs text-gray-400">{a.tareas_construidas} tareas</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Constructor */}
          <div className="md:col-span-2">
            {!seleccionada ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">👈</div>
                <div className="font-semibold text-gray-600">Selecciona una escala</div>
                <div className="text-sm mt-1">para ver y construir las tareas</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`card border-l-4 ${seleccionada.estado==='completado'?'border-l-green-400':'border-l-blue-400'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-extrabold">{(seleccionada.etapa as any)?.nombre}</div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {seleccionada.version_libro==='nuevo'?'📗 Libro Nuevo':'📙 Libro Viejo'}
                        {(seleccionada.libro as any)?.nombre && ` — ${(seleccionada.libro as any).nombre} (Libro ${(seleccionada.libro as any).numero})`}
                        {(seleccionada.area as any)?.nombre  && ` — ${(seleccionada.area as any).nombre}`}
                      </div>
                      {seleccionada.observaciones && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mt-1">
                          📌 {seleccionada.observaciones}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Campo: <b>{campoProyecto}</b>
                        {esBachillerato ? ' (Proyecto — específico de Bachillerato)' : ' (Lección — Primaria y Básico)'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0 flex-wrap">
                      {seleccionada.estado !== 'completado' && (
                        <button className="btn btn-s btn-sm" onClick={marcarCompletado}>
                          ✅ Marcar completa
                        </button>
                      )}
                      <button className="btn btn-p btn-sm" onClick={abrirCrearTarea}>
                        ＋ Agregar tarea
                      </button>
                    </div>
                  </div>
                </div>

                {loadTareas ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {areasDisponibles.map((area: any) => {
                      const tareasArea = tareasPorArea[area.id] ?? []
                      const examenArea = examenes.find((e: any) => e.area?.id === area.id)
                      return (
                        <div key={area.id} className="card">
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-extrabold text-gray-700">
                              📌 {area.nombre}
                              <span className="text-xs font-normal text-gray-400 ml-2">({tareasArea.length} tareas)</span>
                            </div>
                            {!examenArea && (
                              <button className="btn btn-g btn-sm text-xs"
                                onClick={() => crearExamen(area.id, area.nombre)}>
                                ＋ Examen
                              </button>
                            )}
                          </div>

                          {tareasArea.length === 0 ? (
                            <div className="text-xs text-gray-400 text-center py-3 bg-gray-50 rounded-lg">
                              Sin tareas — usa "＋ Agregar tarea" para iniciar
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs border-collapse">
                                <thead>
                                  <tr className="bg-gray-50">
                                    <th className="px-2 py-1.5 text-left font-bold w-8">#</th>
                                    <th className="px-2 py-1.5 text-left font-bold w-24">{campoProyecto}</th>
                                    <th className="px-2 py-1.5 text-left font-bold w-14">Pág.</th>
                                    <th className="px-2 py-1.5 text-left font-bold">Descripción de la actividad</th>
                                    <th className="px-2 py-1.5 text-center font-bold w-12">Pts.</th>
                                    <th className="px-2 py-1.5 text-center font-bold w-16">Acción</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {tareasArea
                                    .sort((a: any, b: any) => a.numero_tarea - b.numero_tarea)
                                    .map((t: any) => (
                                      <tr key={t.id} className="border-b hover:bg-gray-50">
                                        <td className="px-2 py-1.5 font-mono text-gray-500">{t.numero_tarea}</td>
                                        <td className="px-2 py-1.5 text-gray-500 text-xs">
                                          {(esBachillerato ? t.proyecto : t.leccion) ?? '—'}
                                        </td>
                                        <td className="px-2 py-1.5 font-mono text-gray-500">{t.paginas ?? '—'}</td>
                                        <td className="px-2 py-1.5 font-semibold">{t.nombre}</td>
                                        <td className="px-2 py-1.5 text-center font-bold text-blue-600">{t.puntos_max}</td>
                                        <td className="px-2 py-1.5">
                                          <div className="flex gap-1 justify-center">
                                            <button className="btn btn-p btn-sm" onClick={() => abrirEditarTarea(t)} title="Editar">✏️</button>
                                            <button className="btn btn-d btn-sm" onClick={() => eliminarTarea(t.id, 'tarea')} title="Eliminar">🗑️</button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {examenArea && (
                            <div className="mt-3 bg-purple-50 rounded-lg px-3 py-2 flex items-center justify-between">
                              <div className="text-sm">
                                <span className="font-bold text-purple-700">📝 Examen:</span>
                                <span className="ml-2">{examenArea.nombre}</span>
                                <span className="ml-2 text-xs text-gray-400">— 20 puntos</span>
                              </div>
                              <button className="btn btn-d btn-sm text-xs"
                                onClick={() => eliminarTarea(examenArea.id, 'examen')}>🗑️</button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal agregar/editar tarea */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {editTarea ? '✏️ Editar tarea' : '＋ Agregar tarea'}
                </h3>
                <button onClick={() => setModalTarea(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">N° de tarea</label>
                    <input type="number" className="inp font-mono" value={formTarea.numero_tarea}
                      onChange={FT('numero_tarea')} min="1" />
                  </div>
                  <div className="fg">
                    <label className="lbl">Página del libro</label>
                    <input className="inp font-mono" value={formTarea.paginas}
                      onChange={FT('paginas')} placeholder="Ej: 19 ó 35-40" />
                  </div>
                </div>

                {/* Campo Proyecto o Lección según nivel */}
                <div className="fg">
                  <label className="lbl">{campoProyecto}</label>
                  {esBachillerato ? (
                    <input className="inp" value={formTarea.proyecto} onChange={FT('proyecto')}
                      placeholder="Ej: Cuidado del Medio Ambiente Proyecto" />
                  ) : (
                    <input className="inp" value={formTarea.leccion} onChange={FT('leccion')}
                      placeholder="Ej: Lección 3, Unidad 1" />
                  )}
                </div>

                <div className="fg">
                  <label className="lbl">Descripción de la actividad *</label>
                  <textarea className="inp" rows={3} value={formTarea.nombre} onChange={FT('nombre')}
                    placeholder="Ej: Expreso en forma algebraica los siguientes casos usando variables" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Área *</label>
                    <select className="inp" value={formTarea.area_id} onChange={FT('area_id')}>
                      <option value="">— Seleccionar —</option>
                      {areasDisponibles.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Puntos máx. (sobre 5)</label>
                    <input type="number" className="inp" value={formTarea.puntos_max}
                      onChange={FT('puntos_max')} min="0.5" max="5" step="0.5" />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModalTarea(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardarTarea} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    : editTarea ? '💾 Actualizar' : '✅ Agregar tarea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TecnicoEscalasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📊 Escalas Numéricas</div></header>
        <div className="pc flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <EscalasContent />
    </Suspense>
  )
}
