// src/app/api/notas/route.ts
// Notas de tareas y exámenes — para el técnico
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams
  const inscripcionId = p.get('inscripcion_id')
  const tipo          = p.get('tipo') ?? 'tareas'  // 'tareas' | 'examenes'
  const numLibro      = parseInt(p.get('numero_libro') ?? '1')

  if (!inscripcionId) return err('inscripcion_id requerido')

  // Obtener la inscripción para saber etapa y versión de libro
  const { data: insc } = await supabaseAdmin
    .from('inscripciones').select('etapa_id, version_libro').eq('id', inscripcionId).single()
  if (!insc) return err('Inscripción no encontrada', 404)

  // Obtener el libro
  const { data: libro } = await supabaseAdmin
    .from('libros')
    .select('id, nombre, version, total_tareas')
    .eq('etapa_id', insc.etapa_id)
    .eq('numero', numLibro)
    .eq('version', insc.version_libro)
    .single()

  if (!libro) return err(`Libro ${numLibro} no configurado para esta etapa`, 404)

  if (tipo === 'tareas') {
    // Tareas del catálogo + notas del estudiante
    const { data: tareas } = await supabaseAdmin
      .from('tareas_catalogo')
      .select(`id, numero_tarea, nombre, puntos_max, area:areas(nombre)`)
      .eq('libro_id', libro.id).eq('activo', true)
      .order('numero_tarea')

    const { data: notasTareas } = await supabaseAdmin
      .from('notas_tareas').select('tarea_id, nota, con_ajuste')
      .eq('inscripcion_id', inscripcionId)

    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n]))

    const tareasCon = (tareas ?? []).map((t: any) => ({
      ...t,
      nota:        notaMap.get(t.id)?.nota      ?? null,
      con_ajuste:  notaMap.get(t.id)?.con_ajuste ?? false,
    }))

    return ok({ libro, tareas: tareasCon, examenes: [] })
  }

  if (tipo === 'examenes') {
    const { data: examenes } = await supabaseAdmin
      .from('examenes_catalogo')
      .select(`id, nombre, puntos_max, area:areas(nombre)`)
      .eq('libro_id', libro.id).eq('activo', true)

    const { data: notasEx } = await supabaseAdmin
      .from('notas_examenes').select('examen_id, nota_original')
      .eq('inscripcion_id', inscripcionId)

    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n]))

    const exCon = (examenes ?? []).map((ex: any) => ({
      ...ex,
      nota_original: exMap.get(ex.id)?.nota_original ?? null,
    }))

    return ok({ libro, tareas: [], examenes: exCon })
  }

  return err('tipo debe ser tareas o examenes')
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'enlace_institucional', 'administrador'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  const b = await req.json().catch(() => ({}))
  const { tipo, inscripcion_id } = b
  if (!tipo || !inscripcion_id) return err('tipo e inscripcion_id requeridos')

  if (tipo === 'tarea') {
    const { tarea_id, nota } = b
    if (!tarea_id || nota === undefined) return err('tarea_id y nota requeridos')
    if (nota < 0 || nota > 5) return err('La nota debe estar entre 0 y 5')

    // Upsert — actualizar si ya existe
    const { data: existe } = await supabaseAdmin.from('notas_tareas')
      .select('id').eq('inscripcion_id', inscripcion_id).eq('tarea_id', tarea_id).maybeSingle()

    let error
    if (existe) {
      const r = await supabaseAdmin.from('notas_tareas')
        .update({ nota, registrado_por: s.sub, actualizado_en: new Date().toISOString() })
        .eq('id', existe.id)
      error = r.error
    } else {
      const r = await supabaseAdmin.from('notas_tareas')
        .insert({ inscripcion_id, tarea_id, nota, registrado_por: s.sub })
      error = r.error
    }
    if (error) return err(error.message, 500)
    return ok({ ok: true })
  }

  if (tipo === 'examen') {
    const { examen_id, nota_original } = b
    if (!examen_id || nota_original === undefined) return err('examen_id y nota_original requeridos')
    if (nota_original < 0 || nota_original > 100) return err('La nota debe estar entre 0 y 100')

    const { data: existe } = await supabaseAdmin.from('notas_examenes')
      .select('id').eq('inscripcion_id', inscripcion_id).eq('examen_id', examen_id).maybeSingle()

    let error
    if (existe) {
      const r = await supabaseAdmin.from('notas_examenes')
        .update({ nota_original, registrado_por: s.sub, actualizado_en: new Date().toISOString() })
        .eq('id', existe.id)
      error = r.error
    } else {
      const r = await supabaseAdmin.from('notas_examenes')
        .insert({ inscripcion_id, examen_id, nota_original, registrado_por: s.sub })
      error = r.error
    }
    if (error) return err(error.message, 500)
    return ok({ ok: true })
  }

  return err('tipo debe ser tarea o examen')
}
