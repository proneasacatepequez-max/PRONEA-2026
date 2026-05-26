// src/app/api/ajustes/route.ts
// FIX: tipos_ajuste_discapacidad.codigo NOT NULL — se genera automáticamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  const inscId = req.nextUrl.searchParams.get('inscripcion_id')
  if (!inscId) return err('inscripcion_id requerido')
  const { data, error } = await supabaseAdmin
    .from('ajustes_discapacidad')
    .select(`
      id, descripcion_ajuste, tareas_total_ajustado,
      puntos_max_ajustado, porcentaje_examen_ajustado, activo, creado_en,
      tipo_ajuste:tipos_ajuste_discapacidad(id, nombre, codigo),
      area:areas(nombre), libro:libros(nombre, numero)
    `)
    .eq('inscripcion_id', inscId)
    .order('creado_en', { ascending: false })
  if (error) {
    if (error.code === '42P01') return ok([])
    return err(error.message, 500)
  }
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.inscripcion_id || !b.descripcion_ajuste)
    return err('inscripcion_id y descripcion_ajuste son requeridos')

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

  try {
    await supabaseAdmin.from('inscripciones')
      .update({ tiene_ajuste_discapacidad: true }).eq('id', b.inscripcion_id)
  } catch { }

  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.descripcion_ajuste         !== undefined) upd.descripcion_ajuste         = b.descripcion_ajuste
  if (b.tareas_total_ajustado      !== undefined) upd.tareas_total_ajustado      = b.tareas_total_ajustado
  if (b.puntos_max_ajustado        !== undefined) upd.puntos_max_ajustado        = b.puntos_max_ajustado
  if (b.porcentaje_examen_ajustado !== undefined) upd.porcentaje_examen_ajustado = b.porcentaje_examen_ajustado
  if (b.activo                     !== undefined) upd.activo                     = b.activo
  upd.actualizado_en = new Date().toISOString()
  const { error } = await supabaseAdmin.from('ajustes_discapacidad').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

