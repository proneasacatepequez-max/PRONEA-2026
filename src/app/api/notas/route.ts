// src/app/api/notas/route.ts
// FIX #2: NOTE ENTRY - Validar permisos correctamente, validar inscripción pertenece al enlace
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p           = req.nextUrl.searchParams
  const inscId      = p.get('inscripcion_id')
  const libroId     = p.get('libro_id')
  const tipo        = p.get('tipo') ?? 'tareas' // 'tareas' | 'examenes' | 'ambos'

  if (!inscId) return err('inscripcion_id requerido')

  const resultado: any = {}

  if (tipo === 'tareas' || tipo === 'ambos') {
    let q = supabaseAdmin.from('notas_tareas')
      .select(`
        id, nota, con_ajuste,
        tarea:tareas_catalogo(id, numero_tarea, nombre, puntos_max, area_id, libro_id)
      `)
      .eq('inscripcion_id', inscId)

    if (libroId) {
      // Filtrar por libro mediante join (tarea.libro_id)
      const { data: tareaIds } = await supabaseAdmin
        .from('tareas_catalogo').select('id').eq('libro_id', libroId).eq('activo', true)
      const ids = (tareaIds ?? []).map((t: any) => t.id)
      if (ids.length > 0) q = q.in('tarea_id', ids)
      else { resultado.tareas = []; resultado.total_tareas = 0 }
    }

    if (resultado.tareas === undefined) {
      const { data, error } = await q
      if (error) return err(error.message, 500)
      resultado.tareas       = (data ?? []).map((n: any) => ({
        tarea_id:    (n.tarea as any)?.id,
        nota:        n.nota,
        con_ajuste:  n.con_ajuste,
        numero_tarea:(n.tarea as any)?.numero_tarea,
        nombre:      (n.tarea as any)?.nombre,
        puntos_max:  (n.tarea as any)?.puntos_max,
        area_id:     (n.tarea as any)?.area_id,
      }))
      resultado.total_tareas = resultado.tareas.length
    }
  }

  if (tipo === 'examenes' || tipo === 'ambos') {
    let q = supabaseAdmin.from('notas_examenes')
      .select(`
        id, nota_original, puntos_obtenidos,
        examen:examenes_catalogo(id, nombre, puntos_max, area_id, libro_id)
      `)
      .eq('inscripcion_id', inscId)

    if (libroId) {
      const { data: examIds } = await supabaseAdmin
        .from('examenes_catalogo').select('id').eq('libro_id', libroId).eq('activo', true)
      const ids = (examIds ?? []).map((e: any) => e.id)
      if (ids.length > 0) q = q.in('examen_id', ids)
      else { resultado.examenes = []; resultado.total_examenes = 0 }
    }

    if (resultado.examenes === undefined) {
      const { data, error } = await q
      if (error) return err(error.message, 500)
      resultado.examenes       = (data ?? []).map((n: any) => ({
        examen_id:       (n.examen as any)?.id,
        nota_original:   n.nota_original,
        puntos_obtenidos:n.puntos_obtenidos,
        nombre:          (n.examen as any)?.nombre,
        area_id:         (n.examen as any)?.area_id,
      }))
      resultado.total_examenes = resultado.examenes.length
    }
  }

  return ok(resultado)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'enlace_institucional', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso para registrar notas', 403)

  // FIX #2: Validación de permisos para enlace con checks explícitos
  if (s.rol === 'enlace_institucional') {
    const { data: enl, error: enlErr } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('id, sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (enlErr || !enl) {
      return err('No se encontró perfil de enlace', 400)
    }

    // FIX #2: Verificar autorización del director — CORREGIDO: el código
    // real del permiso es 'ingresar_notas_enlace' (con sufijo), no
    // 'ingresar_notas' — por eso nunca encontraba la autorización aunque
    // ya estuviera activa y confirmada por el administrador.
    const { data: auth, error: authErr } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('id, autorizado_por_admin')
      .eq('enlace_id', enl.id)
      .eq('permiso', 'ingresar_notas_enlace')
      .eq('activo', true)
      .maybeSingle()

    if (!auth || !auth.autorizado_por_admin) {
      return err(
        '❌ No tienes autorización para ingresar notas. Solicita al director que te autorice, y luego al administrador que la confirme en Admin → Autorizaciones.',
        403
      )
    }
  }

  const b = await req.json().catch(() => ({}))
  const { inscripcion_id, tipo = 'tarea' } = b

  if (!inscripcion_id) return err('inscripcion_id requerido')

  // FIX #2: Validar que inscripcion_id pertenece a la sede del enlace (si es enlace)
  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    const { data: insc, error: inscErr } = await supabaseAdmin
      .from('inscripciones')
      .select('id, sede_id')
      .eq('id', inscripcion_id)
      .single()

    if (inscErr || !insc) {
      return err('❌ Inscripción no encontrada', 404)
    }

    if (enl && insc.sede_id !== enl.sede_id) {
      return err('❌ No puedes acceder a notas de estudiantes de otras sedes', 403)
    }
  }

  if (tipo === 'tarea') {
    const { tarea_id, nota } = b
    if (!tarea_id) return err('tarea_id requerido')
    if (nota === null || nota === undefined) return err('nota requerida')
    if (nota < 0 || nota > 5) return err('La nota debe estar entre 0 y 5')

    // Upsert: buscar si ya existe, actualizar o insertar
    const { data: existente } = await supabaseAdmin
      .from('notas_tareas')
      .select('id').eq('inscripcion_id', inscripcion_id).eq('tarea_id', tarea_id)
      .maybeSingle()

    if (existente) {
      const { error } = await supabaseAdmin.from('notas_tareas')
        .update({ nota: parseFloat(String(nota)), actualizado_en: new Date().toISOString() })
        .eq('id', existente.id)
      if (error) return err(error.message, 500)
      return ok({ ok: true, accion: 'actualizada', nota })
    } else {
      const { data, error } = await supabaseAdmin.from('notas_tareas').insert({
        inscripcion_id,
        tarea_id,
        nota: parseFloat(String(nota)),
        registrado_por: s.sub,
      }).select('id').single()
      if (error) return err(error.message, 500)
      return ok({ ok: true, accion: 'creada', id: data.id, nota }, 201)
    }
  }

  if (tipo === 'examen') {
    const { examen_id, nota_original } = b
    if (!examen_id) return err('examen_id requerido')
    if (nota_original === null || nota_original === undefined) return err('nota_original requerida')
    if (nota_original < 0 || nota_original > 100) return err('La nota debe estar entre 0 y 100')

    const notaFinal = parseFloat(String(nota_original))
    const puntos    = Math.round((notaFinal / 100) * 20 * 10) / 10

    const { data: existente } = await supabaseAdmin
      .from('notas_examenes')
      .select('id').eq('inscripcion_id', inscripcion_id).eq('examen_id', examen_id)
      .maybeSingle()

    if (existente) {
      const { error } = await supabaseAdmin.from('notas_examenes').update({
        nota_original: notaFinal,
        actualizado_en: new Date().toISOString(),
      }).eq('id', existente.id)
      if (error) return err(error.message, 500)
      return ok({ ok: true, accion: 'actualizada', nota_original: notaFinal, puntos_obtenidos: puntos })
    } else {
      const { data, error } = await supabaseAdmin.from('notas_examenes').insert({
        inscripcion_id,
        examen_id,
        nota_original: notaFinal,
        registrado_por: s.sub,
      }).select('id').single()
      if (error) return err(error.message, 500)
      return ok({ ok: true, accion: 'creada', id: data.id, nota_original: notaFinal, puntos_obtenidos: puntos }, 201)
    }
  }

  return err('tipo debe ser tarea o examen')
}
