// src/app/api/escalas/route.ts
// CORRECCIONES:
// 1. Fórmula correcta: tareas = 30 pts por área, examen = 20 pts por área (total 50 por libro)
// 2. Cálculo POR ÁREA individual para determinar promoción
// 3. Promoción: todas las áreas >= 60 pts en su escala de 0-100
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

// Convierte puntos de tarea (sobre puntos_max acumulados) a escala de 30 pts
function calcularPuntosTareas(puntosObt: number, puntosMax: number): number {
  if (puntosMax === 0) return 0
  return Math.round((puntosObt / puntosMax) * 30 * 100) / 100
}

// Convierte nota de examen (sobre 100) a escala de 20 pts
function calcularPuntosExamen(notaOriginal: number): number {
  return Math.round((notaOriginal / 100) * 20 * 100) / 100
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p     = req.nextUrl.searchParams
  const inscId = p.get('inscripcion_id')
  if (!inscId) return err('inscripcion_id requerido')

  // Datos de la inscripción
  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`
      id, ciclo_escolar, version_libro, tiene_ajuste_discapacidad,
      estudiante:estudiantes(
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, codigo_estudiante, fecha_nacimiento, genero
      ),
      etapa:etapas(id, nombre, nivel),
      sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('id', inscId)
    .single()
  if (!insc) return err('Inscripción no encontrada', 404)

  // Libros de la etapa
  const { data: libros } = await supabaseAdmin.from('libros')
    .select('id, nombre, numero, version, total_tareas')
    .eq('etapa_id', (insc.etapa as any)?.id ?? 0)
    .eq('version', insc.version_libro)
    .eq('activo', true)
    .order('numero')

  const resLibros = await Promise.all((libros ?? []).map(async (libro: any) => {
    // Tareas con su área
    const { data: tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id, numero_tarea, nombre, paginas, puntos_max, area:areas(id, codigo, nombre)')
      .eq('libro_id', libro.id)
      .eq('activo', true)
      .order('numero_tarea')

    // Notas de tareas
    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id, nota')
      .eq('inscripcion_id', inscId)
    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    // Exámenes con su área
    const { data: examenes } = await supabaseAdmin.from('examenes_catalogo')
      .select('id, nombre, puntos_max, area:areas(id, codigo, nombre)')
      .eq('libro_id', libro.id)
      .eq('activo', true)

    // Notas de exámenes
    const { data: notasEx } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id, nota_original, puntos_obtenidos')
      .eq('inscripcion_id', inscId)
    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n]))

    // ── CÁLCULO POR ÁREA ──
    // Agrupar tareas por área
    const areaMap: Record<string, {
      area: any
      tareas: any[]
      examenes: any[]
    }> = {}

    for (const t of (tareas ?? [])) {
      const areaId = (t.area as any)?.id ?? 'sin_area'
      if (!areaMap[areaId]) areaMap[areaId] = { area: t.area, tareas: [], examenes: [] }
      areaMap[areaId].tareas.push({
        ...t,
        nota: notaMap.get(t.id) ?? null,
      })
    }

    for (const ex of (examenes ?? [])) {
      const areaId = (ex.area as any)?.id ?? 'sin_area'
      if (!areaMap[areaId]) areaMap[areaId] = { area: ex.area, tareas: [], examenes: [] }
      const exConNota = exMap.get(ex.id)
      areaMap[areaId].examenes.push({
        ...ex,
        nota_original:    exConNota?.nota_original    ?? null,
        puntos_obtenidos: exConNota?.puntos_obtenidos ?? null,
      })
    }

    // Calcular resultado por área
    const areas = Object.values(areaMap).map(({ area, tareas: tArea, examenes: eArea }) => {
      const puntosObt = tArea.filter(t => t.nota !== null).reduce((a: number, t: any) => a + t.nota, 0)
      const puntosMax = tArea.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)

      const ptsTareas = calcularPuntosTareas(puntosObt, puntosMax)    // sobre 30

      const examenArea = eArea[0] ?? null
      const ptsExamen  = examenArea?.nota_original !== null && examenArea?.nota_original !== undefined
        ? calcularPuntosExamen(examenArea.nota_original)               // sobre 20
        : null

      const totalArea  = ptsExamen !== null ? Math.round((ptsTareas + ptsExamen) * 100) / 100 : null
      // Para determinar promoción usamos escala 0-50 (max por área por libro)
      // Promovido si total >= 30 (equivale al 60% de 50)
      const promoArea  = totalArea !== null ? totalArea >= 30 : null

      return {
        area,
        tareas:      tArea,
        examenes:    eArea,
        pts_tareas:  ptsTareas,
        pts_examen:  ptsExamen,
        total_area:  totalArea,
        promovido_area: promoArea,
      }
    })

    // Totales del libro
    const ptsTareasLibro  = areas.reduce((a, ar) => a + ar.pts_tareas, 0)
    const ptsExamenLibro  = areas.reduce((a, ar) => a + (ar.pts_examen ?? 0), 0)
    const totalLibro      = Math.round((ptsTareasLibro + ptsExamenLibro) * 100) / 100
    const todasAreasOk    = areas.every(ar => ar.promovido_area === true)
    const tareasIngresadas = (tareas ?? []).filter(t => notaMap.has(t.id)).length

    // Estado de la escala guardada
    const { data: escala } = await supabaseAdmin.from('escalas_calificacion')
      .select('id, numero_escala, firmada, bloqueada, aprobada_director, aprobada_admin, generada_en')
      .eq('inscripcion_id', inscId)
      .eq('libro_id', libro.id)
      .maybeSingle()

    return {
      ...libro,
      areas,
      pts_tareas_libro:   Math.round(ptsTareasLibro * 100) / 100,
      pts_examen_libro:   Math.round(ptsExamenLibro * 100) / 100,
      total_libro:        totalLibro,
      promovido_libro:    todasAreasOk,
      tareas_ingresadas:  tareasIngresadas,
      tareas_total:       (tareas ?? []).length,
      escala:             escala ?? null,
    }
  }))

  // Resultado global de la etapa (ambos libros)
  const totalEtapa = resLibros.reduce((a, l) => a + (l.total_libro ?? 0), 0)
  const promoEtapa = resLibros.every(l => l.promovido_libro === true)

  return ok({ inscripcion: insc, libros: resLibros, total_etapa: Math.round(totalEtapa * 100) / 100, promovido_etapa: promoEtapa })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.inscripcion_id || !b.libro_id) return err('inscripcion_id y libro_id requeridos')

  // Verificar si ya existe
  const { data: existe } = await supabaseAdmin.from('escalas_calificacion')
    .select('id, numero_escala, bloqueada, generada_por')
    .eq('inscripcion_id', b.inscripcion_id)
    .eq('libro_id', b.libro_id)
    .maybeSingle()

  if (existe) {
    if (existe.bloqueada && s.rol === 'tecnico' && existe.generada_por !== s.sub) {
      return err('Esta escala está bloqueada. Contacta al director para desbloquearla.', 403)
    }
    return ok({ ok: true, id: existe.id, numero_escala: existe.numero_escala, ya_existia: true })
  }

  // Generar número único de escala usando timestamp para evitar race condition
  const ts = Date.now()
  const numEscala = `ESC-${new Date().getFullYear()}-${String(ts).slice(-6)}`

  const { data, error } = await supabaseAdmin.from('escalas_calificacion').insert({
    inscripcion_id: b.inscripcion_id,
    libro_id:       b.libro_id,
    numero_escala:  numEscala,
    generada_por:   s.sub,
    tipo_escala:    b.tipo_escala ?? 'libro',
    firmada:        false,
    bloqueada:      false,
  }).select('id, numero_escala').single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, id: data.id, numero_escala: data.numero_escala }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.bloqueada !== undefined) {
    upd.bloqueada     = b.bloqueada
    upd.bloqueada_por = b.bloqueada ? s.sub : null
    upd.bloqueada_en  = b.bloqueada ? new Date().toISOString() : null
  }
  if (b.aprobada_director !== undefined) upd.aprobada_director = b.aprobada_director
  if (b.aprobada_admin    !== undefined) upd.aprobada_admin    = b.aprobada_admin

  const { error } = await supabaseAdmin.from('escalas_calificacion').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
