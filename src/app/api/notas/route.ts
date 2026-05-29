// src/app/api/notas/route.ts
// CORRECCIONES:
// 1. Se agrega columna 'paginas' al query de tareas_catalogo
// 2. El GET devuelve tareas Y exámenes juntos ordenados por página
// 3. El POST verifica permiso real del enlace antes de guardar
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// Verifica que un enlace tiene permiso activo para ingresar notas
async function enlaceTienePermiso(usuarioId: string): Promise<boolean> {
  const { data: enlace } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select('id')
    .eq('usuario_id', usuarioId)
    .single()
  if (!enlace) return false

  const { data: auth } = await supabaseAdmin
    .from('autorizaciones_director')
    .select('id')
    .eq('enlace_id', enlace.id)
    .eq('permiso', 'ingresar_notas_enlace')
    .eq('activo', true)
    .maybeSingle()

  return auth !== null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p           = req.nextUrl.searchParams
  const inscripcionId = p.get('inscripcion_id')
  const numLibro    = parseInt(p.get('numero_libro') ?? '1')

  if (!inscripcionId) return err('inscripcion_id requerido')

  // Obtener inscripción
  const { data: insc } = await supabaseAdmin
    .from('inscripciones')
    .select('etapa_id, version_libro, tiene_ajuste_discapacidad')
    .eq('id', inscripcionId)
    .single()
  if (!insc) return err('Inscripción no encontrada', 404)

  // Obtener libro
  const { data: libro } = await supabaseAdmin
    .from('libros')
    .select('id, nombre, numero, version, total_tareas')
    .eq('etapa_id', insc.etapa_id)
    .eq('numero', numLibro)
    .eq('version', insc.version_libro)
    .single()
  if (!libro) return err(`Libro ${numLibro} no configurado para esta etapa`, 404)

  // Tareas del catálogo con PÁGINA incluida, ordenadas por número de tarea (= orden de página)
  const { data: tareas } = await supabaseAdmin
    .from('tareas_catalogo')
    .select('id, numero_tarea, nombre, paginas, puntos_max, area:areas(id, codigo, nombre)')
    .eq('libro_id', libro.id)
    .eq('activo', true)
    .order('numero_tarea')

  // Notas de tareas del estudiante
  const { data: notasTareas } = await supabaseAdmin
    .from('notas_tareas')
    .select('tarea_id, nota, con_ajuste, ajuste_id')
    .eq('inscripcion_id', inscripcionId)

  const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n]))

  const tareasConNota = (tareas ?? []).map((t: any) => ({
    ...t,
    nota:       notaMap.get(t.id)?.nota       ?? null,
    con_ajuste: notaMap.get(t.id)?.con_ajuste ?? false,
  }))

  // Exámenes por área (uno por área del libro)
  const { data: examenes } = await supabaseAdmin
    .from('examenes_catalogo')
    .select('id, nombre, puntos_max, area:areas(id, codigo, nombre)')
    .eq('libro_id', libro.id)
    .eq('activo', true)

  const { data: notasEx } = await supabaseAdmin
    .from('notas_examenes')
    .select('examen_id, nota_original, puntos_obtenidos')
    .eq('inscripcion_id', inscripcionId)

  const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n]))

  const examenesConNota = (examenes ?? []).map((ex: any) => ({
    ...ex,
    nota_original:    exMap.get(ex.id)?.nota_original    ?? null,
    puntos_obtenidos: exMap.get(ex.id)?.puntos_obtenidos ?? null,
  }))

  // Verificar si todas las tareas están ingresadas (para habilitar exámenes)
  const tareasIngresadas  = tareasConNota.filter(t => t.nota !== null).length
  const tareasTotal       = tareasConNota.length
  const todasTareasListas = tareasTotal > 0 && tareasIngresadas === tareasTotal

  return ok({
    libro,
    tareas:          tareasConNota,
    examenes:        examenesConNota,
    tareas_ingresadas: tareasIngresadas,
    tareas_total:    tareasTotal,
    todas_tareas_listas: todasTareasListas,
  })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const rolesPermitidos = ['tecnico', 'enlace_institucional', 'administrador']
  if (!rolesPermitidos.includes(s.rol)) return err('Sin permiso', 403)

  // VERIFICACIÓN REAL del permiso del enlace
  if (s.rol === 'enlace_institucional') {
    const tienePermiso = await enlaceTienePermiso(s.sub)
    if (!tienePermiso) {
      return err('No tienes autorización para ingresar notas. El director debe autorizarte primero.', 403)
    }
  }

  const b = await req.json().catch(() => ({}))
  const { tipo, inscripcion_id } = b
  if (!tipo || !inscripcion_id) return err('tipo e inscripcion_id requeridos')

  if (tipo === 'tarea') {
    const { tarea_id, nota } = b
    if (!tarea_id || nota === undefined || nota === null) return err('tarea_id y nota requeridos')
    const notaNum = parseFloat(String(nota))
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 5) return err('La nota debe estar entre 0 y 5')

    const { data: existe } = await supabaseAdmin.from('notas_tareas')
      .select('id')
      .eq('inscripcion_id', inscripcion_id)
      .eq('tarea_id', tarea_id)
      .maybeSingle()

    const { error } = existe
      ? await supabaseAdmin.from('notas_tareas')
          .update({ nota: notaNum, registrado_por: s.sub, actualizado_en: new Date().toISOString() })
          .eq('id', existe.id)
      : await supabaseAdmin.from('notas_tareas')
          .insert({ inscripcion_id, tarea_id, nota: notaNum, registrado_por: s.sub })

    if (error) return err(error.message, 500)
    return ok({ ok: true })
  }

  if (tipo === 'examen') {
    const { examen_id, nota_original } = b
    if (!examen_id || nota_original === undefined || nota_original === null) {
      return err('examen_id y nota_original requeridos')
    }
    const notaNum = parseFloat(String(nota_original))
    if (isNaN(notaNum) || notaNum < 0 || notaNum > 100) return err('La nota debe estar entre 0 y 100')

    // Conversión automática: 100% → 20 puntos por área
    const puntosObtenidos = Math.round((notaNum / 100) * 20 * 100) / 100

    const { data: existe } = await supabaseAdmin.from('notas_examenes')
      .select('id')
      .eq('inscripcion_id', inscripcion_id)
      .eq('examen_id', examen_id)
      .maybeSingle()

    const { error } = existe
      ? await supabaseAdmin.from('notas_examenes')
          .update({
            nota_original: notaNum,
            puntos_obtenidos: puntosObtenidos,
            registrado_por: s.sub,
            actualizado_en: new Date().toISOString(),
          })
          .eq('id', existe.id)
      : await supabaseAdmin.from('notas_examenes')
          .insert({ inscripcion_id, examen_id, nota_original: notaNum, puntos_obtenidos: puntosObtenidos, registrado_por: s.sub })

    if (error) return err(error.message, 500)
    return ok({ ok: true, puntos_obtenidos: puntosObtenidos })
  }

  return err('tipo debe ser tarea o examen')
}
