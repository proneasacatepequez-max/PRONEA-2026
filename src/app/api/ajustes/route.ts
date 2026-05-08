// src/app/api/ajustes/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const inscripcion_id = req.nextUrl.searchParams.get('inscripcion_id')
  if (!inscripcion_id) return err('inscripcion_id requerido')

  const { data, error } = await supabaseAdmin
    .from('ajustes_discapacidad')
    .select(`
      id, descripcion_ajuste, tareas_total_ajustado,
      puntos_max_ajustado, porcentaje_examen_ajustado, activo, creado_en,
      tipo_ajuste_id, area_id, libro_id
    `)
    .eq('inscripcion_id', inscripcion_id)
    .order('creado_en', { ascending: false })

  if (error) {
    if (error.code === '42P01') return ok([])
    return err(error.message, 500)
  }

  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json()
  if (!b.inscripcion_id || !b.descripcion_ajuste) {
    return err('inscripcion_id y descripcion_ajuste son requeridos')
  }

  const { data, error } = await supabaseAdmin.from('ajustes_discapacidad').insert({
    inscripcion_id:             b.inscripcion_id,
    descripcion_ajuste:         b.descripcion_ajuste,
    tipo_ajuste_id:             b.tipo_ajuste_id             ?? null,
    area_id:                    b.area_id                    ?? null,
    libro_id:                   b.libro_id                   ?? null,
    tareas_total_ajustado:      b.tareas_total_ajustado      ?? null,
    puntos_max_ajustado:        b.puntos_max_ajustado        ?? null,
    porcentaje_examen_ajustado: b.porcentaje_examen_ajustado ?? null,
    activo:                     true,
    creado_por:                 s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)

  // Marcar la inscripción como que tiene ajuste
  await supabaseAdmin.from('inscripciones')
    .update({ tiene_ajuste_discapacidad: true })
    .eq('id', b.inscripcion_id)

  return ok(data, 201)
}
