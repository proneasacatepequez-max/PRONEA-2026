// src/app/api/mi-progreso/route.ts
// CORRECCIÓN: Devuelve progreso por área con fórmula correcta (30+20=50 por área)
// Ciclo leído de configuración, no hardcodeado
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getCicloActual(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('configuracion').select('valor')
    .eq('parametro', 'ciclo_escolar_actual').single()
  return parseInt(data?.valor ?? '2026')
}

const ptsATareas = (obt: number, max: number) =>
  max > 0 ? Math.round((obt / max) * 30 * 100) / 100 : 0
const ptsAExamen = (nota: number) =>
  Math.round((nota / 100) * 20 * 100) / 100

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'estudiante') return err('Solo estudiantes', 403)

  const ciclo = await getCicloActual()

  const { data: est } = await supabaseAdmin.from('estudiantes')
    .select('id, codigo_estudiante, primer_nombre, primer_apellido')
    .eq('usuario_id', s.sub).single()
  if (!est) return err('Estudiante no encontrado', 404)

  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`
      id, ciclo_escolar, version_libro, estado, tiene_ajuste_discapacidad,
      etapa:etapas(id, nombre, nivel),
      sede:sedes(nombre),
      tecnico:tecnicos!inscripciones_tecnico_id_fkey(primer_nombre, primer_apellido)
    `)
    .eq('estudiante_id', est.id)
    .eq('estado', 'en_curso')
    .eq('ciclo_escolar', ciclo)
    .single()

  if (!insc) return ok({ estudiante: est, inscripcion: null, resumen_etapa: null, libros: [] })

  // Leer resumen de etapa guardado
  const { data: re } = await supabaseAdmin.from('resumen_etapa')
    .select('nota_libro_1, nota_libro_2, nota_final_etapa, calificacion_cualitativa, promovido')
    .eq('inscripcion_id', insc.id).single()

  // Construir vista por libro y por área
  const libros: any[] = []

  for (const num of [1, 2]) {
    const { data: libro } = await supabaseAdmin.from('libros')
      .select('id, nombre, numero, version, total_tareas')
      .eq('etapa_id', (insc.etapa as any).id)
      .eq('numero', num)
      .eq('version', insc.version_libro)
      .single()

    if (!libro) continue

    // Tareas con área
    const { data: tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id, numero_tarea, nombre, paginas, puntos_max, area:areas(id, nombre, codigo)')
      .eq('libro_id', libro.id).eq('activo', true).order('numero_tarea')

    // Notas
    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id, nota')
      .eq('inscripcion_id', insc.id)
    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    // Exámenes con área
    const { data: examenes } = await supabaseAdmin.from('examenes_catalogo')
      .select('id, nombre, puntos_max, area:areas(id, nombre, codigo)')
      .eq('libro_id', libro.id).eq('activo', true)

    const { data: notasEx } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id, nota_original, puntos_obtenidos')
      .eq('inscripcion_id', insc.id)
    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n]))

    // Agrupar por área
    const areaIds = [...new Set([
      ...(tareas ?? []).map((t: any) => (t.area as any)?.id),
      ...(examenes ?? []).map((e: any) => (e.area as any)?.id),
    ].filter(Boolean))]

    const areas = areaIds.map(areaId => {
      const tareasArea   = (tareas ?? []).filter((t: any) => (t.area as any)?.id === areaId)
      const examenesArea = (examenes ?? []).filter((e: any) => (e.area as any)?.id === areaId)
      const areaNombre   = (tareasArea[0] ?? examenesArea[0])?.area?.nombre ?? '—'

      const puntosObt = tareasArea.reduce((a: number, t: any) => a + (notaMap.get(t.id) ?? 0), 0)
      const puntosMax = tareasArea.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
      const ingresadas = tareasArea.filter((t: any) => notaMap.has(t.id)).length

      const ptsTareas = ptsATareas(puntosObt, puntosMax)

      const examen = examenesArea[0] ?? null
      const notaEx = examen ? (exMap.get(examen.id)?.nota_original ?? null) : null
      const ptsExamen = notaEx !== null ? ptsAExamen(notaEx) : null
      const totalArea = ptsExamen !== null ? Math.round((ptsTareas + ptsExamen) * 100) / 100 : null

      return {
        area_id:      areaId,
        area_nombre:  areaNombre,
        tareas_total: tareasArea.length,
        ingresadas,
        pts_tareas:   ptsTareas,          // sobre 30
        pts_examen:   ptsExamen,          // sobre 20
        total_area:   totalArea,          // sobre 50
        promovido:    totalArea !== null ? totalArea >= 30 : null,
        // Para el estudiante solo mostramos las notas, no los detalles de cada tarea
        nota_examen_original: notaEx,
      }
    })

    // Resumen del libro
    const totalLibro      = areas.reduce((a, ar) => a + (ar.total_area ?? 0), 0)
    const tareasIngresadas = (tareas ?? []).filter((t: any) => notaMap.has(t.id)).length
    const tareasTotal      = (tareas ?? []).length
    const todasAreasOk    = areas.length > 0 && areas.every(a => a.promovido === true)

    // Resumen guardado
    const { data: rl } = await supabaseAdmin.from('resumen_libro')
      .select('tareas_completadas, tareas_total, zona, nota_final, promovido, estado')
      .eq('inscripcion_id', insc.id).eq('libro_id', libro.id).single()

    libros.push({
      ...libro,
      areas,
      tareas_ingresadas: tareasIngresadas,
      tareas_total:      tareasTotal,
      total_libro:       Math.round(totalLibro * 100) / 100,
      promovido_libro:   todasAreasOk,
      resumen:           rl ?? null,
    })
  }

  return ok({ estudiante: est, inscripcion: insc, resumen_etapa: re, libros })
}

