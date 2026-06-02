// src/app/api/autorizaciones/route.ts
// CORRECCIÓN: GET all=1 para admin, PUT acepta 'confirmar' y 'revocar'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const all = req.nextUrl.searchParams.get('all') === '1'

  // Admin ve TODAS
  if (s.rol === 'administrador' && all) {
    const { data, error } = await supabaseAdmin
      .from('autorizaciones_director')
      .select(`
        id, permiso, activo, fecha_inicio, fecha_fin,
        autorizado_por_admin, admin_confirmado_en, observaciones, creado_en,
        enlace:enlaces_institucionales(
          id, primer_nombre, primer_apellido, cargo,
          institucion:instituciones(nombre)
        ),
        director:directores(primer_nombre, primer_apellido)
      `)
      .order('creado_en', { ascending: false })

    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  // Director ve las suyas
  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('id').eq('usuario_id', s.sub).single()
    if (!dir) return ok([])

    const { data, error } = await supabaseAdmin
      .from('autorizaciones_director')
      .select(`
        id, permiso, activo, fecha_inicio, fecha_fin,
        autorizado_por_admin, admin_confirmado_en, observaciones, creado_en,
        enlace:enlaces_institucionales(
          id, primer_nombre, primer_apellido, cargo,
          institucion:instituciones(nombre)
        )
      `)
      .eq('director_id', dir.id)
      .order('creado_en', { ascending: false })

    if (error) return err(error.message, 500)
    return ok(data ?? [])
  }

  return err('Sin permiso', 403)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'director') return err('Solo directores', 403)

  const { data: dir } = await supabaseAdmin
    .from('directores').select('id').eq('usuario_id', s.sub).single()
  if (!dir) return err('Perfil de director no encontrado', 404)

  const { enlace_id, permiso, fecha_fin, observaciones } = await req.json().catch(() => ({}))
  if (!enlace_id || !permiso) return err('enlace_id y permiso requeridos')

  // Verificar que el permiso global existe y está activo
  const { data: pg } = await supabaseAdmin
    .from('permisos_globales').select('activo').eq('permiso', permiso).single()
  if (!pg) return err('El permiso no existe en el sistema', 404)
  if (!pg.activo) return err('Este permiso está desactivado globalmente por el administrador', 403)

  // No crear duplicado activo
  const { data: dup } = await supabaseAdmin
    .from('autorizaciones_director')
    .select('id').eq('enlace_id', enlace_id).eq('permiso', permiso).eq('activo', true).maybeSingle()
  if (dup) return err('Ya existe una autorización activa para este enlace y permiso', 409)

  const { data, error } = await supabaseAdmin
    .from('autorizaciones_director')
    .insert({
      director_id:    dir.id,
      enlace_id,
      permiso,
      activo:         true,
      fecha_inicio:   new Date().toISOString().split('T')[0],
      fecha_fin:      fecha_fin || null,
      observaciones:  observaciones || null,
    })
    .select('id')
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)

  const { id, accion } = await req.json().catch(() => ({}))
  if (!id || !accion) return err('id y accion requeridos')

  if (accion === 'confirmar') {
    if (s.rol !== 'administrador') return err('Solo el administrador puede confirmar', 403)
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({
        autorizado_por_admin:  s.sub,
        admin_confirmado_en:   new Date().toISOString(),
        actualizado_en:        new Date().toISOString(),
      })
      .eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: 'Autorización confirmada' })
  }

  if (accion === 'revocar') {
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: 'Autorización revocada' })
  }

  return err('accion debe ser confirmar o revocar')
}
