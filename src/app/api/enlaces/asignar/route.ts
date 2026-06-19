// src/app/api/enlaces/asignar/route.ts — NUEVA RUTA
// Permite al director o administrador asignar/cambiar sede y técnico
// responsable a un enlace YA CREADO (esto faltaba por completo)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)

  const { data, error } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select(`
      id, primer_nombre, primer_apellido, cargo, activo,
      usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo),
      sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre),
      tecnico:tecnicos!enlaces_institucionales_tecnico_id_fkey(id, primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .order('primer_apellido')

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const { enlace_id, sede_id, tecnico_id } = b

  if (!enlace_id) return err('enlace_id requerido')
  if (!sede_id)   return err('sede_id requerido — la sede es obligatoria para el enlace')

  const { data: enlaceActual } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select('id, tecnico_id')
    .eq('id', enlace_id)
    .single()

  if (!enlaceActual) return err('Enlace no encontrado', 404)

  const { error } = await supabaseAdmin
    .from('enlaces_institucionales')
    .update({
      sede_id,
      tecnico_id: tecnico_id || null,
    })
    .eq('id', enlace_id)

  if (error) return err(error.message, 500)

  // Sincronizar tabla tecnico_enlaces
  if (tecnico_id && tecnico_id !== enlaceActual.tecnico_id) {
    // Desactivar vínculo anterior si existía
    if (enlaceActual.tecnico_id) {
      await supabaseAdmin.from('tecnico_enlaces')
        .update({ activo: false })
        .eq('enlace_id', enlace_id)
        .eq('tecnico_id', enlaceActual.tecnico_id)
        .catch(() => {})
    }
    // Crear o reactivar el nuevo vínculo
    const { data: existeVinculo } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('id').eq('enlace_id', enlace_id).eq('tecnico_id', tecnico_id).maybeSingle()

    if (existeVinculo) {
      await supabaseAdmin.from('tecnico_enlaces')
        .update({ activo: true }).eq('id', existeVinculo.id)
    } else {
      await supabaseAdmin.from('tecnico_enlaces').insert({
        tecnico_id, enlace_id, ciclo_escolar: 2026, activo: true,
      }).catch(() => {})
    }
  }

  return ok({ ok: true, mensaje: 'Sede y técnico asignados correctamente' })
}
