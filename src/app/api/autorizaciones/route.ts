// src/app/api/autorizaciones/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

const SELECT_AUTH = `
  id, director_id, enlace_id, permiso, activo,
  fecha_inicio, fecha_fin, observaciones,
  autorizado_por_admin, admin_confirmado_en, creado_en, actualizado_en,
  director:directores(id, primer_nombre, primer_apellido),
  enlace:enlaces_institucionales(
    id, primer_nombre, primer_apellido,
    sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre)
  )
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const all = req.nextUrl.searchParams.get('all') === '1'

  let q = supabaseAdmin
    .from('autorizaciones_director')
    .select(SELECT_AUTH)
    .order('creado_en', { ascending: false })

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('id').eq('usuario_id', s.sub).single()
    if (!dir) return ok([])
    q = q.eq('director_id', dir.id)
  } else if (s.rol !== 'administrador' && s.rol !== 'coordinador_digeex') {
    return err('Sin permiso', 403)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.enlace_id) return err('enlace_id requerido')
  if (!b.permiso)   return err('permiso requerido')

  // Verificar que el permiso existe en permisos_globales
  const { data: permisoGlobal } = await supabaseAdmin
    .from('permisos_globales').select('permiso, activo').eq('permiso', b.permiso).maybeSingle()
  if (!permisoGlobal) return err(`El permiso "${b.permiso}" no existe en el sistema`, 400)
  if (!permisoGlobal.activo) return err(`El permiso "${b.permiso}" está desactivado globalmente`, 403)

  // Obtener director — si es admin no necesita director
  let dirId: string | null = null
  let dirSedeId: string | null = null

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('id, sede_id').eq('usuario_id', s.sub).single()
    if (!dir) return err('No se encontró tu perfil de director', 404)
    dirId      = dir.id
    dirSedeId  = dir.sede_id

    // Verificar que el enlace existe y pertenece a la sede del director
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('id, sede_id, primer_nombre, primer_apellido')
      .eq('id', b.enlace_id)
      .single()

    if (!enl) return err('❌ No se encontró el enlace institucional', 404)

    // Solo bloquear si el director tiene sede_id definida Y el enlace es de otra sede
    if (dirSedeId && enl.sede_id && enl.sede_id !== dirSedeId)
      return err(`❌ El enlace "${enl.primer_nombre} ${enl.primer_apellido}" no pertenece a tu sede. Tu sede: ${dirSedeId} / Sede del enlace: ${enl.sede_id}`, 403)
  }

  // Verificar duplicado activo
  const { data: dup } = await supabaseAdmin
    .from('autorizaciones_director')
    .select('id')
    .eq('enlace_id', b.enlace_id)
    .eq('permiso', b.permiso)
    .eq('activo', true)
    .maybeSingle()

  if (dup) return err('Ya existe una autorización activa para este enlace y permiso', 409)

  const { data, error } = await supabaseAdmin
    .from('autorizaciones_director')
    .insert({
      director_id:  dirId,
      enlace_id:    b.enlace_id,
      permiso:      b.permiso,
      activo:       true,
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin:    b.fecha_fin || null,
      observaciones:b.observaciones || null,
    })
    .select(SELECT_AUTH)
    .single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, data, mensaje: '✅ Autorización creada. Pendiente de confirmación del administrador.' }, 201)
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const accion = b.accion // 'revocar' | 'confirmar' | 'extender'

  if (accion === 'revocar') {
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({ activo: false, actualizado_en: new Date().toISOString() })
      .eq('id', b.id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Autorización revocada' })
  }

  if (accion === 'confirmar') {
    if (s.rol !== 'administrador') return err('Solo el administrador puede confirmar', 403)
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({
        autorizado_por_admin: s.sub,
        admin_confirmado_en:  new Date().toISOString(),
        actualizado_en:       new Date().toISOString(),
      })
      .eq('id', b.id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Autorización confirmada' })
  }

  if (accion === 'extender') {
    if (!b.fecha_fin) return err('fecha_fin requerida para extender')
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({ fecha_fin: b.fecha_fin, actualizado_en: new Date().toISOString() })
      .eq('id', b.id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Fecha extendida' })
  }

  if (accion === 'reactivar') {
    if (s.rol === 'administrador') {
      // El admin reactiva y confirma en el mismo paso — tiene autoridad total
      const { error } = await supabaseAdmin
        .from('autorizaciones_director')
        .update({
          activo: true,
          autorizado_por_admin: s.sub,
          admin_confirmado_en:  new Date().toISOString(),
          ...(b.fecha_fin !== undefined ? { fecha_fin: b.fecha_fin || null } : {}),
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', b.id)
      if (error) return err(error.message, 500)
      return ok({ ok: true, mensaje: '✅ Autorización reactivada y confirmada' })
    }

    // El director reactiva pero requiere que el admin la vuelva a confirmar
    const { error } = await supabaseAdmin
      .from('autorizaciones_director')
      .update({
        activo: true,
        autorizado_por_admin: null,
        admin_confirmado_en:  null,
        ...(b.fecha_fin !== undefined ? { fecha_fin: b.fecha_fin || null } : {}),
        actualizado_en: new Date().toISOString(),
      })
      .eq('id', b.id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Autorización reactivada. Pendiente de confirmación del administrador.' })
  }

  return err('accion inválida — usa: revocar | confirmar | extender | reactivar')
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin.from('autorizaciones_director').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: '✅ Autorización eliminada' })
}

