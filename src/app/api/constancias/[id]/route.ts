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
    const { data: actual, error: errActual } = await supabaseAdmin.from('constancias_inscripcion').select('estado').eq('id', id).single()
    if (errActual || !actual) return err(errActual?.message ?? 'Constancia no encontrada', 404)

    let upd: any = {}

    if (accion === 'validar') {
      if (s.rol !== 'director') return err('Solo el director puede validar', 403)
      if (actual.estado !== 'pendiente_validacion') return err('Esta constancia ya no está pendiente de validación', 400)
      upd = { estado: 'validado', validado_por: s.sub, validado_en: new Date().toISOString() }

    } else if (accion === 'rechazar') {
      if (s.rol !== 'director') return err('Solo el director puede rechazar', 403)
      if (actual.estado !== 'pendiente_validacion') return err('Esta constancia ya no está pendiente de validación', 400)
      if (!motivo?.trim()) return err('El motivo de rechazo es requerido', 400)
      upd = { estado: 'rechazado', motivo_rechazo: motivo.trim(), validado_por: s.sub, validado_en: new Date().toISOString() }

    } else if (accion === 'anular') {
      if (s.rol !== 'administrador') return err('Solo el administrador puede anular', 403)
      upd = { estado: 'anulado' }

    } else if (accion === 'marcar_exportado') {
      if (!['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
      if (actual.estado !== 'validado') return err('Solo se puede exportar una constancia ya validada por el director', 400)
      upd = { estado: 'exportado', exportado_por: s.sub, exportado_en: new Date().toISOString() }

    } else {
      return err('accion inválida — usa: validar, rechazar, anular, marcar_exportado', 400)
    }

    const { error } = await supabaseAdmin.from('constancias_inscripcion').update(upd).eq('id', id)
    if (error) return err(error.message, 500)

    await supabaseAdmin.from('auditoria').insert({
      usuario_id: s.sub, accion: `constancia_${accion}`, tabla_afectada: 'constancias_inscripcion',
      registro_id: id, datos_nuevos: upd,
    }).catch(() => {})

    return ok({ ok: true })
  } catch (e: any) {
    return err('Error inesperado: ' + (e?.message ?? String(e)), 500)
  }
}
