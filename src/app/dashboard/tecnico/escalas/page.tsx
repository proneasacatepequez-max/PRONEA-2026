'use client'
// src/app/dashboard/tecnico/escalas/page.tsx
// CORRECCIONES:
// 1. Selector de estudiante cuando se accede desde sidebar (sin ?id=)
// 2. Vista por área con subtotales: Tareas (30pts) + Examen (20pts) = 50pts por área
// 3. Resumen al final con todas las áreas y estado de promoción
// 4. Botón descargar PDF (llama a /api/escalas/pdf)
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function EscalasContent() {
  const sp     = useSearchParams()
  const router = useRouter()
  const inscId = sp.get('id') ?? ''

  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [buscador,      setBuscador]      = useState('')
  const [data,          setData]          = useState<any>(null)
  const [loading,       setLoading]       = useState(false)
  const [msg,           setMsg]           = useState('')
  const [generando,     setGenerando]     = useState<string | null>(null)
  const [descargando,   setDescargando]   = useState<string | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  // Si no hay inscId, carga lista de estudiantes para elegir
  useEffect(() => {
    if (!inscId) {
      fetch('/api/inscripciones?ciclo=2026&estado=en_curso')
        .then(r => r.json())
        .then(d => setInscripciones(d.data ?? []))
        .catch(() => {})
    }
  }, [inscId])

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const res = await fetch(`/api/escalas?inscripcion_id=${inscId}`)
    const d   = await res.json()
    if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); setLoading(false); return }
    setData(d)
    setLoading(false)
  }, [inscId])

  useEffect(() => { cargar() }, [cargar])

  const generarEscala = async (libroId: string) => {
    setGenerando(libroId)
    const res = await fetch('/api/escalas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inscripcion_id: inscId, libro_id: libroId }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else {
      flash(d.ya_existia ? `ℹ️ Escala registrada: ${d.numero_escala}` : `✅ Escala creada: ${d.numero_escala}`)
      cargar()
    }
    setGenerando(null)
  }

  const descargarPDF = async (libroId: string, libroNombre: string) => {
    setDescargando(libroId)
    const res = await fetch(`/api/escalas/pdf?inscripcion_id=${inscId}&libro_id=${libroId}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      flash('❌ ' + (d.error ?? 'Error al generar PDF'))
      setDescargando(null)
      return
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const est  = data?.inscripcion?.estudiante as any
    a.href     = url
    a.download = `Escala-${est?.primer_apellido ?? 'estudiante'}-${libroNombre.replace(/\s+/g, '-')}.pdf`
    a.click()
    URL.revokeObjectURL(url)
    setDescargando(null)
  }

  const colorPts = (pts: number | null, max: number) => {
    if (pts === null) return 'text-gray-300'
    const pct = pts / max * 100
    if (pct >= 60) return 'text-green-600'
    if (pct >= 40) return 'text-yellow-600'
    return 'text-red-500'
  }

  // ── PANTALLA SELECTOR (sin ?id=) ──
  if (!inscId) {
    const filtrados = inscripciones.filter(i => {
      const e = i.estudiante as any
      const txt = `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante}`.toLowerCase()
      return !buscador || txt.includes(buscador.toLowerCase())
    })

    return (
      <div className="ap">
        <header className="topbar">
          <div className="page-title">📊 Escalas Numéricas</div>
        </header>
        <div className="pc max-w-2xl">
          <div className="card">
            <div className="card-title">Selecciona un estudiante</div>
            <input
              className="inp mb-4"
              placeholder="🔍 Buscar por nombre o código..."
              value={buscador}
              onChange={e => setBuscador(e.target.value)}
            />
            {filtrados.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {buscador ? 'Sin resultados' : 'Sin estudiantes inscritos'}
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filtrados.map((i: any) => {
                  const e = i.estudiante as any
                  return (
                    <button
                      key={i.id}
                      onClick={() => router.push(`/dashboard/tecnico/escalas?id=${i.id}`)}
                      className="w-full text-left px-4 py-3 rounded-xl border hover:border-pronea hover:bg-blue-50 transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-sm">{e?.primer_nombre} {e?.primer_apellido}</div>
                        <div className="text-xs text-gray-400">
                          {e?.codigo_estudiante} · {(i.etapa as any)?.nombre} · {(i.sede as any)?.nombre}
                        </div>
                      </div>
                      <span className="text-gray-400 text-lg">→</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── PANTALLA DE ESCALA ──
  const est  = data?.inscripcion?.estudiante as any
  const insc = data?.inscripcion as any

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas</div>
          {est && (
            <div className="text-xs text-gray-400">
              {est.primer_nombre} {est.primer_apellido} · {est.codigo_estudiante}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {msg && (
            <span className={`text-sm font-bold ${msg.startsWith('✅') || msg.startsWith('ℹ️') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </span>
          )}
          <button onClick={() => router.push('/dashboard/tecnico/escalas')} className="btn btn-g">
            ← Cambiar estudiante
          </button>
        </div>
      </header>

      <div className="pc max-w-4xl">
        {/* Info estudiante */}
        {insc && (
          <div className="card mb-5 border-l-4 border-l-pronea">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                ['Estudiante',     `${est?.primer_nombre} ${est?.primer_apellido}`],
                ['Código',         est?.codigo_estudiante],
                ['Etapa',          (insc.etapa as any)?.nombre],
                ['Sede',           (insc.sede as any)?.nombre],
                ['Versión libro',  insc.version_libro === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'],
                ['CUI',            est?.cui || 'Pendiente'],
                ['Técnico',        `${(insc.tecnico as any)?.primer_nombre} ${(insc.tecnico as any)?.primer_apellido}`],
                ['Ciclo',          insc.ciclo_escolar],
              ].map(([label, value]) => (
                <div key={label}>
                  <div className="lbl">{label}</div>
                  <div className="font-semibold text-gray-800">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── LIBROS ── */}
            {(data?.libros ?? []).map((libro: any) => (
              <div key={libro.id} className="card mb-6">
                {/* Encabezado libro */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="card-title mb-0">
                      {libro.version === 'nuevo' ? '📗' : '📙'} {libro.nombre}
                      <span className="text-xs text-gray-400 font-normal ml-2">Libro {libro.numero}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {libro.tareas_ingresadas}/{libro.tareas_total} tareas ingresadas
                      {libro.escala && (
                        <span className="ml-2 text-green-600 font-bold">· {libro.escala.numero_escala}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn btn-g btn-sm"
                      onClick={() => generarEscala(libro.id)}
                      disabled={!!generando}
                    >
                      {generando === libro.id
                        ? <span className="w-3 h-3 border border-gray-500 border-t-transparent rounded-full animate-spin inline-block" />
                        : libro.escala ? '🔄 Regenerar' : '📋 Crear escala'}
                    </button>
                    {libro.escala && (
                      <button
                        className="btn btn-p btn-sm"
                        onClick={() => descargarPDF(libro.id, libro.nombre)}
                        disabled={!!descargando}
                      >
                        {descargando === libro.id
                          ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                          : '⬇️ Descargar PDF'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── TABLA POR ÁREA ── */}
                {(libro.areas ?? []).map((ar: any) => (
                  <div key={(ar.area as any)?.id} className="mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-100" />
                      <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider px-2">
                        📌 {(ar.area as any)?.nombre ?? 'Sin área'}
                      </span>
                      <div className="h-px flex-1 bg-gray-100" />
                    </div>

                    {/* Tareas del área */}
                    <div className="tw mb-2">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th className="w-10">#</th>
                            <th className="w-20">Páginas</th>
                            <th>Descripción</th>
                            <th className="w-16 text-center">Máx.</th>
                            <th className="w-16 text-center">Nota</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ar.tareas ?? []).map((t: any) => (
                            <tr key={t.id} className={t.nota === null ? 'bg-yellow-50/60' : ''}>
                              <td className="text-gray-400 text-xs font-mono">{t.numero_tarea}</td>
                              <td className="text-xs text-gray-500 font-mono">{t.paginas ?? '—'}</td>
                              <td className="text-sm">{t.nombre}</td>
                              <td className="text-center text-xs text-gray-400">{t.puntos_max ?? 5}</td>
                              <td className="text-center font-bold">
                                {t.nota !== null
                                  ? <span className={t.nota >= 3 ? 'text-green-600' : t.nota >= 2 ? 'text-yellow-600' : 'text-red-500'}>{t.nota}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Subtotales del área */}
                    <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-xl p-3">
                      <div className="text-center">
                        <div className={`text-lg font-extrabold ${colorPts(ar.pts_tareas, 30)}`}>
                          {ar.pts_tareas ?? '—'}
                        </div>
                        <div className="text-xs text-gray-400">Tareas / 30 pts</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-lg font-extrabold ${colorPts(ar.pts_examen, 20)}`}>
                          {ar.pts_examen !== null ? ar.pts_examen : '—'}
                        </div>
                        <div className="text-xs text-gray-400">Examen / 20 pts</div>
                        {(ar.examenes ?? []).length > 0 && (ar.examenes[0]?.nota_original !== null) && (
                          <div className="text-xs text-gray-300">({ar.examenes[0].nota_original}%)</div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className={`text-xl font-extrabold ${colorPts(ar.total_area, 50)}`}>
                          {ar.total_area !== null ? ar.total_area : '—'}
                        </div>
                        <div className="text-xs text-gray-400">Total / 50 pts</div>
                        {ar.promovido_area !== null && (
                          <div className={`text-xs font-bold mt-0.5 ${ar.promovido_area ? 'text-green-600' : 'text-red-500'}`}>
                            {ar.promovido_area ? '✅ Promovido' : '❌ No promovido'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {/* Total del libro */}
                <div className={`rounded-xl p-4 mt-2 ${libro.promovido_libro ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-gray-700">TOTAL {libro.nombre.toUpperCase()}</div>
                    <div className={`text-2xl font-extrabold ${colorPts(libro.total_libro, 100)}`}>
                      {libro.total_libro ?? '—'} <span className="text-sm font-normal text-gray-400">/ 100 pts</span>
                    </div>
                    <div className={`text-sm font-bold ${libro.promovido_libro ? 'text-green-600' : 'text-gray-400'}`}>
                      {libro.promovido_libro === true
                        ? '✅ Todas las áreas ≥ 60 pts'
                        : libro.promovido_libro === false
                        ? '❌ Hay áreas por debajo de 60 pts'
                        : '— Pendiente de notas'}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* ── RESUMEN FINAL DE ETAPA ── */}
            {data?.libros?.length >= 2 && (
              <div className={`card border-2 ${data.promovido_etapa ? 'border-green-400' : 'border-gray-200'}`}>
                <div className="card-title">📋 Resumen Final de la Etapa</div>

                {/* Tabla resumen por área */}
                <div className="tw mb-4">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th className="text-center">Libro 1 Tareas</th>
                        <th className="text-center">Examen Libro 1</th>
                        <th className="text-center font-bold">Total L1</th>
                        <th className="text-center">Libro 2 Tareas</th>
                        <th className="text-center">Examen Libro 2</th>
                        <th className="text-center font-bold">Total L2</th>
                        <th className="text-center font-extrabold">Grand Total</th>
                        <th className="text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const l1 = data.libros[0]
                        const l2 = data.libros[1]
                        // Unir áreas por código
                        const allAreas: string[] = []
                        const areaInfoMap: Record<string, any> = {}
                        for (const l of [l1, l2]) {
                          for (const ar of (l?.areas ?? [])) {
                            const cod = (ar.area as any)?.codigo ?? (ar.area as any)?.id
                            if (!allAreas.includes(cod)) allAreas.push(cod)
                            areaInfoMap[cod] = ar.area
                          }
                        }
                        return allAreas.map(cod => {
                          const ar1 = l1?.areas?.find((a: any) => ((a.area as any)?.codigo ?? (a.area as any)?.id) === cod)
                          const ar2 = l2?.areas?.find((a: any) => ((a.area as any)?.codigo ?? (a.area as any)?.id) === cod)
                          const t1  = ar1?.total_area ?? null
                          const t2  = ar2?.total_area ?? null
                          const grand = t1 !== null && t2 !== null ? Math.round((t1 + t2) * 100) / 100 : null
                          const promo = grand !== null ? grand >= 60 : null
                          return (
                            <tr key={cod}>
                              <td className="font-semibold text-sm">{(areaInfoMap[cod] as any)?.nombre ?? cod}</td>
                              <td className="text-center text-xs">{ar1?.pts_tareas ?? '—'}</td>
                              <td className="text-center text-xs">{ar1?.pts_examen ?? '—'}</td>
                              <td className={`text-center font-bold ${colorPts(t1, 50)}`}>{t1 ?? '—'}</td>
                              <td className="text-center text-xs">{ar2?.pts_tareas ?? '—'}</td>
                              <td className="text-center text-xs">{ar2?.pts_examen ?? '—'}</td>
                              <td className={`text-center font-bold ${colorPts(t2, 50)}`}>{t2 ?? '—'}</td>
                              <td className={`text-center text-lg font-extrabold ${colorPts(grand, 100)}`}>{grand ?? '—'}</td>
                              <td className="text-center">
                                {promo === null
                                  ? <span className="badge badge-gray">Pendiente</span>
                                  : promo
                                  ? <span className="badge badge-green">✅ Promovido</span>
                                  : <span className="badge badge-red">❌ No promovido</span>}
                              </td>
                            </tr>
                          )
                        })
                      })()}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td className="font-extrabold">TOTAL GENERAL</td>
                        <td colSpan={2} />
                        <td className="text-center font-extrabold">{data.libros[0]?.total_libro ?? '—'}</td>
                        <td colSpan={2} />
                        <td className="text-center font-extrabold">{data.libros[1]?.total_libro ?? '—'}</td>
                        <td className={`text-center text-xl font-extrabold ${colorPts(data.total_etapa, 200)}`}>
                          {data.total_etapa ?? '—'}
                        </td>
                        <td className="text-center">
                          {data.promovido_etapa === true
                            ? <span className="badge badge-green">✅ PROMOVIDO</span>
                            : data.promovido_etapa === false
                            ? <span className="badge badge-red">❌ NO PROMOVIDO</span>
                            : <span className="badge badge-gray">Pendiente</span>}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className={`text-center py-3 rounded-xl font-extrabold text-lg ${
                  data.promovido_etapa ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {data.promovido_etapa
                    ? `✅ ${est?.primer_nombre} ${est?.primer_apellido} está PROMOVIDO/A — todas las áreas ≥ 60 pts`
                    : data.promovido_etapa === false
                    ? `❌ ${est?.primer_nombre} ${est?.primer_apellido} NO está promovido/a`
                    : '⏳ Faltan notas para determinar la promoción'}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function EscalasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📊 Escalas Numéricas</div></header>
        <div className="pc text-center py-12 text-gray-400">Cargando...</div>
      </div>
    }>
      <EscalasContent />
    </Suspense>
  )
}
