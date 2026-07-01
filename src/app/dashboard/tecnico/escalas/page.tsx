'use client'
// src/app/dashboard/tecnico/escalas/page.tsx
// CORREGIDO: carga libros y tareas DIRECTAMENTE desde libros+tareas_catalogo
// ya NO depende de escala_asignaciones para mostrar el catálogo
import { useState, useEffect, useCallback } from 'react'

export default function TecnicoEscalasPage() {
  // Navegación
  const [etapas,     setEtapas]     = useState<any[]>([])
  const [etapaSel,   setEtapaSel]   = useState<any>(null)
  const [libros,     setLibros]     = useState<any[]>([])
  const [libroSel,   setLibroSel]   = useState<any>(null)
  const [areas,      setAreas]      = useState<any[]>([])
  const [areaSel,    setAreaSel]    = useState('')

  // Datos
  const [tareas,     setTareas]     = useState<any[]>([])
  const [examenes,   setExamenes]   = useState<any[]>([])
  const [loadLib,    setLoadLib]    = useState(false)
  const [loadTareas, setLoadTareas] = useState(false)
  const [loading,    setLoading]    = useState(true)

  // Modal tarea
  const [modalTarea, setModalTarea] = useState(false)
  const [editTarea,  setEditTarea]  = useState<any>(null)
  const [formTarea,  setFormTarea]  = useState({
    numero_tarea:'', nombre:'', paginas:'', puntos_max:'5',
    area_id:'', proyecto:'', leccion:'',
  })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  // Cargar etapas y áreas al inicio
  useEffect(() => {
    Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ]).then(([et, ar]) => {
      setEtapas(Array.isArray(et) ? et : [])
      setAreas(Array.isArray(ar) ? ar : [])
      setLoading(false)
    })
  }, [])

  // Cargar libros cuando cambia etapa
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

  // Cargar tareas cuando cambia libro
  const seleccionarLibro = useCallback(async (libro: any) => {
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
  }, [])

  // Áreas que tienen tareas en este libro
  const areasConTareas = areas.filter(a =>
    tareas.some((t: any) => t.area?.id === a.id) ||
    examenes.some((e: any) => e.area?.id === a.id)
  )

  // Versiones de libros disponibles
  const versiones = [...new Set(libros.map((l: any) => l.version))]
  const librosPorVersion = (v: string) =>
    libros.filter((l: any) => l.version === v).sort((a: any, b: any) => a.numero - b.numero)

  // Tareas filtradas por área
  const tareasVista  = areaSel ? tareas.filter((t: any)  => String(t.area?.id)  === areaSel) : tareas
  const examenesVista= areaSel ? examenes.filter((e: any) => String(e.area?.id) === areaSel) : examenes

  // Determinar si bachillerato
  const esBach    = etapaSel?.codigo?.startsWith('BA') ?? false
  const campoProy = esBach ? 'proyecto' : 'leccion'
  const labelProy = esBach ? 'Proyecto' : 'Lección'

  const abrirAgregar = () => {
    const siguiente = tareas.length > 0
      ? Math.max(...tareas.map((t: any) => t.numero_tarea ?? 0)) + 1
      : 1
    setFormTarea({
      numero_tarea: String(siguiente), nombre:'', paginas:'', puntos_max:'5',
      area_id: areaSel || (areasConTareas[0]?.id ? String(areasConTareas[0].id) : ''),
      proyecto:'', leccion:'',
    })
    setEditTarea(null)
    setModalTarea(true)
  }

  const abrirEditar = (t: any) => {
    setFormTarea({
      numero_tarea: String(t.numero_tarea),
      nombre:       t.nombre,
      paginas:      t.paginas   ?? '',
      puntos_max:   String(t.puntos_max ?? 5),
      area_id:      String(t.area?.id   ?? ''),
      proyecto:     t.proyecto  ?? '',
      leccion:      t.leccion   ?? '',
    })
    setEditTarea(t)
    setModalTarea(true)
  }

  const guardarTarea = async () => {
    if (!formTarea.nombre.trim()) { flash('❌ Nombre requerido'); return }
    if (!formTarea.area_id)       { flash('❌ Área requerida');   return }
    if (!libroSel?.id)            { flash('❌ Selecciona un libro'); return }
    setSaving(true)
    const body = {
      libro_id:     libroSel.id,
      area_id:      parseInt(formTarea.area_id),
      numero_tarea: parseInt(formTarea.numero_tarea),
      nombre:       formTarea.nombre.trim(),
      paginas:      formTarea.paginas || null,
      puntos_max:   parseFloat(formTarea.puntos_max) || 5,
      proyecto:     formTarea.proyecto || null,
      leccion:      formTarea.leccion  || null,
    }
    const url    = editTarea ? `/api/tareas-catalogo?id=${editTarea.id}` : '/api/tareas-catalogo'
    const method = editTarea ? 'PATCH' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (res.ok) {
      flash(editTarea ? '✅ Tarea actualizada' : '✅ Tarea agregada')
      setModalTarea(false)
      seleccionarLibro(libroSel)
    } else {
      flash('❌ ' + (d.error ?? 'Error'))
    }
    setSaving(false)
  }

  const eliminarTarea = async (id: string) => {
    if (!confirm('¿Eliminar esta tarea del catálogo?')) return
    const res = await fetch(`/api/tareas-catalogo?id=${id}`, { method: 'DELETE' })
    if (res.ok) { flash('✅ Tarea eliminada'); seleccionarLibro(libroSel) }
    else flash('❌ Error al eliminar')
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas — Catálogo de Tareas</div>
          <div className="text-xs text-gray-400">
            Consulta y administra el catálogo de tareas por etapa y libro
          </div>
        </div>
        {libroSel && (
          <button className="btn btn-p text-sm" onClick={abrirAgregar}>
            ＋ Agregar tarea
          </button>
        )}
      </header>

      <div className="pc">
        {msg && (
          <div className={`alert mb-3 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

          {/* ── PANEL IZQUIERDO ────────────────────────────── */}
          <div className="lg:col-span-1 space-y-3">

            {/* Selector de etapa */}
            <div className="card">
              <div className="card-title text-sm mb-2">📚 Etapa</div>
              {loading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {etapas.map((et: any) => (
                    <button key={et.id}
                      onClick={() => seleccionarEtapa(et)}
                      className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs transition-all ${
                        etapaSel?.id === et.id
                          ? 'border-blue-500 bg-blue-50 font-bold'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                      }`}>
                      {et.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selector de libro */}
            {etapaSel && (
              <div className="card">
                <div className="card-title text-sm mb-2">📖 Libro</div>
                {loadLib ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : libros.length === 0 ? (
                  <div className="text-xs text-orange-500 text-center py-3">
                    ⚠️ Sin libros para esta etapa
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versiones.map(ver => (
                      <div key={ver}>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                          {ver === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'}
                        </div>
                        {librosPorVersion(ver).map((l: any) => (
                          <button key={l.id}
                            onClick={() => seleccionarLibro(l)}
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
              </div>
            )}

            {/* Filtro por área */}
            {libroSel && areasConTareas.length > 0 && (
              <div className="card">
                <div className="card-title text-sm mb-2">📌 Área</div>
                <button
                  onClick={() => setAreaSel('')}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs mb-1 transition-all ${
                    !areaSel ? 'border-blue-500 bg-blue-50 font-bold' : 'border-gray-100 hover:border-blue-200'
                  }`}>
                  Todas las áreas
                </button>
                {areasConTareas.map((a: any) => (
                  <button key={a.id}
                    onClick={() => setAreaSel(String(a.id))}
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
          </div>

          {/* ── PANEL DERECHO — CATÁLOGO ─────────────────── */}
          <div className="lg:col-span-3">
            {!etapaSel ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📚</div>
                <div className="font-semibold text-gray-600">Selecciona una etapa</div>
              </div>
            ) : !libroSel ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📖</div>
                <div className="font-semibold text-gray-600">Selecciona un libro</div>
              </div>
            ) : loadTareas ? (
              <div className="card flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tareas.length === 0 && examenes.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <div className="text-4xl mb-3">📋</div>
                <div className="font-semibold text-gray-600">Sin tareas en este libro</div>
                <p className="text-xs mt-2 max-w-sm mx-auto text-gray-400">
                  El catálogo de tareas para{' '}
                  <b>{etapaSel.nombre} — Libro {libroSel.numero} ({libroSel.version})</b>{' '}
                  está vacío.
                </p>
                <button className="btn btn-p mt-4" onClick={abrirAgregar}>
                  ＋ Agregar primera tarea
                </button>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Encabezado del libro */}
                <div className="card py-3 border-l-4 border-l-blue-500">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <div className="font-extrabold text-gray-800">
                        {etapaSel.nombre} — Libro {libroSel.numero}
                        <span className="ml-2 text-xs font-normal text-gray-400">
                          ({libroSel.version === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'})
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {tareasVista.length} tareas · {examenesVista.length} exámenes
                        {areaSel && ' · Filtrado por área'}
                      </div>
                    </div>
                    <button className="btn btn-p btn-sm" onClick={abrirAgregar}>
                      ＋ Agregar tarea
                    </button>
                  </div>
                </div>

                {/* Bloques por área */}
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
                          <span className="text-xs font-normal text-gray-400">
                            {tareasArea.length} tareas · zona máx {ptsMax} pts
                          </span>
                        </div>

                        {tareasArea.length > 0 && (
                          <div className="overflow-x-auto mb-3">
                            <table className="w-full text-xs border-collapse min-w-[560px]">
                              <thead>
                                <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide text-left">
                                  <th className="px-2 py-1.5 w-8">#</th>
                                  <th className="px-2 py-1.5 w-20">{labelProy}</th>
                                  <th className="px-2 py-1.5 w-12">Pág.</th>
                                  <th className="px-2 py-1.5">Descripción de la tarea</th>
                                  <th className="px-2 py-1.5 text-center w-12">Pts</th>
                                  <th className="px-2 py-1.5 text-center w-16">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tareasArea.map((t: any, idx: number) => (
                                  <tr key={t.id}
                                    className={`border-b hover:bg-blue-50/30 ${idx%2===0?'bg-white':'bg-gray-50/50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-400 font-bold">{t.numero_tarea}</td>
                                    <td className="px-2 py-1.5 text-gray-400 truncate max-w-[80px]">
                                      {t[campoProy] ?? '—'}
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-gray-400">{t.paginas ?? '—'}</td>
                                    <td className="px-2 py-1.5 text-gray-700">{t.nombre}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-blue-600">{t.puntos_max}</td>
                                    <td className="px-2 py-1.5 text-center">
                                      <div className="flex gap-1 justify-center">
                                        <button onClick={() => abrirEditar(t)}
                                          className="text-blue-500 hover:text-blue-700 px-1" title="Editar">✏️</button>
                                        <button onClick={() => eliminarTarea(t.id)}
                                          className="text-red-400 hover:text-red-600 px-1" title="Eliminar">🗑</button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}

                        {examenArea && (
                          <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <div className="text-sm font-bold text-purple-700">📝 {examenArea.nombre}</div>
                              <div className="text-xs text-gray-400">Examen · máx. {examenArea.puntos_max} pts (/100 → /{examenArea.puntos_max})</div>
                            </div>
                            <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                              Examen de área
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

      {/* ── Modal agregar/editar tarea ─────────────────── */}
      {modalTarea && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">{editTarea ? '✏️ Editar tarea' : '➕ Agregar tarea'}</h3>
              <button onClick={() => setModalTarea(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="fg"><label className="lbl">No. Tarea *</label>
                  <input type="number" className="inp" min="1"
                    value={formTarea.numero_tarea}
                    onChange={e => setFormTarea(f => ({ ...f, numero_tarea: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Página</label>
                  <input className="inp font-mono" placeholder="ej. 45"
                    value={formTarea.paginas}
                    onChange={e => setFormTarea(f => ({ ...f, paginas: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Pts. máx</label>
                  <input type="number" className="inp" min="1" max="10" step="0.5"
                    value={formTarea.puntos_max}
                    onChange={e => setFormTarea(f => ({ ...f, puntos_max: e.target.value }))} /></div>
              </div>
              <div className="fg"><label className="lbl">Área *</label>
                <select className="inp" value={formTarea.area_id}
                  onChange={e => setFormTarea(f => ({ ...f, area_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="fg"><label className="lbl">{labelProy}</label>
                <input className="inp"
                  value={esBach ? formTarea.proyecto : formTarea.leccion}
                  onChange={e => setFormTarea(f => esBach
                    ? { ...f, proyecto: e.target.value }
                    : { ...f, leccion:  e.target.value }
                  )} /></div>
              <div className="fg"><label className="lbl">Descripción / Nombre de la tarea *</label>
                <textarea className="inp" rows={3} placeholder="Descripción de la actividad..."
                  value={formTarea.nombre}
                  onChange={e => setFormTarea(f => ({ ...f, nombre: e.target.value }))} /></div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalTarea(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardarTarea} disabled={saving}>
                {saving ? '⏳ Guardando...' : '✅ Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
