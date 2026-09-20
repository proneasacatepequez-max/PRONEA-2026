// src/app/api/notas/calcular/route.ts
// CORRECCIONES:
// 1. Cálculo POR ÁREA: tareas → 30 pts, examen → 20 pts = 50 pts por área por libro
// 2. Promoción: todas las áreas de todos los libros >= 30 pts (60% de 50)
// 3. resumen_libro guarda la nota real sobre 100 (no sobre escala arbitraria)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// Convierte puntos de tareas (sobre su máximo) → escala de 30 pts
const ptsATareas = (obt: number, max: number) =>
  max > 0 ? Math.round((obt / max) * 30 * 100) / 100 : 0

// Convierte nota de examen (sobre 100%) → escala de 20 pts
const ptsAExamen = (nota: number) =>
  Math.round((nota / 100) * 20 * 100) / 100

function cualitativa(nota: number): string {
  if (nota >= 90) return 'Excelente'
  if (nota >= 75) return 'Muy Bueno'
  if (nota >= 60) return 'Satisfactorio'
  if (nota >= 50) return 'En Proceso'
  return 'Necesita Apoyo'
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { inscripcion_id, numero_libro } = await req.json()
  if (!inscripcion_id) return err('inscripcion_id requerido')

  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select('id, etapa_id, version_libro, tiene_ajuste_discapacidad')
    .eq('id', inscripcion_id).single()
  if (!insc) return err('Inscripción no encontrada', 404)

  const nums = numero_libro ? [parseInt(numero_libro)] : [1, 2]
  const resultados = []

  for (const num of nums) {
    const { data: librosCandidatos } = await supabaseAdmin.from('libros')
      .select('id, nombre, numero, version')
      .eq('etapa_id', insc.etapa_id)
      .eq('numero', num)
      .eq('version', insc.version_libro)
      .eq('activo', true)

    if (!librosCandidatos || librosCandidatos.length === 0) continue

    // BLINDAJE: si hay duplicados (mismo etapa+numero+version), usar el
    // que realmente tenga tareas en el catálogo
    let libro = librosCandidatos[0]
    if (librosCandidatos.length > 1) {
      const conteos = await Promise.all(librosCandidatos.map(async (l: any) => {
        const { count } = await supabaseAdmin.from('tareas_catalogo')
          .select('*', { count: 'exact', head: true }).eq('libro_id', l.id).eq('activo', true)
        return { libro: l, total: count ?? 0 }
      }))
      conteos.sort((a, b) => b.total - a.total)
      libro = conteos[0].libro
    }

    // Tareas con su área
    const { data: tareasCatalogo } = await supabaseAdmin.from('tareas_catalogo')
      .select('id, puntos_max, area_id')
      .eq('libro_id', libro.id).eq('activo', true)

    // Tareas omitidas por ajuste de discapacidad
    let omitidas: string[] = []
    if (insc.tiene_ajuste_discapacidad) {
      const { data: adj } = await supabaseAdmin.from('ajustes_discapacidad')
        .select('tareas_omitidas_ajuste(tarea_id)')
        .eq('inscripcion_id', inscripcion_id).eq('activo', true)
      adj?.forEach((a: any) => a.tareas_omitidas_ajuste?.forEach((t: any) => omitidas.push(t.tarea_id)))
    }

    const tareasActivas = (tareasCatalogo ?? []).filter((t: any) => !omitidas.includes(t.id))

    // Notas de tareas
    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id, nota')
      .eq('inscripcion_id', inscripcion_id)
      .in('tarea_id', tareasActivas.map((t: any) => t.id))
    const notaTareaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    // Exámenes con su área
    const { data: examenesCatalogo } = await supabaseAdmin.from('examenes_catalogo')
      .select('id, area_id')
      .eq('libro_id', libro.id).eq('activo', true)

    // Notas de exámenes
    const { data: notasExamenes } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id, nota_original, puntos_obtenidos')
      .eq('inscripcion_id', inscripcion_id)
      .in('examen_id', (examenesCatalogo ?? []).map((e: any) => e.id))
    const notaExMap = new Map((notasExamenes ?? []).map((n: any) => [n.examen_id, n]))

    // ── CÁLCULO POR ÁREA ──
    const areaIds = [...new Set([
      ...tareasActivas.map((t: any) => t.area_id),
      ...(examenesCatalogo ?? []).map((e: any) => e.area_id),
    ].filter(Boolean))]

    let totalLibro  = 0
    let todasAreasOk = true
    let hayNotasCompletas = true

    const resumenAreas = areaIds.map(areaId => {
      const tareasArea  = tareasActivas.filter((t: any) => t.area_id === areaId)
      const examenesArea = (examenesCatalogo ?? []).filter((e: any) => e.area_id === areaId)

      const puntosObt = tareasArea.reduce((acc: number, t: any) => acc + (notaTareaMap.get(t.id) ?? 0), 0)
      const puntosMax = tareasArea.reduce((acc: number, t: any) => acc + (t.puntos_max ?? 5), 0)

      const ptsTareas = ptsATareas(puntosObt, puntosMax)

      const examen = examenesArea[0] ?? null
      const notaEx = examen ? (notaExMap.get(examen.id)?.nota_original ?? null) : null
      const ptsExamen = notaEx !== null ? ptsAExamen(notaEx) : null

      const totalArea  = ptsExamen !== null ? Math.round((ptsTareas + ptsExamen) * 100) / 100 : null
      const promoArea  = totalArea !== null ? totalArea >= 30 : null   // 60% de 50

      if (totalArea === null) hayNotasCompletas = false
      if (promoArea === false) todasAreasOk = false

      totalLibro += totalArea ?? 0

      return { area_id: areaId, pts_tareas: ptsTareas, pts_examen: ptsExamen, total_area: totalArea, promovido_area: promoArea }
    })

    totalLibro = Math.round(totalLibro * 100) / 100
    const promovido = hayNotasCompletas && todasAreasOk

    // Guardar en resumen_libro
    // Usamos nota_final como porcentaje sobre 100 (totalLibro / (areas*50) * 100)
    const maxPosibleLibro = areaIds.length * 50
    const pctLibro = maxPosibleLibro > 0 ? Math.round((totalLibro / maxPosibleLibro) * 100 * 100) / 100 : 0

    // Totales globales del libro para resumen_libro
    const totalPuntosObt = tareasActivas.reduce((acc: number, t: any) => acc + (notaTareaMap.get(t.id) ?? 0), 0)
    const totalPuntosMax = tareasActivas.reduce((acc: number, t: any) => acc + (t.puntos_max ?? 5), 0)
    const tareasIngresadas = tareasActivas.filter((t: any) => notaTareaMap.has(t.id)).length

    const promExamen = (notasExamenes ?? []).length > 0
      ? (notasExamenes ?? []).reduce((acc: number, n: any) => acc + (n.nota_original ?? 0), 0) / (notasExamenes ?? []).length
      : 0

    await supabaseAdmin.from('resumen_libro').upsert({
      inscripcion_id,
      libro_id:             libro.id,
      tareas_completadas:   tareasIngresadas,
      tareas_total:         tareasActivas.length,
      puntos_tareas:        totalPuntosObt,
      puntos_tareas_max:    totalPuntosMax,
      zona:                 ptsATareas(totalPuntosObt, totalPuntosMax),
      promedio_examen:      promExamen,
      nota_examen_final:    ptsAExamen(promExamen),
      nota_final:           totalLibro,                     // puntos reales (ej: 48.5 de 50*areas)
      calificacion_cualitativa: cualitativa(pctLibro),
      promovido,
      tiene_ajuste: omitidas.length > 0,
      estado:       promovido ? 'listo_validar' : 'en_progreso',
      actualizado_en: new Date().toISOString(),
    }, { onConflict: 'inscripcion_id,libro_id' })

    resultados.push({
      libro_id:       libro.id,
      numero:         num,
      total_libro:    totalLibro,
      pct_libro:      pctLibro,
      promovido,
      notas_completas: hayNotasCompletas,
      areas:          resumenAreas,
    })
  }

  // Recalcular etapa (suma de ambos libros)
  const { data: rls } = await supabaseAdmin.from('resumen_libro')
    .select('nota_final, promovido, libro:libros(numero)')
    .eq('inscripcion_id', inscripcion_id)

  const r1 = (rls ?? []).find((r: any) => r.libro?.numero === 1)
  const r2 = (rls ?? []).find((r: any) => r.libro?.numero === 2)

  if (r1 || r2) {
    const totalEtapa = (r1?.nota_final ?? 0) + (r2?.nota_final ?? 0)
    const promoEtapa = (r1?.promovido ?? false) && (r2?.promovido ?? false)

    await supabaseAdmin.from('resumen_etapa').upsert({
      inscripcion_id,
      nota_libro_1:         r1?.nota_final ?? null,
      nota_libro_2:         r2?.nota_final ?? null,
      nota_final_etapa:     Math.round(totalEtapa * 100) / 100,
      calificacion_cualitativa: promoEtapa ? 'Promovido' : 'No Promovido',
      promovido:            promoEtapa,
      actualizado_en:       new Date().toISOString(),
    }, { onConflict: 'inscripcion_id' })
  }

  // ── AUTO-COMPLETADO DE LA INSCRIPCIÓN ──────────────────────────────────
  // Si ya se registraron TODAS las notas (tareas y exámenes) de TODOS los
  // libros de esta etapa/versión, marcamos automáticamente la inscripción
  // como 'completada' — sin importar si es la última etapa del programa o
  // no, porque el ciclo escolar todavía está en curso.
  //
  // El paso a 'finalizada' (egreso definitivo de PRONEA) NO ocurre aquí:
  // ocurre de forma perezosa la próxima vez que alguien CONSULTE esa
  // inscripción en un ciclo escolar posterior (ver egresarSiCorresponde en
  // src/lib/estadoInscripcion.ts, usado en GET /api/inscripciones). Así,
  // un estudiante que termina 5to. Bachillerato en 2025 queda 'completada'
  // durante 2025, y al buscarlo ya en 2026 el sistema lo pasa a
  // 'finalizada' automáticamente.
  //
  // Importante: solo se autocompleta si el estado actual es 'en_curso'.
  // Si un técnico ya cambió manualmente el estado (por ejemplo porque el
  // resultado final vino de otra fuente), ese cambio nunca se pisa aquí.
  let inscripcion_completada = false
  let estado_final: string | null = null

  if (!numero_libro && resultados.length > 0) {
    const todasNotasCompletas = resultados.every((r: any) => r.notas_completas)

    if (todasNotasCompletas) {
      const { data: inscActual } = await supabaseAdmin.from('inscripciones')
        .select('estado, fecha_cierre').eq('id', inscripcion_id).single()

      if (inscActual?.estado === 'en_curso') {
        const { error: errCierre } = await supabaseAdmin.from('inscripciones').update({
          estado: 'completada',
          fecha_cierre: inscActual.fecha_cierre ?? new Date().toISOString().slice(0, 10),
        }).eq('id', inscripcion_id)

        if (!errCierre) { inscripcion_completada = true; estado_final = 'completada' }
      }
    }
  }

  return ok({ ok: true, resultados, inscripcion_completada, estado_final })
}

