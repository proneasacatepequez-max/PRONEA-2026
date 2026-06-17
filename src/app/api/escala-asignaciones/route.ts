// src/app/api/escala-asignaciones/route.ts
// FIX: upsert manual en lugar de onConflict (falla con NULLs en PostgreSQL)
// FIX: PATCH permite editar técnico asignado (transferir)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  let q = supabaseAdmin.from('escala_asignaciones')
    .select(`
      id, version_libro, estado, ciclo_escolar, observaciones, creado_en, actualizado_en,
      etapa:etapas(id, nombre, codigo),
      libro:libros(id, nombre, numero, version),
      area:areas(id, nombre, codigo),
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico),
      asignador:usuarios!escala_asignaciones_asignado_por_fkey(correo)
    `)
    .eq('ciclo_escolar', ciclo)
    .order('creado_en', { ascending: false })

  // Técnico solo ve sus asignaciones
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (tec) q = q.eq('tecnico_id', tec.id)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)

  // Contar tareas construidas por asignación
  const conProgreso = await Promise.all((data ?? []).map(async (a: any) => {
    const libroId = (a.libro as any)?.id
    const areaId  = (a.area  as any)?.id
    let totalTareas = 0

    if (libroId) {
      let qT = supabaseAdmin.from('tareas_catalogo')
        .select('*', { count: 'exact', head: true })
        .eq('libro_id', libroId)
        .eq('activo', true)
      if (areaId) qT = qT.eq('area_id', areaId)
      const { count } = await qT
      totalTareas = count ?? 0
    }

    return { ...a, tareas_construidas: totalTareas }
  }))

  return ok(conProgreso)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol))
    return err('Solo director o administrador', 403)

  const b = await req.json().catch(() => ({}))
  const { etapa_id, libro_id, area_id, tecnico_id, version_libro, ciclo_escolar = 2026, observaciones } = b

  if (!etapa_id)   return err('etapa_id requerido')
  if (!tecnico_id) return err('tecnico_id requerido')

  const { data: tec } = await supabaseAdmin
    .from('tecnicos').select('id, primer_nombre, primer_apellido')
    .eq('id', tecnico_id).single()
  if (!tec) return err('Técnico no encontrado', 404)

  // FIX: buscar si ya existe (sin onConflict que falla con NULLs)
  let q = supabaseAdmin.from('escala_asignaciones')
    .select('id')
    .eq('etapa_id', parseInt(String(etapa_id)))
    .eq('ciclo_escolar', parseInt(String(ciclo_escolar)))

  if (libro_id) q = q.eq('libro_id', libro_id)
  else          q = q.is('libro_id', null)

  if (area_id) q = q.eq('area_id', parseInt(String(area_id)))
  else         q = q.is('area_id', null)

  const { data: existente } = await q.maybeSingle()

  let resultId: string

  if (existente) {
    // Actualizar existente
    const { error } = await supabaseAdmin.from('escala_asignaciones')
      .update({
        tecnico_id,
        estado:         'pendiente',
        asignado_por:   s.sub,
        observaciones:  observaciones || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', existente.id)
    if (error) return err(error.message, 500)
    resultId = existente.id
  } else {
    // Insertar nuevo
    const { data, error } = await supabaseAdmin.from('escala_asignaciones')
      .insert({
        etapa_id:      parseInt(String(etapa_id)),
        libro_id:      libro_id    || null,
        area_id:       area_id     ? parseInt(String(area_id)) : null,
        tecnico_id,
        version_libro: version_libro || 'nuevo',
        ciclo_escolar: parseInt(String(ciclo_escolar)),
        estado:        'pendiente',
        asignado_por:  s.sub,
        observaciones: observaciones || null,
      })
      .select('id')
      .single()
    if (error) return err(error.message, 500)
    resultId = data.id
  }

  return ok({
    ok: true,
    id: resultId,
    mensaje: `Técnico ${tec.primer_nombre} ${tec.primer_apellido} asignado correctamente`,
  }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = { actualizado_en: new Date().toISOString() }
  if (b.estado        !== undefined) upd.estado        = b.estado
  if (b.tecnico_id    !== undefined) upd.tecnico_id    = b.tecnico_id
  if (b.observaciones !== undefined) upd.observaciones = b.observaciones || null
  if (b.libro_id      !== undefined) upd.libro_id      = b.libro_id      || null
  if (b.area_id       !== undefined) upd.area_id       = b.area_id ? parseInt(String(b.area_id)) : null

  // Si transfiere a otro técnico, resetear estado
  if (b.tecnico_id && b.tecnico_id !== b._tecnico_anterior) {
    upd.estado = 'pendiente'
  }

  const { error } = await supabaseAdmin
    .from('escala_asignaciones').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: 'Asignación actualizada' })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol))
    return err('Solo director o administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('escala_asignaciones').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
