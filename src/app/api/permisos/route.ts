// src/app/api/permisos/route.ts
// FIX: permisos globales se reflejan en TODOS los roles correctamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  // Para el admin: ver todos los permisos con estadísticas
  if (s.rol === 'administrador') {
    const { data, error } = await supabaseAdmin
      .from('permisos_globales').select('*').order('permiso')
    if (error) {
      if (error.code === '42P01') return ok([])
      return err(error.message, 500)
    }
    return ok(data ?? [])
  }

  // Para el enlace: verificar sus permisos activos
  if (s.rol === 'enlace_institucional') {
    // 1. Permisos globales activos
    const { data: globales } = await supabaseAdmin
      .from('permisos_globales').select('permiso, activo').eq('activo', true)

    // 2. Autorizaciones específicas del enlace
    const { data: enlace } = await supabaseAdmin
      .from('enlaces_institucionales').select('id').eq('usuario_id', s.sub).single()

    if (!enlace) return ok([])

    const { data: autorizaciones } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('permiso, activo, autorizado_por_admin')
      .eq('enlace_id', enlace.id)
      .eq('activo', true)
      .not('autorizado_por_admin', 'is', null) // Requiere confirmación del admin

    const permisosGlobales = new Set((globales ?? []).map((p: any) => p.permiso))
    const permisosAutorizados = new Set((autorizaciones ?? []).map((a: any) => a.permiso))

    // El permiso es válido si AMBOS están activos: global Y autorización
    const permisosActivos = (autorizaciones ?? [])
      .filter((a: any) => permisosGlobales.has(a.permiso))
      .map((a: any) => ({ permiso: a.permiso, activo: true }))

    return ok(permisosActivos)
  }

  // Para director: ver autorizaciones que ha dado
  if (s.rol === 'director') {
    const { data: director } = await supabaseAdmin
      .from('directores').select('id').eq('usuario_id', s.sub).single()
    if (!director) return ok([])

    const { data } = await supabaseAdmin
      .from('autorizaciones_director')
      .select(`
        id, permiso, activo, fecha_inicio, fecha_fin,
        autorizado_por_admin, observaciones,
        enlace:enlaces_institucionales(primer_nombre, primer_apellido, cargo)
      `)
      .eq('director_id', director.id)
      .order('creado_en', { ascending: false })

    return ok(data ?? [])
  }

  return ok([])
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const { permiso, activo } = await req.json().catch(() => ({}))
  if (!permiso || typeof activo !== 'boolean') return err('permiso y activo requeridos')

  const { error } = await supabaseAdmin.from('permisos_globales')
    .update({ activo, actualizado_por: s.sub, actualizado_en: new Date().toISOString() })
    .eq('permiso', permiso)

  if (error) {
    if (error.code === 'PGRST116') {
      // No existe — crear
      await supabaseAdmin.from('permisos_globales')
        .insert({ permiso, activo, actualizado_por: s.sub })
      return ok({ ok: true })
    }
    return err(error.message, 500)
  }

  return ok({ ok: true, permiso, activo })
}

// Admin confirma/revoca autorizaciones de directores
export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const { id, accion } = await req.json().catch(() => ({}))
  if (!id || !accion) return err('id y accion requeridos')

  const upd: any = {}
  if (accion === 'confirmar') {
    upd.autorizado_por_admin = s.sub
    upd.admin_confirmado_en = new Date().toISOString()
  } else if (accion === 'revocar') {
    upd.activo = false
  } else {
    return err('accion debe ser confirmar o revocar')
  }

  const { error } = await supabaseAdmin
    .from('autorizaciones_director').update(upd).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
