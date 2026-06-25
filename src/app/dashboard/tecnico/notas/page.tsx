'use client'
// src/app/dashboard/tecnico/notas/page.tsx
// FIX #10: Mostrar advertencia cuando no hay escalas
import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function NotasContent() {
  const sp = useSearchParams()

  const [ciclo,         setCiclo]         = useState('2026')
  const [buscarQ,       setBuscarQ]       = useState('')
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [inscSel,       setInscSel]       = useState<any>(null)
  const [libros,        setLibros]        = useState<any[]>([])
  const [libroSel,      setLibroSel]      = useState<any>(null)
  const [areas,         setAreas]         = useState<any[]>([])
  const [tareas,        setTareas]        = useState<any[]>([])
  const [examenes,      setExamenes]      = useState<any[]>([])
  const [notasMap,      setNotasMap]      = useState<Record<string, number | null>>({})
  const [loadTareas,    setLoadTareas]    = useState(false)
  const [saving,        setSaving]        = useState<string | null>(null)
  const [msg,           setMsg]           = useState('')
  const [etapaFiltro,   setEtapaFiltro]   = useState('')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [escalasAsignadas, setEscalasAsignadas] = useState<any[]>([])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  useEffect(() => {
    Promise.all([
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ]).then(([et, ar]) => {
      setEtapas(Array.isArray(et) ? et : [])
      setAreas(Array.isArray(ar) ? ar : [])
    })
  }, [])

  useEffect(() => {
    cargarEscalasAsignadas()
  }, [])

  const cargarEscalasAsignadas = async () => {
    const res = await fetch('/api/escala-asignaciones')
    const data = await res.json()
    setEscalasAsignadas(Array.isArray(data) ? data : [])
  }

  const cargarInscrip = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ ciclo, estado: 'en_curso' })
    if (etapaFiltro) params.set('etapa_id', etapaFiltro)
    const d = await fetch(`/api/inscripciones?${params}`).then(r => r.json()).catch(() => ({ data: [] }))
    setInscripciones(d.data ?? [])
    setLoading(false)
  }, [ciclo, etapaFiltro])

  useEffect(() => { cargarInscrip() }, [cargarInscrip])

  // Pre-seleccionar desde URL
  useEffect(() => {
    const idUrl = sp.get('id')
    if (idUrl && inscripciones.length > 0 && !inscSel) {
      const found = inscripciones.find((i: any) => i.id === idUrl)
      if (found) seleccionarInscripcion(found)
    }
  }, [sp, inscripciones])

  const seleccionarInscripcion = async (insc: any) => {
    setInscSel(insc)
    setLibroSel(null)
    setTareas([])
    setExamenes([])
    setNotasMap({})
    const etapaId = (insc.etapa as any)?.id
    const version = insc.version_libro
    const d = await fetch(`/api/libros?etapa_id=${etapaId}&version=${version}`)
      .then(r => r.json()).catch(() => [])
    setLibros(Array.isArray(d) ? d : [])
  }

  const seleccionarLibro = async (libro: any) => {
    setLibroSel(libro)
    setLoadTareas(true)
    setTareas([])
    setExamenes([])
    setNotasMap({})

    const [tareasRes, notasTareasRes, notasExamRes] = await Promise.all([
      fetch(`/api/tareas-catalogo?libro_id=${libro.id}&tipo=ambos`).then(r => r.json()).catch(() => ({ tareas:[], examenes:[] })),
      fetch(`/api/notas?inscripcion_id=${inscSel.id}&libro_id=${libro.id}&tipo=tareas`).then(r => r.json()).catch(() => ({ tareas: [] })),
      fetch(`/api/notas?inscripcion_id=${inscSel.id}&libro_id=${libro.id}&tipo=examenes`).then(r => r.json()).catch(() => ({ examenes: [] })),
    ])

    setTareas(tareasRes.tareas ?? [])
    setExamenes(tareasRes.examenes ?? [])

    const mapa: Record<string, number | null> = {}
    for (const n of (notasTareasRes.tareas ?? [])) mapa[`t-${n.tarea_id}`]  = n.nota
    for (const n of (notasExamRes.examenes ?? [])) mapa[`e-${n.examen_id}`] = n.nota_original
    setNotasMap(mapa)
    setLoadTareas(false)
  }

  const guardarNota = async (tipo: 'tarea'|'examen', itemId: string, nota: number | null) => {
    if (nota === null || nota === undefined) return
    if (tipo === 'tarea'  && (nota < 0 || nota > 5))   { flash('❌ Nota de tarea: 0 a 5'); return }
    if (tipo === 'examen' && (nota < 0 || nota > 100))  { flash('❌ Nota de examen: 0 a 100'); return }
    if (!inscSel?.id) return

    const key = `${tipo === 'tarea' ? 't' : 'e'}-${itemId}`
    setSaving(key)

    const body = tipo === 'tarea'
      ? { inscripcion_id: inscSel.id, tarea_id: itemId, nota, tipo: 'tarea' }
      : { inscripcion_id: inscSel.id, examen_id: itemId, nota_original: nota, tipo: 'examen' }

    const res = await fetch('/api/notas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await res.json()
    if (res.ok) {
      setNotasMap(prev => ({ ...prev, [key]: nota }))
      flash('✅ Nota guardada')
    } else {
      flash('❌ ' + (d.error ?? 'Error al guardar nota'))
    }
    setSaving(null)
  }

  const abrirPDF = () => {
    if (!inscSel || !libroSel) { flash('❌ Selecciona estudiante y libro primero'); return }
    window.open(`/api/escalas/pdf?inscripcion_id=${inscSel.id}&libro_id=${libroSel.id}`, '_blank')
  }

  const filtrados = inscripciones.filter(i => {
    if (!buscarQ.trim()) return true
    const e   = i.estudiante as any
    const txt = `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante} ${e?.cui}`.toLowerCase()
    return txt.includes(buscarQ.toLowerCase())
  })

  const calcZona = (tareasArea: any[]) => {
    const ids    = tareasArea.map((t: any) => t.id)
    const notas  = ids.map(id => notasMap[`t-${id}`]).filter((n): n is number => n !== null && n !== undefined)
    if (notas.length === 0) return null
    const ptsMax = tareasArea.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
    const pts    = notas.reduce((a, n) => a + n, 0)
    return ptsMax > 0 ? Math.round((pts / ptsMax) * 30 * 10) / 10 : 0
  }

  const esBachillerato = (inscSel?.etapa as any)?.codigo?.startsWith('BA') ?? false
  const campoProy      = esBachillerato ? 'proyecto' : 'leccion'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Registrar Notas</div>
          <div className="text-xs text-gray-400">Estudiante → Libro → Notas sobre 5</div>
        </div>
        <div className="flex gap-2">
          {inscSel && libroSel && (
            <button className="btn btn-g" onClick={abrirPDF}>
              📄 Descargar PDF
            </button>
          )}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </header>

      <div className="pc">
        {!escalasAsignadas || escalasAsignadas.length === 0 ? (
          <div className="card">
            <div className="alert al-w mb-4">
              <div className="font-bold text-base mb-2">⚠️ Sin escalas asignadas</div>
              <div className="text-sm text-gray-700">
                No tienes escalas asignadas aún. El director debe asignarte una escala en{' '}
                <b>Asignar Escalas</b> para que puedas:
              </div>
              <ul className="list-disc list-inside text-sm mt-2 text-gray-700 space-y-1">
                <li>Crear tareas y exámenes</li>
                <li>Ingresar calificaciones</li>
                <li>Generar escalas de calificación</li>
              </ul>
            </div>

            <div className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-gray-500">
                Contacta al director para que te asigne una escala de calificación
              </div>
            </div>
          </div>
        ) : (
          <>
            {msg && <div className={`alert mb-3 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

              {/* Panel izquierdo: lista de estudiantes */}
              <div className="lg:col-span-1 space-y-3">
                <div className="card">
                  <div className="card-title text-sm">🎓 Estudiantes</div>
                  <div className="space-y-2 mb-2">
                    <input className="inp text-sm" placeholder="🔍 Nombre, código, CUI..."
                      value={buscarQ} onChange={e => setBuscarQ(e.target.value)} />
                    <select className="inp text-sm" value={etapaFiltro} onChange={e => setEtapaFiltro(e.target.value)}>
                      <option value="">Todas las etapas</option>
                      {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="w-5 h-5 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filtrados.length === 0 ? (
                    <div className="text-center py-4 text-gray-400 text-xs">
                      {buscarQ ? 'Sin resultados' : 'Sin inscripciones'}
                    </div>
                  ) : (
                    <div className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                      {filtrados.map((i: any) => {
                        const e = i.estudiante as any
                        return (
                          <button key={i.id}
                            onClick={() => seleccionarInscripcion(i)}
                            className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all text-sm ${
                              inscSel?.id === i.id ? 'border-pronea bg-blue-50 font-bold' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'
                            }`}>
                            <div className="font-semibold truncate text-sm">
                              {e?.primer_apellido}, {e?.primer_nombre}
                            </div>
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <span>{(i.etapa as any)?.nombre}</span>
                              <span className={i.version_libro === 'nuevo' ? 'text-blue-400' : 'text-orange-400'}>
                                {i.version_libro === 'nuevo' ? '📗' : '📙'}
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Selector de libro */}
                {inscSel && (
                  <div className="card">
                    <div className="card-title text-sm">📚 Libro</div>
                    {libros.length === 0 ? (
                      <div className="text-xs text-orange-500 text-center py-2">
                        ⚠️ Sin libros para esta etapa y versión.<br />
                        <span className="text-gray-400">Admin debe crearlos en Libros y Tareas.</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {libros.map((l: any) => (
                          <button key={l.id}
                            onClick={() => seleccionarLibro(l)}
                            className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all text-sm ${
                              libroSel?.id === l.id ? 'border-pronea bg-blue-50 font-bold' : 'border-gray-100 hover:border-blue-200'
                            }`}>
                            📖 Libro {l.numero}
                            <div className="text-xs text-gray-400">{l.nombre}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Panel derecho: tabla de notas */}
              <div className="lg:col-span-3">
                {!inscSel ? (
                  <div className="card text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">👈</div>
                    <div className="font-semibold text-gray-600">Selecciona un estudiante de la lista</div>
                  </div>
                ) : !libroSel ? (
                  <div className="card text-center py-16 text-gray-400">
                    <div className="text-5xl mb-3">📚</div>
                    <div className="font-semibold text-gray-600">Selecciona el libro a calificar</div>
                  </div>
                ) : loadTareas ? (
                  <div className="card flex justify-center py-12">
                    <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Info del estudiante */}
                    <div className="card py-3 border-l-4 border-l-blue-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-extrabold text-lg">
                            {(inscSel.estudiante as any)?.primer_nombre} {(inscSel.estudiante as any)?.primer_apellido}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {(inscSel.etapa as any)?.nombre} · Libro {libroSel.numero} ·
                            {inscSel.version_libro === 'nuevo' ? ' 📗 Nuevo' : ' 📙 Viejo'}
                          </div>
                        </div>
                        <button className="btn btn-g btn-sm" onClick={abrirPDF}>
                          📄 PDF
                        </button>
                      </div>
                    </div>

                    {tareas.length === 0 ? (
                      <div className="card text-center py-8 text-gray-400">
                        <div className="text-3xl mb-2">📋</div>
                        <div>Sin tareas en el catálogo para este libro.</div>
                        <div className="text-xs mt-1 text-gray-400">
                          El técnico asignado debe construir las tareas en "Escalas Numéricas".
                        </div>
                      </div>
                    ) : (
                      areas.map((area: any) => {
                        const tareasArea = tareas.filter((t: any) => t.area?.id === area.id)
                          .sort((a: any, b: any) => a.numero_tarea - b.numero_tarea)
                        const examenArea = examenes.find((e: any) => e.area?.id === area.id)
                        if (tareasArea.length === 0 && !examenArea) return null

                        const zona     = calcZona(tareasArea)
                        const examNota = examenArea ? notasMap[`e-${examenArea.id}`] : null
                        const examPts  = examNota !== null && examNota !== undefined
                          ? Math.round((examNota / 100) * 20 * 10) / 10 : null
                        const total    = zona !== null && examPts !== null
                          ? Math.round((zona + examPts) * 10) / 10 : null

                        return (
                          <div key={area.id} className="card">
                            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                              <div className="font-extrabold text-gray-700">📌 {area.nombre}</div>
                              <div className="flex gap-3 text-xs font-bold">
                                {zona !== null && <span className="text-blue-600">Zona/30: {zona}</span>}
                                {examPts !== null && <span className="text-purple-600">Examen/20: {examPts}</span>}
                                {total !== null && (
                                  <span className={total >= 30 ? 'text-green-600' : 'text-red-500'}>
                                    Total/50: {total} {total >= 30 ? '✅' : '❌'}
                                  </span>
                                )}
                              </div>
                            </div>

                            {tareasArea.length > 0 && (
                              <div className="overflow-x-auto mb-3">
                                <table className="w-full text-xs border-collapse min-w-[600px]">
                                  <thead>
                                    <tr className="bg-gray-50 text-left">
                                      <th className="px-2 py-1.5 font-bold w-8">#</th>
                                      <th className="px-2 py-1.5 font-bold w-24">{esBachillerato ? 'Proyecto' : 'Lección'}</th>
                                      <th className="px-2 py-1.5 font-bold w-12">Pág.</th>
                                      <th className="px-2 py-1.5 font-bold">Descripción</th>
                                      <th className="px-2 py-1.5 font-bold text-center w-10">Máx.</th>
                                      <th className="px-2 py-1.5 font-bold text-center w-24">Nota (0-5)</th>
                                      <th className="px-2 py-1.5 font-bold text-center w-8">✓</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {tareasArea.map((t: any) => {
                                      const key       = `t-${t.id}`
                                      const notaActual = notasMap[key] ?? null
                                      return (
                                        <tr key={t.id}
                                          className={`border-b hover:bg-gray-50 ${notaActual !== null ? 'bg-green-50/30' : ''}`}>
                                          <td className="px-2 py-1.5 font-mono text-gray-400">{t.numero_tarea}</td>
                                          <td className="px-2 py-1.5 text-gray-400 truncate">{t[campoProy] ?? '—'}</td>
                                          <td className="px-2 py-1.5 font-mono text-gray-400">{t.paginas ?? '—'}</td>
                                          <td className="px-2 py-1.5">{t.nombre}</td>
                                          <td className="px-2 py-1.5 text-center text-gray-400">{t.puntos_max}</td>
                                          <td className="px-2 py-1.5 text-center">
                                            <input
                                              type="number" min="0" max="5" step="0.5"
                                              defaultValue={notaActual ?? ''}
                                              key={`${t.id}-${notaActual}`}
                                              onBlur={e => {
                                                const v = e.target.value === '' ? null : parseFloat(e.target.value)
                                                if (v !== notaActual) guardarNota('tarea', t.id, v)
                                              }}
                                              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                              className={`inp text-center font-bold w-20 ${notaActual !== null ? 'border-green-300' : ''} ${saving === key ? 'opacity-50' : ''}`}
                                              placeholder="—"
                                            />
                                          </td>
                                          <td className="px-2 py-1.5 text-center">
                                            {saving === key
                                              ? <span className="w-3 h-3 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                                              : notaActual !== null
                                              ? <span className="text-green-500 font-bold">✓</span>
                                              : <span className="text-gray-200">—</span>}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {examenArea && (
                              <div className="bg-purple-50 rounded-lg px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                                <div className="text-sm font-bold text-purple-700">
                                  📝 {examenArea.nombre}
                                  <span className="text-xs font-normal text-gray-500 ml-2">Nota sobre 100 → /20 automático</span>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                  <input
                                    type="number" min="0" max="100" step="1"
                                    defaultValue={notasMap[`e-${examenArea.id}`] ?? ''}
                                    key={`${examenArea.id}-${notasMap[`e-${examenArea.id}`]}`}
                                    onBlur={e => {
                                      const v = e.target.value === '' ? null : parseFloat(e.target.value)
                                      if (v !== notasMap[`e-${examenArea.id}`]) guardarNota('examen', examenArea.id, v)
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                    className="inp text-center font-bold w-24" placeholder="/100"
                                  />
                                  {examPts !== null && (
                                    <span className="text-purple-700 font-bold text-sm whitespace-nowrap">= {examPts}/20</span>
                                  )}
                                  {saving === `e-${examenArea.id}`
                                    ? <span className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin inline-block" />
                                    : notasMap[`e-${examenArea.id}`] !== undefined
                                    ? <span className="text-green-500 font-bold">✓</span>
                                    : null}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function TecnicoNotasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📝 Registrar Notas</div></header>
        <div className="pc flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <NotasContent />
    </Suspense>
  )
}
