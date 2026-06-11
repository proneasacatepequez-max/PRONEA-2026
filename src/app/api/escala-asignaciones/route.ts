// src/app/api/escala-asignaciones/route.ts — NUEVA RUTA
// Director/Admin asigna técnico para digitalizar la escala numérica
// El técnico asignado puede construir el catálogo de tareas y exámenes
// Todos los técnicos pueden VER las escalas (son compartidas)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const ciclo  = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')
  const etapaId = req.nextUrl.searchParams.get('etapa_id')

  let q = supabaseAdmin.from('escala_asignaciones')
    .select(`
      id, version_libro, estado, ciclo_escolar, observaciones, creado_en,
      etapa:etapas(id, nombre, codigo),
      libro:libros(id, nombre, numero, version),
      area:areas(id, nombre, codigo),
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico),
      asignador:usuarios!escala_asignaciones_asignado_por_fkey(correo)
    `)
    .eq('ciclo_escolar', ciclo)
    .order('creado_en', { ascending: false })

  if (etapaId) q = q.eq('etapa_id', parseInt(etapaId))

  // Técnico solo ve sus propias asignaciones
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (tec) q = q.eq('tecnico_id', tec.id)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)

  // Para cada asignación: contar tareas construidas
  const conProgreso = await Promise.all((data ?? []).map(async (a: any) => {
    const libroId = a.libro?.id
    const areaId  = a.area?.id

    let totalTareas = 0
    if (libroId && areaId) {
      const { count } = await supabaseAdmin
        .from('tareas_catalogo')
        .select('*', { count: 'exact', head: true })
        .eq('libro_id', libroId)
        .eq('area_id',  areaId)
        .eq('activo', true)
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

  // Verificar que el técnico existe
  const { data: tec } = await supabaseAdmin
    .from('tecnicos').select('id, primer_nombre, primer_apellido')
    .eq('id', tecnico_id).single()
  if (!tec) return err('Técnico no encontrado', 404)

  // Upsert — si ya existe la asignación, actualizar el técnico
  const { data, error } = await supabaseAdmin
    .from('escala_asignaciones')
    .upsert({
      etapa_id:      parseInt(String(etapa_id)),
      libro_id:      libro_id   || null,
      area_id:       area_id    ? parseInt(String(area_id)) : null,
      tecnico_id,
      version_libro: version_libro || 'nuevo',
      ciclo_escolar: parseInt(String(ciclo_escolar)),
      estado:        'pendiente',
      asignado_por:  s.sub,
      observaciones: observaciones || null,
      actualizado_en: new Date().toISOString(),
    }, { onConflict: 'etapa_id,libro_id,area_id,ciclo_escolar' })
    .select('id')
    .single()

  if (error) return err(error.message, 500)
  return ok({
    ok: true,
    id: data.id,
    mensaje: `Técnico ${tec.primer_nombre} ${tec.primer_apellido} asignado para digitalizar la escala`,
  }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.estado       !== undefined) upd.estado       = b.estado
  if (b.tecnico_id   !== undefined) upd.tecnico_id   = b.tecnico_id
  if (b.observaciones !== undefined) upd.observaciones = b.observaciones || null
  upd.actualizado_en = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('escala_asignaciones').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
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
