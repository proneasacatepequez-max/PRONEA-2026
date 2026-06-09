// src/app/api/mis-enlaces/route.ts
// FIX: devuelve enlaces vinculados a los técnicos de la sede del director
// También devuelve TODOS los enlaces para admin
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  if (s.rol === 'administrador') {
    // Admin ve TODOS los enlaces
    const { data, error } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cargo, telefono, activo,
        usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo, ultimo_acceso),
        institucion:instituciones(id, nombre, tipo)
      `)
      .order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  if (s.rol === 'director') {
    // Director ve enlaces vinculados a sus técnicos
    const { data: dir } = await supabaseAdmin
      .from('directores')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    // Obtener técnicos de su sede
    let tecnicoIds: string[] = []
    if (dir?.sede_id) {
      const { data: tecSedes } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('tecnico_id')
        .eq('sede_id', dir.sede_id)
        .eq('activo', true)
      tecnicoIds = (tecSedes ?? []).map((t: any) => t.tecnico_id)
    }

    // Si no hay técnicos por sede, obtener todos los técnicos activos
    if (tecnicoIds.length === 0) {
      const { data: todosLos } = await supabaseAdmin
        .from('tecnicos').select('id').eq('activo', true)
      tecnicoIds = (todosLos ?? []).map((t: any) => t.id)
    }

    if (tecnicoIds.length === 0) return ok([])

    // Obtener enlaces de esos técnicos
    const { data: teVin } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id')
      .in('tecnico_id', tecnicoIds)
      .eq('ciclo_escolar', ciclo)
      .eq('activo', true)

    const enlaceIds = (teVin ?? []).map((e: any) => e.enlace_id)

    // Si no hay vinculaciones, devolver TODOS los enlaces (para cuando aún no se configuró)
    let qEnlaces = supabaseAdmin.from('enlaces_institucionales')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cargo, telefono, activo,
        usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo, ultimo_acceso),
        institucion:instituciones(id, nombre, tipo)
      `)

    if (enlaceIds.length > 0) {
      qEnlaces = qEnlaces.in('id', enlaceIds)
    }

    const { data, error } = await qEnlaces.eq('activo', true).order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  if (s.rol === 'tecnico') {
    // Técnico ve sus propios enlaces vinculados
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (!tec) return ok([])

    const { data: vinc } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id')
      .eq('tecnico_id', tec.id)
      .eq('ciclo_escolar', ciclo)
      .eq('activo', true)

    const ids = (vinc ?? []).map((v: any) => v.enlace_id)
    if (ids.length === 0) return ok([])

    const { data, error } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cargo, telefono, activo,
        usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo, ultimo_acceso),
        institucion:instituciones(id, nombre, tipo)
      `)
      .in('id', ids)
      .order('primer_apellido')
    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  return ok([])
}
