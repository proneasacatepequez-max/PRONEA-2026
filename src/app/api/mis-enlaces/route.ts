// src/app/api/mis-enlaces/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// Select compartido — sede en lugar de instituciones
const SELECT_ENLACE = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  cargo, telefono, activo,
  usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo, ultimo_acceso),
  sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre)
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  if (s.rol === 'administrador') {
    const { data, error } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(SELECT_ENLACE)
      .order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores')
      .select('sede_id, departamento_id')
      .eq('usuario_id', s.sub)
      .maybeSingle()

    // CORREGIDO: el director ve enlaces de TODO su departamento, no solo
    // de una sede — se resuelven primero todas las sedes del departamento.
    let sedeIds: string[] = []
    if (dir?.departamento_id) {
      const { data: sedesDepto } = await supabaseAdmin
        .from('sedes').select('id').eq('departamento_id', dir.departamento_id)
      sedeIds = (sedesDepto ?? []).map((sd: any) => sd.id)
    } else if (dir?.sede_id) {
      sedeIds = [dir.sede_id]
    }

    let tecnicoIds: string[] = []
    if (sedeIds.length > 0) {
      const { data: tecSedes } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('tecnico_id')
        .in('sede_id', sedeIds)
        .eq('activo', true)
      tecnicoIds = [...new Set((tecSedes ?? []).map((t: any) => t.tecnico_id))]
    }

    if (tecnicoIds.length === 0) {
      const { data: todos } = await supabaseAdmin
        .from('tecnicos').select('id').eq('activo', true)
      tecnicoIds = (todos ?? []).map((t: any) => t.id)
    }

    if (tecnicoIds.length === 0) return ok([])

    // CORREGIDO: combinar AMBAS fuentes de vinculación técnico↔enlace
    // (tecnico_enlaces Y enlaces_institucionales.tecnico_id directo) —
    // antes solo se usaba la primera y algunos enlaces nunca aparecían.
    const [{ data: teVin }, { data: enlDirecto }] = await Promise.all([
      supabaseAdmin.from('tecnico_enlaces')
        .select('enlace_id').in('tecnico_id', tecnicoIds)
        .eq('ciclo_escolar', ciclo).eq('activo', true),
      supabaseAdmin.from('enlaces_institucionales')
        .select('id').in('tecnico_id', tecnicoIds).eq('activo', true),
    ])

    const enlaceIds = [...new Set([
      ...(teVin ?? []).map((e: any) => e.enlace_id),
      ...(enlDirecto ?? []).map((e: any) => e.id),
    ])]

    // También incluir enlaces cuya SEDE está dentro del departamento del
    // director, aunque no tengan vínculo directo con ninguno de sus técnicos
    let enlacesPorSede: string[] = []
    if (sedeIds.length > 0) {
      const { data: porSede } = await supabaseAdmin
        .from('enlaces_institucionales')
        .select('id').in('sede_id', sedeIds).eq('activo', true)
      enlacesPorSede = (porSede ?? []).map((e: any) => e.id)
    }

    const todosLosIds = [...new Set([...enlaceIds, ...enlacesPorSede])]

    let q = supabaseAdmin
      .from('enlaces_institucionales')
      .select(SELECT_ENLACE)

    if (todosLosIds.length > 0) q = q.in('id', todosLosIds)

    const { data, error } = await q.eq('activo', true).order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (!tec) return ok([])

    const [{ data: vinc }, { data: directo }] = await Promise.all([
      supabaseAdmin.from('tecnico_enlaces')
        .select('enlace_id').eq('tecnico_id', tec.id)
        .eq('ciclo_escolar', ciclo).eq('activo', true),
      supabaseAdmin.from('enlaces_institucionales')
        .select('id').eq('tecnico_id', tec.id).eq('activo', true),
    ])

    const ids = [...new Set([
      ...(vinc ?? []).map((v: any) => v.enlace_id),
      ...(directo ?? []).map((d: any) => d.id),
    ])]
    if (ids.length === 0) return ok([])

    const { data, error } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(SELECT_ENLACE)
      .in('id', ids)
      .order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  return ok([])
}

