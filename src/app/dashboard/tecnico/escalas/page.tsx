'use client'
// src/app/dashboard/tecnico/escalas/page.tsx
// FLUJO: Etapa → Libro → Estudiante → Tabla de tareas con campo de nota
import { useState, useEffect, useCallback, Suspense } from 'react'

function EscalasContent() {
  // Catálogo
  const [etapas,     setEtapas]     = useState<any[]>([])
  const [etapaSel,   setEtapaSel]   = useState<any>(null)
  const [libros,     setLibros]     = useState<any[]>([])
  const [libroSel,   setLibroSel]   = useState<any>(null)
  const [tareas,     setTareas]     = useState<any[]>([])
  const [examenes,   setExamenes]   = useState<any[]>([])
  const [areas,      setAreas]      = useState<any[]>([])
  const [areaSel,    setAreaSel]    = useState('')
  const [buscarPagina, setBuscarPagina] = useState('')
  const [ordenPagina,  setOrdenPagina]  = useState(false)
  const [loadLib,    setLoadLib]    = useState(false)
  const [loadTareas, setLoadTareas] = useState(false)
  const [loading,    setLoading]    = useState(true)

  // Estudiantes
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loadInsc,      setLoadInsc]      = useState(false)
  const [buscarEst,     setBuscarEst]     = useState('')
  const [inscSel,       setInscSel]       = useState<any>(null)

  // Notas
  const [notasMap, setNotasMap] = useState<Record<string, number | null>>({})
  const [saving,   setSaving]   = useState<string | null>(null)
  const [msg,      setMsg]      = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

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

  // Etapa → libros + inscripciones
  const seleccionarEtapa = async (etapa: any) => {
    setEtapaSel(etapa)
    setLibroSel(null); setLibros([])
    setTareas([]); setExamenes([])
    setInscSel(null); setInscripciones([])
    setNotasMap({}); setAreaSel('')
    if (!etapa) return
    setLoadLib(true)
    setLoadInsc(true)
    const [lb, insRes] = await Promise.all([
      fetch(`/api/libros?etapa_id=${etapa.id}`).then(r => r.json()).catch(() => []),
      fetch(`/api/inscripciones?etapa_id=${etapa.id}&estado=en_curso&ciclo=2026`)
        .then(async r => ({ ok: r.ok, body: await r.json().catch(() => ({})) }))
        .catch(() => ({ ok: false, body: { error: 'Error de conexión' } })),
    ])
    setLibros(Array.isArray(lb) ? lb : [])
    if (!insRes.ok) {
      flash('❌ ' + (insRes.body?.error ?? 'Error al cargar estudiantes'))
      setInscripciones([])
    } else {
      setInscripciones(insRes.body?.data ?? [])
    }
    setLoadLib(false)
    setLoadInsc(false)
  }

  // Libro → tareas
  const seleccionarLibro = useCallback(async (libro: any) => {
    setLibroSel(libro)
    setTareas([]); setExamenes([])
    setNotasMap({}); setAreaSel('')
    if (!libro) return
    setLoadTareas(true)
    const res  = await fetch(`/api/tareas-catalogo?libro_id=${libro.id}&tipo=ambos`).catch(() => null)
    const body = await res?.json().catch(() => ({})) ?? {}
    if (!res || !res.ok) {
      flash('❌ ' + (body?.error ?? 'Error al cargar catálogo de tareas'))
      setTareas([]); setExamenes([])
    } else {
      setTareas(body.tareas   ?? [])
      setExamenes(body.examenes ?? [])
    }
    setLoadTareas(false)
  }, [])

  // Cuando cambia el libro y hay estudiante → recargar notas
  useEffect(() => {
    if (!libroSel || !inscSel) return
    cargarNotas(inscSel, libroSel)
  }, [libroSel])

  // Estudiante → cargar notas
  const seleccionarEstudiante = async (insc: any) => {
    setInscSel(insc)
    setNotasMap({})
    if (!libroSel) return
    await cargarNotas(insc, libroSel)
  }

  const cargarNotas = async (insc: any, libro: any) => {
    const [nt, ne] = await Promise.all([
      fetch(`/api/notas?inscripcion_id=${insc.id}&libro_id=${libro.id}&tipo=tareas`)
        .then(r => r.json()).catch(() => ({ tareas: [] })),
      fetch(`/api/notas?inscripcion_id=${insc.id}&libro_id=${libro.id}&tipo=examenes`)
        .then(r => r.json()).catch(() => ({ examenes: [] })),
    ])
    const mapa: Record<string, number | null> = {}
    for (const n of (nt.tareas   ?? [])) mapa[`t-${n.tarea_id}`]  = n.nota
    for (const n of (ne.examenes ?? [])) mapa[`e-${n.examen_id}`] = n.nota_original
    setNotasMap(mapa)
  }

  // Guardar nota
  const guardarNota = async (tipo: 'tarea' | 'examen', itemId: string, nota: number | null) => {
    if (nota === null || nota === undefined) return
    if (!inscSel?.id) { flash('❌ Selecciona un estudiante primero'); return }
    if (tipo === 'tarea'  && (nota < 0 || nota > 5))   { flash('❌ Nota de tarea: 0 a 5');   return }
    if (tipo === 'examen' && (nota < 0 || nota > 100)) { flash('❌ Nota de examen: 0 a 100'); return }

    const key = tipo === 'tarea' ? `t-${itemId}` : `e-${itemId}`
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
      flash('❌ ' + (d.error ?? 'Error'))
    }
    setSaving(null)
  }

  // Helpers
  const esBach      = etapaSel?.codigo?.startsWith('BA') ?? false
  const campoProy   = esBach ? 'proyecto' : 'leccion'
  const labelProy   = esBach ? 'Proyecto' : 'Lección'
  const versiones   = [...new Set(libros.map((l: any) => l.version))]
  const librosPorVer= (v: string) =>
    libros.filter((l: any) => l.version === v).sort((a: any, b: any) => a.numero - b.numero)

  const areasConTareas = areas.filter(a =>
    tareas.some((t: any) => String(t.area?.id) === String(a.id)) ||
    examenes.some((e: any) => String(e.area?.id) === String(a.id))
  )

  const tareasVista   = (areaSel
    ? tareas.filter((t: any)   => String(t.area?.id) === areaSel)
    : tareas)
    .filter((t: any) => !buscarPagina.trim() || String(t.paginas ?? '').includes(buscarPagina.trim()))
    .sort((a: any, b: any) => {
      if (ordenPagina) {
        const pA = parseInt(String(a.paginas ?? '').match(/\d+/)?.[0] ?? '999999')
        const pB = parseInt(String(b.paginas ?? '').match(/\d+/)?.[0] ?? '999999')
        if (pA !== pB) return pA - pB
      }
      const aA = a.area?.nombre ?? ''; const aB = b.area?.nombre ?? ''
      return aA !== aB ? aA.localeCompare(aB) : a.numero_tarea - b.numero_tarea
    })
  const examenesVista = areaSel
    ? examenes.filter((e: any) => String(e.area?.id) === areaSel)
    : examenes

  const inscFiltradas = inscripciones.filter(i => {
    if (!buscarEst.trim()) return true
    const est = i.estudiante as any
    return `${est?.primer_nombre} ${est?.primer_apellido} ${est?.segundo_apellido} ${est?.codigo_estudiante} ${est?.cui}`
      .toLowerCase().includes(buscarEst.toLowerCase())
  })

  // Stats del estudiante
  const tareasConNota  = tareas.filter((t: any) => notasMap[`t-${t.id}`] != null).length
  const puntosObtenidos= tareas.reduce((s: number, t: any) => s + (Number(notasMap[`t-${t.id}`] ?? 0)), 0)
  const puntosMaximos  = tareas.reduce((s: number, t: any) => s + (t.puntos_max ?? 5), 0)
  const zona           = tareasConNota > 0 && puntosMaximos > 0
    ? Math.round((puntosObtenidos / puntosMaximos) * 30 * 100) / 100 : null

  const colorNota = (nota: number | null, max: number) => {
    if (nota == null) return ''
    if (nota >= max)        return 'border-green-400 bg-green-50 text-green-700'
    if (nota >= max * 0.6)  return 'border-blue-300 bg-blue-50 text-blue-700'
    if (nota > 0)           return 'border-yellow-300 bg-yellow-50 text-yellow-700'
    return 'border-red-300 bg-red-50 text-red-600'
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas — Registro de Notas</div>
          <div className="text-xs text-gray-400">
            Etapa → Libro → Estudiante → Ingresa notas en la tabla
            <span className="text-gray-300"> · Ideal para calificar varios estudiantes de la misma etapa/libro seguidos</span>
          </div>
        </div>
        {msg && (
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            msg.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>{msg}</span>
        )}
      </header>

      <div className="pc">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

          {/* ── PANEL IZQUIERDO ─────────────────────── */}
          <div className="lg:col-span-3 space-y-3">

            {/* 1. Etapa */}
            <div className="card">
              <div className="card-title text-xs mb-2 text-blue-600 uppercase tracking-wide">
                1️⃣ Etapa
              </div>
              {loading ? (
                <div className="flex justify-center py-3">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="space-y-1">
                  {etapas.map((et: any) => (
                    <button key={et.id} onClick={() => seleccionarEtapa(et)}
                      className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                        etapaSel?.id === et.id
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 text-gray-600'
                      }`}>
                      {et.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Libro */}
            {etapaSel && (
              <div className="card">
                <div className="card-title text-xs mb-2 text-blue-600 uppercase tracking-wide">
                  2️⃣ Libro
                </div>
                {loadLib ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : libros.length === 0 ? (
                  <p className="text-xs text-orange-500 text-center py-2">⚠️ Sin libros</p>
                ) : versiones.map(ver => (
                  <div key={ver} className="mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                      {ver === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}
                    </p>
                    {librosPorVer(ver).map((l: any) => (
                      <button key={l.id} onClick={() => seleccionarLibro(l)}
                        className={`w-full text-left px-3 py-2 rounded-xl border-2 text-xs transition-all mb-1 ${
                          libroSel?.id === l.id
                            ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold'
                            : 'border-gray-100 hover:border-blue-200 text-gray-600'
                        }`}>
                        <span className="font-semibold">Libro {l.numero}</span>
                        <span className="text-gray-400 ml-1">— {l.nombre}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* 3. Estudiante */}
            {etapaSel && libroSel && (
              <div className="card">
                <div className="card-title text-xs mb-2 text-blue-600 uppercase tracking-wide">
                  3️⃣ Estudiante
                </div>
                <input className="inp text-xs mb-2"
                  placeholder="🔍 Nombre, código, CUI..."
                  value={buscarEst}
                  onChange={e => setBuscarEst(e.target.value)} />
                {loadInsc ? (
                  <div className="flex justify-center py-3">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : inscFiltradas.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-2">
                    {buscarEst ? 'Sin resultados' : 'Sin inscripciones activas'}
                  </p>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {inscFiltradas.map((i: any) => {
                      const est = i.estudiante as any
                      const sel = inscSel?.id === i.id
                      return (
                        <button key={i.id} onClick={() => seleccionarEstudiante(i)}
                          className={`w-full text-left px-3 py-2 rounded-xl border-2 transition-all ${
                            sel
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-100 hover:border-green-200 hover:bg-green-50/30'
                          }`}>
                          <div className={`text-xs font-bold truncate ${sel ? 'text-green-700' : 'text-gray-700'}`}>
                            {sel && '✓ '}{est?.primer_apellido} {est?.primer_nombre}
                          </div>
                          <div className="text-xs text-gray-400 font-mono truncate">
                            {est?.codigo_estudiante}
                            {est?.cui && <span className="ml-1 text-gray-300">· {est.cui}</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            🏫 {(i.sede as any)?.nombre ?? '—'}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Stats del estudiante */}
            {inscSel && tareas.length > 0 && (
              <div className="card bg-gradient-to-br from-blue-600 to-blue-700 text-white">
                <div className="text-xs font-bold uppercase tracking-wide opacity-80 mb-2">
                  Resumen actual
                </div>
                <div className="font-bold text-sm mb-3 truncate">
                  {(inscSel.estudiante as any)?.primer_apellido},{' '}
                  {(inscSel.estudiante as any)?.primer_nombre}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/20 rounded-xl p-2 text-center">
                    <div className="text-xl font-extrabold">{tareasConNota}/{tareas.length}</div>
                    <div className="text-xs opacity-80">Tareas</div>
                  </div>
                  <div className="bg-white/20 rounded-xl p-2 text-center">
                    <div className={`text-xl font-extrabold ${zona !== null && zona >= 18 ? 'text-green-300' : 'text-yellow-300'}`}>
                      {zona !== null ? `${zona}` : '—'}
                    </div>
                    <div className="text-xs opacity-80">Zona /30</div>
                  </div>
                </div>
                {zona !== null && (
                  <div className="mt-2 bg-white/10 rounded-lg p-1.5">
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${zona >= 18 ? 'bg-green-400' : zona >= 12 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${Math.min((zona/30)*100, 100)}%` }}
                      />
                    </div>
                    <div className="text-xs text-center mt-1 opacity-80">
                      {zona >= 18 ? '✅ Aprobado' : zona >= 12 ? '⚠️ En riesgo' : '❌ Por debajo'}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── PANEL DERECHO: TABLA DE TAREAS ─────── */}
          <div className="lg:col-span-9">
            {!etapaSel ? (
              <div className="card text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">📚</div>
                <div className="font-bold text-lg text-gray-500">Selecciona una etapa</div>
                <div className="text-sm mt-1">para ver el catálogo de tareas</div>
              </div>
            ) : !libroSel ? (
              <div className="card text-center py-20 text-gray-400">
                <div className="text-6xl mb-4">📖</div>
                <div className="font-bold text-lg text-gray-500">Selecciona un libro</div>
                <div className="text-sm mt-1">Libro 1 y Libro 2 tienen tareas distintas</div>
              </div>
            ) : loadTareas ? (
              <div className="card flex flex-col items-center justify-center py-20 text-gray-400">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
                <div className="text-sm">Cargando catálogo de tareas...</div>
              </div>
            ) : tareas.length === 0 && examenes.length === 0 ? (
              <div className="card text-center py-16 text-gray-400">
                <div className="text-5xl mb-3">📋</div>
                <div className="font-bold text-gray-600">Sin tareas en este libro</div>
              </div>
            ) : (
              <div className="card overflow-hidden p-0">

                {/* Cabecera de tabla */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-700 to-blue-800 text-white flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-extrabold">
                      {etapaSel.nombre} — Libro {libroSel.numero}
                      <span className="ml-2 text-xs font-normal text-blue-200">
                        ({libroSel.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'})
                      </span>
                    </div>
                    {inscSel ? (
                      <div className="text-xs text-green-300 font-semibold mt-0.5">
                        ✅ {(inscSel.estudiante as any)?.primer_apellido},{' '}
                        {(inscSel.estudiante as any)?.primer_nombre}
                        {' '}· {(inscSel.estudiante as any)?.codigo_estudiante}
                      </div>
                    ) : (
                      <div className="text-xs text-blue-200 mt-0.5">
                        ← Selecciona un estudiante para registrar notas
                      </div>
                    )}
                  </div>
                  {/* Filtros: área, página, orden */}
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {areasConTareas.length > 0 && (
                      <select
                        className="inp text-xs w-44 bg-white/10 border-white/20 text-white"
                        value={areaSel}
                        onChange={e => setAreaSel(e.target.value)}>
                        <option value="" className="text-black">Todas las áreas</option>
                        {areasConTareas.map((a: any) => (
                          <option key={a.id} value={a.id} className="text-black">{a.nombre}</option>
                        ))}
                      </select>
                    )}
                    <input
                      className="inp text-xs w-28 bg-white/10 border-white/20 text-white placeholder-white/50"
                      placeholder="Buscar página..."
                      value={buscarPagina}
                      onChange={e => setBuscarPagina(e.target.value)}
                    />
                    <button
                      className={`text-xs px-2 py-1.5 rounded-lg border ${ordenPagina ? 'bg-white/20 border-white/40' : 'bg-white/10 border-white/20'} text-white whitespace-nowrap`}
                      title="Ordenar por página, de menor a mayor"
                      onClick={() => setOrdenPagina(v => !v)}>
                      📄 {ordenPagina ? '✓ ' : ''}Ordenar por página
                    </button>
                  </div>
                </div>

                {/* Tabla */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ minWidth: 640 }}>
                    <thead>
                      <tr className="bg-gray-50 border-b-2 border-gray-200 text-gray-500 uppercase tracking-wide text-left">
                        <th className="px-3 py-2.5 text-center w-12">No.</th>
                        <th className="px-3 py-2.5">Descripción de la tarea</th>
                        <th className="px-3 py-2.5 w-20 hidden sm:table-cell">{labelProy}</th>
                        <th className="px-3 py-2.5 w-12 text-center">Pág.</th>
                        <th className="px-3 py-2.5 w-32 hidden md:table-cell">Área</th>
                        <th className="px-3 py-2.5 w-16 text-center">Pts<br/>máx</th>
                        <th className={`px-3 py-2.5 w-28 text-center ${inscSel ? 'text-blue-600 font-extrabold' : ''}`}>
                          {inscSel ? '✏️ Nota' : 'Nota'}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {tareasVista.map((t: any, idx: number) => {
                        const key      = `t-${t.id}`
                        const notaAct  = notasMap[key] ?? null
                        const isSav    = saving === key
                        const ptsMax   = t.puntos_max ?? 5
                        const hasNota  = notaAct !== null

                        return (
                          <tr key={t.id}
                            className={`border-b transition-colors ${
                              hasNota
                                ? 'bg-green-50/50'
                                : idx%2===0 ? 'bg-white' : 'bg-gray-50/30'
                            } hover:bg-blue-50/30`}>

                            {/* Número */}
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm">
                                {t.numero_tarea}
                              </span>
                            </td>

                            {/* Descripción */}
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-gray-800 leading-snug">{t.nombre}</div>
                            </td>

                            {/* Proyecto/Lección */}
                            <td className="px-3 py-2.5 text-gray-400 truncate max-w-[80px] hidden sm:table-cell">
                              {t[campoProy] ?? '—'}
                            </td>

                            {/* Página */}
                            <td className="px-3 py-2.5 text-center font-mono text-gray-400">
                              {t.paginas ?? '—'}
                            </td>

                            {/* Área */}
                            <td className="px-3 py-2.5 hidden md:table-cell">
                              <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-medium truncate max-w-[120px]">
                                {t.area?.nombre ?? '—'}
                              </span>
                            </td>

                            {/* Pts máx */}
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-extrabold text-blue-600 text-sm">{ptsMax}</span>
                            </td>

                            {/* Campo nota */}
                            <td className="px-3 py-2.5 text-center">
                              {inscSel ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0} max={ptsMax} step={0.5}
                                    defaultValue={notaAct ?? ''}
                                    key={`nota-${t.id}-${notaAct}`}
                                    onBlur={e => {
                                      const v = e.target.value === '' ? null : parseFloat(e.target.value)
                                      if (v !== notaAct) guardarNota('tarea', t.id, v)
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    }}
                                    disabled={isSav}
                                    placeholder="—"
                                    className={`w-16 text-center text-sm font-bold rounded-xl border-2 py-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 ${
                                      hasNota
                                        ? colorNota(notaAct, ptsMax)
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                                    }`}
                                  />
                                  <div className="w-5 flex-shrink-0 text-center">
                                    {isSav ? (
                                      <span className="inline-block w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                                    ) : hasNota ? (
                                      <span className="text-green-500 font-bold text-sm">✓</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-200 text-lg">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}

                      {/* Separador exámenes */}
                      {examenesVista.length > 0 && (
                        <tr className="bg-purple-100 border-y-2 border-purple-200">
                          <td colSpan={7} className="px-4 py-2 text-xs font-extrabold text-purple-800 uppercase tracking-wide">
                            📝 Exámenes de área — ingresar nota sobre 100
                            <span className="font-normal text-purple-500 ml-2">(se convierte automáticamente a puntos)</span>
                          </td>
                        </tr>
                      )}

                      {/* Exámenes */}
                      {examenesVista.map((ex: any, idx: number) => {
                        const key      = `e-${ex.id}`
                        const notaAct  = notasMap[key] ?? null
                        const isSav    = saving === key
                        const ptsConv  = notaAct != null
                          ? Math.round((notaAct / 100) * ex.puntos_max * 10) / 10 : null

                        return (
                          <tr key={ex.id}
                            className={`border-b transition-colors ${
                              notaAct != null
                                ? 'bg-purple-50/60'
                                : idx%2===0 ? 'bg-white' : 'bg-gray-50/30'
                            } hover:bg-purple-50/30`}>
                            <td className="px-3 py-2.5 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-extrabold text-xs">
                                EX
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-gray-800">{ex.nombre}</div>
                              {ptsConv !== null && (
                                <div className="text-xs text-purple-600 mt-0.5 font-semibold">
                                  = {ptsConv} / {ex.puntos_max} pts
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-gray-300 hidden sm:table-cell">—</td>
                            <td className="px-3 py-2.5 text-center text-gray-300">—</td>
                            <td className="px-3 py-2.5 hidden md:table-cell">
                              <span className="inline-block bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs font-medium">
                                {ex.area?.nombre ?? '—'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-extrabold text-purple-600 text-sm">/100</span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {inscSel ? (
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min={0} max={100} step={1}
                                    defaultValue={notaAct ?? ''}
                                    key={`exam-${ex.id}-${notaAct}`}
                                    onBlur={e => {
                                      const v = e.target.value === '' ? null : parseFloat(e.target.value)
                                      if (v !== notaAct) guardarNota('examen', ex.id, v)
                                    }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                    }}
                                    disabled={isSav}
                                    placeholder="—"
                                    className={`w-16 text-center text-sm font-bold rounded-xl border-2 py-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-purple-300 ${
                                      notaAct != null
                                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-purple-300'
                                    }`}
                                  />
                                  <div className="w-5 flex-shrink-0 text-center">
                                    {isSav ? (
                                      <span className="inline-block w-3 h-3 border border-purple-500 border-t-transparent rounded-full animate-spin" />
                                    ) : notaAct != null ? (
                                      <span className="text-purple-500 font-bold text-sm">✓</span>
                                    ) : null}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-200 text-lg">—</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pie de tabla */}
                <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs text-gray-400">
                    💡 Escribe la nota y presiona{' '}
                    <kbd className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">Enter</kbd>
                    {' '}o haz clic fuera para guardar · Verde = nota guardada
                  </div>
                  {inscSel && (
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="text-gray-500">
                        {tareasConNota}/{tareas.length} tareas completadas
                      </span>
                      <span className={`px-3 py-1 rounded-full ${
                        zona === null ? 'bg-gray-100 text-gray-400'
                        : zona >= 18 ? 'bg-green-100 text-green-700'
                        : zona >= 12 ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-600'
                      }`}>
                        Zona: {zona !== null ? `${zona}/30` : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TecnicoEscalasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📊 Escalas Numéricas</div></header>
        <div className="pc flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <EscalasContent />
    </Suspense>
  )
}


