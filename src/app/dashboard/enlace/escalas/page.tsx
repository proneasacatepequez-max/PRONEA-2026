'use client'
// src/app/dashboard/enlace/escalas/page.tsx
// Vista del catálogo de tareas para el enlace institucional — SOLO LECTURA
// Carga directo desde libros + tareas_catalogo (no depende de escala_asignaciones)
import { useState, useEffect, useCallback } from 'react'

export default function EnlaceEscalasPage() {
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

  useEffect(() => {
    Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ]).then(([et, ar]) => {
      setEtapas(Array.isArray(et) ? et : [])
      setAreas(Array.isArray(ar)  ? ar  : [])
      setLoading(false)
    })
  }, [])

  const seleccionarEtapa = async (etapa: any) => {
    setEtapaSel(etapa)
    setLibroSel(null); setLibros([])
    setTareas([]); setExamenes([]); setAreaSel('')
    if (!etapa) return
    setLoadLib(true)
    const d = await fetch(`/api/libros?etapa_id=${etapa.id}`)
      .then(r => r.json()).catch(() => [])
    setLibros(Array.isArray(d) ? d : [])
    setLoadLib(false)
  }

  const seleccionarLibro = useCallback(async (libro: any) => {
    setLibroSel(libro); setTareas([]); setExamenes([]); setAreaSel('')
    if (!libro) return
    setLoadTareas(true)
    const d = await fetch(`/api/tareas-catalogo?libro_id=${libro.id}&tipo=ambos`)
      .then(r => r.json()).catch(() => ({ tareas:[], examenes:[] }))
    setTareas(d.tareas   ?? [])
    setExamenes(d.examenes ?? [])
    setLoadTareas(false)
  }, [])

  const areasConTareas = areas.filter(a =>
    tareas.some((t: any) => t.area?.id === a.id) ||
    examenes.some((e: any) => e.area?.id === a.id)
  )
  const versiones = [...new Set(libros.map((l: any) => l.version))]
  const librosPorVersion = (v: string) =>
    libros.filter((l: any) => l.version === v).sort((a: any, b: any) => a.numero - b.numero)
  const tareasVista   = areaSel ? tareas.filter((t: any)  => String(t.area?.id) === areaSel) : tareas
  const examenesVista = areaSel ? examenes.filter((e: any) => String(e.area?.id) === areaSel) : examenes

  const esBach    = etapaSel?.codigo?.startsWith('BA') ?? false
  const campoProy = esBach ? 'proyecto' : 'leccion'
  const labelProy = esBach ? 'Proyecto' : 'Lección'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas</div>
          <div className="text-xs text-gray-400">
            Catálogo de tareas y exámenes por etapa y libro — consulta
          </div>
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
              ) : etapas.length === 0 ? (
                <div className="text-xs text-gray-400 text-center py-3">Sin etapas</div>
              ) : etapas.map((et: any) => (
                <button key={et.id} onClick={() => seleccionarEtapa(et)}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs transition-all mb-1 ${
                    etapaSel?.id === et.id
                      ? 'border-blue-500 bg-blue-50 font-bold'
                      : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
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
                  <div className="text-xs text-orange-500 text-center py-3">
                    ⚠️ Sin libros para esta etapa
                  </div>
                ) : versiones.map(ver => (
                  <div key={ver} className="mb-2">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {ver === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'}
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
                <div className="card-title text-sm mb-2">📌 Filtrar área</div>
                <button onClick={() => setAreaSel('')}
                  className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs mb-1 transition-all ${
                    !areaSel ? 'border-blue-500 bg-blue-50 font-bold' : 'border-gray-100 hover:border-blue-200'
                  }`}>
                  Todas las áreas
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
          </div>

          {/* PANEL DERECHO */}
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
              </div>
            ) : (
              <div className="space-y-4">

                {/* Encabezado libro */}
                <div className="card py-3 border-l-4 border-l-blue-400">
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
                            {tareasArea.length} tareas · máx zona {ptsMax} pts
                          </span>
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
                                </tr>
                              </thead>
                              <tbody>
                                {tareasArea.map((t: any, idx: number) => (
                                  <tr key={t.id}
                                    className={`border-b ${idx%2===0?'bg-white':'bg-gray-50/50'}`}>
                                    <td className="px-2 py-1.5 font-mono text-gray-400 font-bold">
                                      {t.numero_tarea}
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-400 truncate max-w-[80px]">
                                      {t[campoProy] ?? '—'}
                                    </td>
                                    <td className="px-2 py-1.5 font-mono text-gray-400">
                                      {t.paginas ?? '—'}
                                    </td>
                                    <td className="px-2 py-1.5 text-gray-700">{t.nombre}</td>
                                    <td className="px-2 py-1.5 text-center font-bold text-blue-600">
                                      {t.puntos_max}
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
                              <div className="text-sm font-bold text-purple-700">
                                📝 {examenArea.nombre}
                              </div>
                              <div className="text-xs text-gray-400">
                                Examen de área · nota sobre 100 → {examenArea.puntos_max} pts
                              </div>
                            </div>
                            <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded-full font-bold">
                              /{examenArea.puntos_max} pts
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
    </div>
  )
}
