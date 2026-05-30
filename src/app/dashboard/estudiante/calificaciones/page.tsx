'use client'
// src/app/dashboard/estudiante/calificaciones/page.tsx
// CORRECCIÓN: Vista por área con fórmula correcta (30 tareas + 20 examen = 50 por área)
import { useState, useEffect } from 'react'

export default function CalificacionesPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-progreso').then(r => r.json())
      .then(setData).finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Mis Calificaciones</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  const est     = data?.estudiante
  const insc    = data?.inscripcion
  const resumen = data?.resumen_etapa
  const libros  = data?.libros ?? []

  const colorPts = (pts: number | null, max: number) => {
    if (pts === null) return 'text-gray-300'
    const pct = pts / max * 100
    if (pct >= 60) return 'text-green-600'
    if (pct >= 40) return 'text-yellow-600'
    return 'text-red-500'
  }

  if (!insc) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Mis Calificaciones</div></header>
      <div className="pc">
        <div className="card text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">📋</div>
          <div className="font-semibold text-gray-600">Sin inscripción activa</div>
          <div className="text-sm mt-1">Tu técnico debe inscribirte para el ciclo escolar</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Mis Calificaciones</div>
          <div className="text-xs text-gray-400">
            {(insc.etapa as any)?.nombre} · {(insc.sede as any)?.nombre} · Ciclo {insc.ciclo_escolar}
          </div>
        </div>
      </header>

      <div className="pc max-w-4xl">

        {/* ── RESUMEN GENERAL DE ETAPA ── */}
        {resumen && (
          <div className={`card mb-5 border-2 ${resumen.promovido ? 'border-green-400' : resumen.promovido === false ? 'border-red-400' : 'border-yellow-300'}`}>
            <div className="card-title">🎓 Mi Resultado Final de la Etapa</div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className={`text-4xl font-extrabold ${colorPts(resumen.nota_final_etapa, 100)}`}>
                  {resumen.nota_final_etapa?.toFixed(1) ?? '—'}
                </div>
                <div className="text-xs text-gray-500 mt-1">Puntos totales</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-700">{resumen.calificacion_cualitativa ?? '—'}</div>
                <div className="text-xs text-gray-500 mt-1">Calificación</div>
              </div>
              <div>
                <div className={`text-xl font-extrabold ${resumen.promovido ? 'text-green-600' : resumen.promovido === false ? 'text-red-600' : 'text-yellow-600'}`}>
                  {resumen.promovido === true  ? '✅ PROMOVIDO'     : ''}
                  {resumen.promovido === false ? '❌ NO PROMOVIDO'  : ''}
                  {resumen.promovido === null  ? '⏳ EN PROGRESO'   : ''}
                </div>
                <div className="text-xs text-gray-500 mt-1">Estado</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 text-center mt-3 bg-gray-50 rounded-lg py-2">
              Se necesitan ≥ 30 puntos en cada área de cada libro para ser promovido
            </div>
          </div>
        )}

        {/* ── POR LIBRO ── */}
        {libros.map((libro: any) => (
          <div key={libro.id} className="card mb-5">
            {/* Encabezado libro */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="card-title mb-0">
                  {libro.version === 'nuevo' ? '📗' : '📙'} {libro.nombre}
                  <span className="text-xs text-gray-400 font-normal ml-2">Libro {libro.numero}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {libro.tareas_ingresadas}/{libro.tareas_total} tareas registradas
                </div>
              </div>
              {/* Mini badge total del libro */}
              <div className="text-center">
                <div className={`text-2xl font-extrabold ${colorPts(libro.total_libro, (libro.areas?.length ?? 1) * 50)}`}>
                  {libro.total_libro ?? '—'}
                </div>
                <div className="text-xs text-gray-400">puntos del libro</div>
              </div>
            </div>

            {/* Barra de progreso de tareas */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Progreso de tareas</span>
                <span>{libro.tareas_ingresadas}/{libro.tareas_total}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${libro.tareas_total > 0 ? (libro.tareas_ingresadas / libro.tareas_total * 100) : 0}%` }}
                />
              </div>
            </div>

            {/* ── TABLA POR ÁREA ── */}
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th className="text-center w-28">Tareas<br /><span className="font-normal text-xs text-gray-400">/ 30 pts</span></th>
                    <th className="text-center w-28">Examen<br /><span className="font-normal text-xs text-gray-400">/ 20 pts</span></th>
                    <th className="text-center w-28">Total Área<br /><span className="font-normal text-xs text-gray-400">/ 50 pts</span></th>
                    <th className="text-center w-24">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(libro.areas ?? []).map((area: any) => (
                    <tr key={area.area_id}>
                      <td>
                        <div className="font-semibold text-sm">{area.area_nombre}</div>
                        <div className="text-xs text-gray-400">
                          {area.ingresadas}/{area.tareas_total} tareas
                          {area.nota_examen_original !== null && ` · Examen: ${area.nota_examen_original}%`}
                        </div>
                      </td>
                      <td className="text-center">
                        <span className={`text-lg font-extrabold ${colorPts(area.pts_tareas, 30)}`}>
                          {area.pts_tareas ?? '—'}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`text-lg font-extrabold ${colorPts(area.pts_examen, 20)}`}>
                          {area.pts_examen !== null ? area.pts_examen : <span className="text-gray-300 text-sm">Pendiente</span>}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className={`text-xl font-extrabold ${colorPts(area.total_area, 50)}`}>
                          {area.total_area !== null ? area.total_area : <span className="text-gray-300 text-sm">—</span>}
                        </span>
                      </td>
                      <td className="text-center">
                        {area.promovido === true  && <span className="badge badge-green text-xs">✅ OK</span>}
                        {area.promovido === false && <span className="badge badge-red text-xs">❌</span>}
                        {area.promovido === null  && <span className="badge badge-yellow text-xs">⏳</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-extrabold">
                    <td>TOTAL {libro.nombre.toUpperCase()}</td>
                    <td className="text-center text-blue-600">
                      {(libro.areas ?? []).reduce((a: number, ar: any) => a + (ar.pts_tareas ?? 0), 0).toFixed(1)}
                    </td>
                    <td className="text-center text-purple-600">
                      {(libro.areas ?? []).every((ar: any) => ar.pts_examen !== null)
                        ? (libro.areas ?? []).reduce((a: number, ar: any) => a + (ar.pts_examen ?? 0), 0).toFixed(1)
                        : '—'}
                    </td>
                    <td className={`text-center text-xl ${colorPts(libro.total_libro, (libro.areas?.length ?? 1) * 50)}`}>
                      {libro.total_libro ?? '—'}
                    </td>
                    <td className="text-center">
                      {libro.promovido_libro === true  && <span className="badge badge-green">✅ Promovido</span>}
                      {libro.promovido_libro === false && <span className="badge badge-red">❌</span>}
                      {libro.promovido_libro === null  && <span className="badge badge-yellow">⏳</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ))}

        {/* ── RESUMEN COMPARATIVO LIBROS ── */}
        {libros.length === 2 && (
          <div className="card border-t-4 border-t-pronea">
            <div className="card-title">📊 Comparativo Final — Todas las Áreas</div>
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Área</th>
                    <th className="text-center">Libro 1<br /><span className="font-normal text-xs">/ 50 pts</span></th>
                    <th className="text-center">Libro 2<br /><span className="font-normal text-xs">/ 50 pts</span></th>
                    <th className="text-center font-extrabold">Total<br /><span className="font-normal text-xs">/ 100 pts</span></th>
                    <th className="text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const l1 = libros[0]; const l2 = libros[1]
                    const todosAreaIds = [...new Set([
                      ...(l1.areas ?? []).map((a: any) => a.area_id),
                      ...(l2.areas ?? []).map((a: any) => a.area_id),
                    ])]
                    return todosAreaIds.map(aId => {
                      const a1 = (l1.areas ?? []).find((a: any) => a.area_id === aId)
                      const a2 = (l2.areas ?? []).find((a: any) => a.area_id === aId)
                      const t1 = a1?.total_area ?? null
                      const t2 = a2?.total_area ?? null
                      const total = t1 !== null && t2 !== null ? Math.round((t1 + t2) * 100) / 100 : null
                      const promo = total !== null ? total >= 60 : null
                      return (
                        <tr key={aId}>
                          <td className="font-semibold text-sm">{a1?.area_nombre ?? a2?.area_nombre}</td>
                          <td className={`text-center font-bold ${colorPts(t1, 50)}`}>{t1 ?? '—'}</td>
                          <td className={`text-center font-bold ${colorPts(t2, 50)}`}>{t2 ?? '—'}</td>
                          <td className={`text-center text-xl font-extrabold ${colorPts(total, 100)}`}>{total ?? '—'}</td>
                          <td className="text-center">
                            {promo === true  && <span className="badge badge-green text-xs">✅ ≥ 60</span>}
                            {promo === false && <span className="badge badge-red text-xs">❌ &lt; 60</span>}
                            {promo === null  && <span className="badge badge-yellow text-xs">⏳</span>}
                          </td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-extrabold">
                    <td>TOTAL ETAPA</td>
                    <td className={`text-center ${colorPts(libros[0]?.total_libro, 100)}`}>{libros[0]?.total_libro ?? '—'}</td>
                    <td className={`text-center ${colorPts(libros[1]?.total_libro, 100)}`}>{libros[1]?.total_libro ?? '—'}</td>
                    <td className={`text-center text-2xl ${colorPts(resumen?.nota_final_etapa, 200)}`}>
                      {resumen?.nota_final_etapa ?? '—'}
                    </td>
                    <td className="text-center">
                      {resumen?.promovido === true  && <span className="badge badge-green">✅ PROMOVIDO</span>}
                      {resumen?.promovido === false && <span className="badge badge-red">❌ NO PROMOVIDO</span>}
                      {!resumen             && <span className="badge badge-yellow">⏳ Pendiente</span>}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Nota aclaratoria */}
        <div className="alert al-i text-xs mt-4">
          <div>
            <b>ℹ️ ¿Cómo se calcula tu nota?</b> Cada área vale 50 puntos por libro:
            30 pts por tareas y 20 pts por el examen de esa área.
            Con 2 libros son 100 pts por área en total.
            Necesitas ≥ 60 pts en cada área para ser promovido.
          </div>
        </div>
      </div>
    </div>
  )
}
