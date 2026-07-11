'use client'
// src/app/dashboard/enlace/notas/page.tsx
// REESCRITO: antes usaba /api/notas?numero_libro=X que SOLO devuelve tareas
// que YA tienen nota — nunca mostraba el catálogo completo pendiente de
// calificar. Ahora usa el mismo patrón robusto del técnico: catálogo real
// (tareas_catalogo) + notas existentes fusionadas.
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function EnlaceNotasContent() {
  const sp     = useSearchParams()
  const inscId = sp.get('id') ?? ''

  const [permChecked,  setPermChecked]  = useState(false)
  const [tienePermiso, setTienePermiso] = useState(false)

  const [insc,      setInsc]      = useState<any>(null)
  const [libros,    setLibros]    = useState<any[]>([])
  const [libroSel,  setLibroSel]  = useState<any>(null)
  const [tareas,    setTareas]    = useState<any[]>([])
  const [examenes,  setExamenes]  = useState<any[]>([])
  const [areas,     setAreas]     = useState<any[]>([])
  const [areaSel,       setAreaSel]       = useState('')
  const [buscarPagina,  setBuscarPagina]  = useState('')
  const [ordenPagina,   setOrdenPagina]   = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [loadLib,   setLoadLib]   = useState(true)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [msg,       setMsg]       = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  // 1) Verificar permiso primero
  useEffect(() => {
    fetch('/api/permisos').then(r => r.json()).then(perms => {
      const tiene = Array.isArray(perms) &&
        perms.some((p: any) => p.permiso === 'ingresar_notas_enlace' && p.activo)
      setTienePermiso(tiene)
      setPermChecked(true)
    }).catch(() => { setTienePermiso(false); setPermChecked(true) })
    fetch('/api/areas').then(r => r.json()).then(ar => setAreas(Array.isArray(ar) ? ar : [])).catch(() => {})
  }, [])

  // 3) Al elegir libro: catálogo completo + notas existentes fusionadas
  const seleccionarLibro = useCallback(async (libro: any) => {
    setLibroSel(libro)
    setLoading(true)
    setTareas([]); setExamenes([])
    setAreaSel(''); setBuscarPagina(''); setOrdenPagina(false)

    const [catalogoRes, notasTRes, notasERes] = await Promise.all([
      fetch(`/api/tareas-catalogo?libro_id=${libro.id}&tipo=ambos`)
        .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
        .catch(() => ({ ok: false, body: { error: 'Error de conexión' } })),
      fetch(`/api/notas?inscripcion_id=${inscId}&libro_id=${libro.id}&tipo=tareas`).then(r => r.json()).catch(() => ({ tareas: [] })),
      fetch(`/api/notas?inscripcion_id=${inscId}&libro_id=${libro.id}&tipo=examenes`).then(r => r.json()).catch(() => ({ examenes: [] })),
    ])

    if (!catalogoRes.ok) {
      flash('❌ ' + (catalogoRes.body?.error ?? 'Error al cargar catálogo'))
      setLoading(false)
      return
    }

    const notaTareaMap = new Map((notasTRes.tareas ?? []).map((n: any) => [n.tarea_id, n.nota]))
    const notaExamMap  = new Map((notasERes.examenes ?? []).map((n: any) => [n.examen_id, n.nota_original]))

    const tareasCat   = (catalogoRes.body.tareas   ?? []).map((t: any) => ({ ...t, nota: notaTareaMap.has(t.id) ? notaTareaMap.get(t.id) : null }))
    const examenesCat = (catalogoRes.body.examenes ?? []).map((e: any) => ({ ...e, nota_original: notaExamMap.has(e.id) ? notaExamMap.get(e.id) : null }))

    setTareas(tareasCat.sort((a: any, b: any) => a.numero_tarea - b.numero_tarea))
    setExamenes(examenesCat)
    setLoading(false)
  }, [inscId])

  // 2) Cargar inscripción real (etapa, versión) y sus libros
  useEffect(() => {
    if (!permChecked || !tienePermiso || !inscId) return
    setLoadLib(true)
    fetch(`/api/inscripciones?id=${inscId}`)
      .then(r => r.json())
      .then(async (inscData) => {
        setInsc(inscData)
        if (inscData?.etapa?.id) {
          const lib = await fetch(`/api/libros?etapa_id=${inscData.etapa.id}&version=${inscData.version_libro ?? 'nuevo'}`)
            .then(r => r.json()).catch(() => [])
          const librosArr = Array.isArray(lib) ? lib : []
          setLibros(librosArr)
          if (librosArr.length > 0) seleccionarLibro(librosArr[0])
        }
        setLoadLib(false)
      })
      .catch(() => setLoadLib(false))
  }, [permChecked, tienePermiso, inscId, seleccionarLibro])

  const guardarTarea = async (tareaId: string, val: string) => {
    const nota = parseFloat(val)
    if (isNaN(nota) || nota < 0 || nota > 5) return
    setSaving(tareaId)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'tarea', inscripcion_id: inscId, tarea_id: tareaId, nota }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else {
      flash('✅ Guardado')
      setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, nota } : t))
    }
    setSaving(null)
  }

  const guardarExamen = async (examenId: string, val: string) => {
    const nota_original = parseFloat(val)
    if (isNaN(nota_original) || nota_original < 0 || nota_original > 100) return
    setSaving(examenId)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'examen', inscripcion_id: inscId, examen_id: examenId, nota_original }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else {
      flash('✅ Guardado')
      setExamenes(prev => prev.map(ex => ex.id === examenId ? { ...ex, nota_original, puntos_obtenidos: d.puntos_obtenidos } : ex))
    }
    setSaving(null)
  }

  // Sin inscId
  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc">
        <div className="alert al-w">
          Selecciona un estudiante desde{' '}
          <Link href="/dashboard/enlace/estudiantes" className="underline font-bold">
            Mis Estudiantes
          </Link>{' '}
          para ingresar notas.
        </div>
      </div>
    </div>
  )

  // Verificando permiso
  if (!permChecked) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  // Sin permiso
  if (!tienePermiso) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc max-w-lg">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <div className="font-extrabold text-gray-700 text-lg mb-2">Sin autorización</div>
          <div className="text-sm text-gray-500 mb-5">
            No tienes permiso para ingresar notas.<br />
            Solicita al técnico que gestione la autorización con el director.
          </div>
          <Link href="/dashboard/enlace/estudiantes" className="btn btn-g">
            ← Volver a estudiantes
          </Link>
        </div>
      </div>
    </div>
  )

  const areasConTareas = areas.filter(a =>
    tareas.some((t: any) => String(t.area?.id) === String(a.id)) ||
    examenes.some((e: any) => String(e.area?.id) === String(a.id))
  )

  const tareasVista = (areaSel
    ? tareas.filter((t: any) => String(t.area?.id) === areaSel)
    : tareas)
    .filter((t: any) => !buscarPagina.trim() || String(t.paginas ?? '').includes(buscarPagina.trim()))
    .sort((a: any, b: any) => {
      if (ordenPagina) {
        const pA = parseInt(String(a.paginas ?? '').match(/\d+/)?.[0] ?? '999999')
        const pB = parseInt(String(b.paginas ?? '').match(/\d+/)?.[0] ?? '999999')
        if (pA !== pB) return pA - pB
      }
      return a.numero_tarea - b.numero_tarea
    })

  const examenesVista = areaSel
    ? examenes.filter((e: any) => String(e.area?.id) === areaSel)
    : examenes

  const ingresadas  = tareas.filter(t => t.nota !== null).length
  const total       = tareas.length
  const todasListas = total > 0 && ingresadas === total

  const puntosObt = tareas.filter(t => t.nota !== null).reduce((a, t) => a + t.nota, 0)
  const puntosMax = tareas.reduce((a, t) => a + (t.puntos_max ?? 5), 0)
  const zonaPct   = puntosMax > 0 ? ((puntosObt / puntosMax) * 100).toFixed(1) : '0.0'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Ingresar Notas</div>
          <div className="text-xs text-gray-400">
            {insc?.estudiante?.primer_nombre} {insc?.estudiante?.primer_apellido}
            {insc?.etapa?.nombre && ` · ${insc.etapa.nombre}`}
            {libroSel && ` · ${libroSel.nombre} (${libroSel.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'})`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </span>
          )}
          {libros.length > 0 && (
            <select
              className="inp w-40"
              value={libroSel?.id ?? ''}
              onChange={e => {
                const l = libros.find((x: any) => x.id === e.target.value)
                if (l) seleccionarLibro(l)
              }}>
              {libros.map((l: any) => (
                <option key={l.id} value={l.id}>Libro {l.numero} — {l.nombre}</option>
              ))}
            </select>
          )}
          {areasConTareas.length > 0 && (
            <select className="inp w-44" value={areaSel} onChange={e => setAreaSel(e.target.value)}>
              <option value="">Todas las áreas</option>
              {areasConTareas.map((a: any) => (
                <option key={a.id} value={a.id}>{a.nombre}</option>
              ))}
            </select>
          )}
          <input
            className="inp w-28"
            placeholder="Buscar página..."
            value={buscarPagina}
            onChange={e => setBuscarPagina(e.target.value)}
          />
          <button
            className={`text-xs px-3 py-2 rounded-lg border whitespace-nowrap ${ordenPagina ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'}`}
            title="Ordenar por página, de menor a mayor"
            onClick={() => setOrdenPagina(v => !v)}>
            📄 {ordenPagina ? '✓ ' : ''}Ordenar por página
          </button>
          <Link href="/dashboard/enlace/estudiantes" className="btn btn-g">← Volver</Link>
        </div>
      </header>

      <div className="pc">
        {loadLib ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : libros.length === 0 ? (
          <div className="alert al-w">No se encontraron libros para la etapa de este estudiante.</div>
        ) : (
          <>
            {/* Barra de progreso */}
            {total > 0 && (
              <div className="card mb-4 border-l-4 border-l-blue-400">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-700">
                    Progreso: {ingresadas} / {total} tareas
                  </span>
                  <span className="text-sm font-bold text-blue-700">
                    {puntosObt} / {puntosMax} pts ({zonaPct}%)
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (ingresadas / total * 100) : 0}%` }}
                  />
                </div>
                {todasListas && (
                  <div className="mt-2 text-xs text-green-600 font-bold">
                    ✅ Tareas completas — puedes registrar los exámenes abajo
                  </div>
                )}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* TAREAS */}
                <div className="card mb-5">
                  <div className="card-title">📋 Tareas — ordenadas por página</div>
                  {tareasVista.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      {tareas.length === 0
                        ? 'Sin tareas configuradas para este libro'
                        : 'Ningún resultado con ese filtro — prueba con otra área o página'}
                    </div>
                  ) : (
                    <div className="tw">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th className="w-10">#</th>
                            <th className="w-20">Páginas</th>
                            <th>Descripción</th>
                            <th className="w-28">Área</th>
                            <th className="w-16 text-center">Máx.</th>
                            <th className="w-24 text-center">Nota (0–5)</th>
                            <th className="w-20 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tareasVista.map((t: any) => (
                            <tr key={t.id} className={t.nota === null ? 'bg-yellow-50/60' : ''}>
                              <td className="text-gray-400 text-xs font-mono">{t.numero_tarea}</td>
                              <td className="text-xs text-gray-500 font-mono">{t.paginas ?? '—'}</td>
                              <td className="font-semibold text-sm">{t.nombre}</td>
                              <td>
                                <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
                                  {(t.area as any)?.nombre ?? '—'}
                                </span>
                              </td>
                              <td className="text-center text-xs font-bold text-gray-500">
                                {t.puntos_max ?? 5}
                              </td>
                              <td className="text-center">
                                <input
                                  type="number" min={0} max={5} step={0.5}
                                  defaultValue={t.nota ?? ''}
                                  disabled={saving === t.id}
                                  onBlur={e => {
                                    const v = e.target.value.trim()
                                    if (v !== '' && v !== String(t.nota)) guardarTarea(t.id, v)
                                  }}
                                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                  className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary transition-colors disabled:opacity-40"
                                />
                              </td>
                              <td className="text-center">
                                {saving === t.id
                                  ? <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                                  : t.nota === null
                                  ? <span className="badge badge-yellow">Pendiente</span>
                                  : <span className="badge badge-green">✓ {t.nota}</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* EXÁMENES */}
                <div className="card">
                  <div className="card-title flex items-center gap-2">
                    📊 Exámenes por Área
                    {!todasListas && tareas.length > 0 && (
                      <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                        ℹ️ Puedes ingresar el examen aunque falten tareas — algunos estudiantes lo presentan antes
                      </span>
                    )}
                  </div>
                  {examenesVista.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                      Sin exámenes configurados para este libro
                    </div>
                  ) : (
                    <div className="tw">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Área</th>
                            <th>Examen</th>
                            <th className="w-28 text-center">Nota (0–100%)</th>
                            <th className="w-24 text-center">Equiv. 20 pts</th>
                            <th className="w-24 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {examenesVista.map((ex: any) => (
                            <tr key={ex.id}>
                              <td>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                                  {(ex.area as any)?.nombre ?? '—'}
                                </span>
                              </td>
                              <td className="font-semibold text-sm">{ex.nombre}</td>
                              <td className="text-center">
                                <input
                                  type="number" min={0} max={100} step={1}
                                  defaultValue={ex.nota_original ?? ''}
                                  disabled={saving === ex.id}
                                  onBlur={e => {
                                    const v = e.target.value.trim()
                                    if (v !== '' && v !== String(ex.nota_original)) guardarExamen(ex.id, v)
                                  }}
                                  onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                                  className="w-20 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary transition-colors disabled:opacity-40"
                                />
                              </td>
                              <td className="text-center text-sm font-bold text-gray-600">
                                {ex.puntos_obtenidos !== null && ex.puntos_obtenidos !== undefined
                                  ? <span className="text-green-600">{ex.puntos_obtenidos}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="text-center">
                                {saving === ex.id
                                  ? <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                                  : ex.nota_original === null
                                  ? <span className="badge badge-yellow">Pendiente</span>
                                  : <span className="badge badge-green">{ex.nota_original}%</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function EnlaceNotasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
        <div className="pc text-center py-12 text-gray-400">Cargando...</div>
      </div>
    }>
      <EnlaceNotasContent />
    </Suspense>
  )
}
