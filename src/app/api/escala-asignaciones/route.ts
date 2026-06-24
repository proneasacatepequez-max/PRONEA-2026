// src/app/api/escala-asignaciones/route.ts
// FIX #5: ASSIGN TÉCNICO - Endpoint para asignar técnico a escala numérica
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (!['director', 'coordinador_digeex', 'administrador'].includes(s.rol)) {
    return err('Sin permiso para ver asignaciones', 403)
  }

  const p = req.nextUrl.searchParams
  const etapa_id = p.get('etapa_id')
  const libro_id = p.get('libro_id')
  const ciclo = p.get('ciclo') ?? '2026'

  let q = supabaseAdmin
    .from('escala_asignaciones')
    .select(`
      id, etapa_id, libro_id, area_id, tecnico_id, ciclo_escolar, estado, observaciones,
      etapa:etapas(id, codigo, nombre),
      libro:libros(id, numero),
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('ciclo_escolar', parseInt(ciclo))

  if (etapa_id) q = q.eq('etapa_id', parseInt(etapa_id))
  if (libro_id) q = q.eq('libro_id', libro_id)

  const { data, error } = await q.order('creado_en', { ascending: false })

  if (error) return err(error.message, 500)
  return ok({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (!['director', 'coordinador_digeex', 'administrador'].includes(s.rol)) {
    return err('❌ Solo director, coordinador o admin pueden asignar técnicos', 403)
  }

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { etapa_id, libro_id, area_id, tecnico_id, ciclo_escolar = 2026 } = b

  // Validaciones
  if (!etapa_id) return err('etapa_id requerido')
  if (!tecnico_id) return err('tecnico_id requerido')

  // FIX #5: Validar que el técnico existe
  const { data: tec, error: tecErr } = await supabaseAdmin
    .from('tecnicos')
    .select('id')
    .eq('id', tecnico_id)
    .single()

  if (tecErr || !tec) {
    return err('❌ El técnico no existe', 404)
  }

  // FIX #5: Validar que la etapa existe
  const { data: etapa, error: etapaErr } = await supabaseAdmin
    .from('etapas')
    .select('id')
    .eq('id', parseInt(etapa_id))
    .single()

  if (etapaErr || !etapa) {
    return err('❌ La etapa no existe', 404)
  }

  // Crear asignación
  const { data, error } = await supabaseAdmin
    .from('escala_asignaciones')
    .insert({
      etapa_id: parseInt(etapa_id),
      libro_id: libro_id || null,
      area_id: area_id ? parseInt(area_id) : null,
      tecnico_id,
      asignado_por: s.sub,
      ciclo_escolar: parseInt(ciclo_escolar),
      estado: 'pendiente',
    })
    .select('id')
    .single()

  if (error) return err(error.message, 500)

  // Log en auditoría
  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub,
    accion: 'ASIGNAR_TECNICO_ESCALA',
    tabla_afectada: 'escala_asignaciones',
    registro_id: data.id,
    datos_nuevos: { etapa_id, libro_id, tecnico_id },
  }).catch(() => {})

  return ok({
    ok: true,
    id: data.id,
    mensaje: '✅ Técnico asignado correctamente a la escala',
  }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['director', 'coordinador_digeex', 'administrador'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { id, estado, observaciones } = b
  if (!id) return err('id requerido')

  const upd: any = {}
  if (estado) upd.estado = estado
  if (observaciones !== undefined) upd.observaciones = observaciones

  const { error } = await supabaseAdmin
    .from('escala_asignaciones')
    .update(upd)
    .eq('id', id)

  if (error) return err(error.message, 500)

  return ok({ ok: true, mensaje: '✅ Asignación actualizada' })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['director', 'coordinador_digeex', 'administrador'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('escala_asignaciones')
    .delete()
    .eq('id', id)

  if (error) return err(error.message, 500)

  return ok({ ok: true, mensaje: '✅ Asignación eliminada' })
}
