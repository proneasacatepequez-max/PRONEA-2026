// src/app/api/constancias/[id]/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const s = await getSession(req)
    if (!s) return err('No autorizado', 401)

    const { accion, motivo } = await req.json().catch(() => ({}))

    // Permisos por acción
    if (accion === 'validar' || accion === 'rechazar') {
      if (s.rol !== 'director' && s.rol !== 'administrador') return err('Sin permiso', 403)
    } else if (accion === 'anular') {
      if (s.rol !== 'administrador') return err('Solo el administrador puede anular', 403)
    } else if (accion === 'marcar_exportado') {
      // Técnico, director y admin pueden marcar exportado
      if (!['tecnico', 'director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
    } else {
      return err('Acción no reconocida', 400)
    }

    // Leer la constancia
    const { data: c, error } = await supabaseAdmin
      .from('constancias_inscripcion')
      .select('id, estado, inscripcion_id')
      .eq('id', id).single()
    if (error || !c) return err('Constancia no encontrada', 404)

    // Resguardo de alcance para director
    if (s.rol === 'director') {
      const { data: dir } = await supabaseAdmin.from('directores').select('sede_id').eq('usuario_id', s.sub).maybeSingle()
      const { data: insc } = await supabaseAdmin.from('inscripciones').select('sede_id').eq('id', c.inscripcion_id).maybeSingle()
      if (!dir?.sede_id || insc?.sede_id !== dir.sede_id) return err('Sin permiso sobre esta constancia', 403)
    } else if (s.rol === 'tecnico' && accion === 'marcar_exportado') {
      const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
      const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', c.inscripcion_id).maybeSingle()
      if (!tec?.id || insc?.tecnico_id !== tec.id) return err('Sin permiso sobre esta constancia', 403)
    }

    const ahora = new Date().toISOString()
    let update: any = {}

    if (accion === 'validar') {
      if (c.estado !== 'pendiente_validacion') return err('Solo se pueden validar constancias pendientes', 400)
      update = { estado: 'validado', validado_por: s.sub, validado_en: ahora }
    } else if (accion === 'rechazar') {
      if (c.estado !== 'pendiente_validacion') return err('Solo se pueden rechazar constancias pendientes', 400)
      if (!motivo?.trim()) return err('El motivo del rechazo es obligatorio', 400)
      update = { estado: 'rechazado', motivo_rechazo: motivo.trim(), validado_por: s.sub, validado_en: ahora }
    } else if (accion === 'anular') {
      if (c.estado === 'anulado') return err('Ya está anulada', 400)
      update = { estado: 'anulado', motivo_rechazo: motivo?.trim() || 'Anulada por administrador' }
    } else if (accion === 'marcar_exportado') {
      if (c.estado !== 'validado') return err('Solo se pueden exportar constancias validadas', 400)
      update = { estado: 'exportado', exportado_por: s.sub, exportado_en: ahora }
    }

    const { data: actualizada, error: errUpd } = await supabaseAdmin
      .from('constancias_inscripcion')
      .update(update)
      .eq('id', id)
      .select()
      .single()
    if (errUpd) return err(errUpd.message, 500)

    try {
      await supabaseAdmin.from('auditoria').insert({
        usuario_id: s.sub, accion: `constancia_${accion}`,
        tabla_afectada: 'constancias_inscripcion', registro_id: id,
        datos_nuevos: update,
      })
    } catch { /* no bloquear */ }

    return ok({ ok: true, constancia: actualizada })
  } catch (e: any) {
    return err('Error inesperado: ' + (e?.message ?? String(e)), 500)
  }
}

// DELETE → eliminar físicamente (solo admin)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const s = await getSession(req)
    if (!s) return err('No autorizado', 401)
    if (s.rol !== 'administrador') return err('Solo el administrador puede eliminar constancias', 403)

    const { data: c, error } = await supabaseAdmin
      .from('constancias_inscripcion')
      .select('id, numero_constancia, estudiante_id, estado')
      .eq('id', id).single()
    if (error || !c) return err('Constancia no encontrada', 404)

    const { error: errDel } = await supabaseAdmin
      .from('constancias_inscripcion')
      .delete()
      .eq('id', id)
    if (errDel) return err(errDel.message, 500)

    try {
      await supabaseAdmin.from('auditoria').insert({
        usuario_id: s.sub, accion: 'eliminar_constancia',
        tabla_afectada: 'constancias_inscripcion', registro_id: id,
        datos_nuevos: { numero_constancia: c.numero_constancia, estudiante_id: c.estudiante_id, estado_anterior: c.estado },
      })
    } catch { /* no bloquear */ }

    return ok({ ok: true, eliminada: c.numero_constancia })
  } catch (e: any) {
    return err('Error inesperado al eliminar: ' + (e?.message ?? String(e)), 500)
  }
}
