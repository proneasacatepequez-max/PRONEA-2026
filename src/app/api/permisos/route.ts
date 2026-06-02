// src/app/api/permisos/route.ts
// CORRECCIÓN: PUT para toggle activo funciona correctamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (s.rol === 'administrador') {
    const { data, error } = await supabaseAdmin
      .from('permisos_globales')
      .select('id, permiso, descripcion, activo, actualizado_en')
      .order('permiso')
    if (error) {
      if (error.code === '42P01') return ok([])
      return err(error.message, 500)
    }
    return ok(data ?? [])
  }

  if (s.rol === 'enlace_institucional') {
    const { data: globales } = await supabaseAdmin
      .from('permisos_globales')
      .select('permiso, descripcion, activo')
      .order('permiso')

    const { data: enlace } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('id')
      .eq('usuario_id', s.sub)
      .single()

    if (!enlace) return ok([])

    const { data: autorizaciones } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('permiso, activo, autorizado_por_admin')
      .eq('enlace_id', enlace.id)
      .eq('activo', true)

    const authMap = new Map(
      (autorizaciones ?? []).map((a: any) => [a.permiso, a])
    )

    const resultado = (globales ?? []).map((pg: any) => {
      const auth = authMap.get(pg.permiso)
      return {
        permiso:     pg.permiso,
        descripcion: pg.descripcion,
        // Activo = permiso global activo + autorización del enlace confirmada por admin
        activo:      pg.activo && !!auth && !!auth.autorizado_por_admin,
        tiene_auth:  !!auth,
      }
    })

    return ok(resultado)
  }

  // Otros roles: solo permisos activos
  const { data } = await supabaseAdmin
    .from('permisos_globales')
    .select('permiso, activo')
    .eq('activo', true)
  return ok(data ?? [])
}

// PUT: toggle activo de un permiso global (solo admin)
export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const { permiso, activo } = await req.json().catch(() => ({}))
  if (!permiso)            return err('permiso requerido')
  if (activo === undefined) return err('activo requerido')

  // Intentar actualizar — si no existe, insertar
  const { data: existe } = await supabaseAdmin
    .from('permisos_globales')
    .select('id')
    .eq('permiso', permiso)
    .maybeSingle()

  if (existe) {
    const { error } = await supabaseAdmin
      .from('permisos_globales')
      .update({
        activo,
        actualizado_por: s.sub,
        actualizado_en:  new Date().toISOString(),
      })
      .eq('permiso', permiso)
    if (error) return err(error.message, 500)
  } else {
    // Crear el permiso si no existe
    const { error } = await supabaseAdmin.from('permisos_globales').insert({
      permiso,
      activo,
      actualizado_por: s.sub,
      actualizado_en:  new Date().toISOString(),
    })
    if (error) return err(error.message, 500)
  }

  return ok({ ok: true, permiso, activo })
}

// PATCH: igual que PUT (alias)
export const PATCH = PUT
