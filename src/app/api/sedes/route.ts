// src/app/api/sedes/route.ts
// FIX CRÍTICO: eliminado join a instituciones (tabla ya no existe)
// Sin este fix, el selector de sedes aparece vacío en todo el sistema
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const p       = req.nextUrl.searchParams
  const todas   = p.get('todas') === '1'
  const muniId  = p.get('municipio_id')

  let q = supabaseAdmin.from('sedes')
    .select(`
      id, nombre, direccion, telefono, horario, activo,
      codigo_institucional, correo, lat, lng,
      municipio_id, departamento_id,
      municipio:municipios(id, nombre),
      departamento:departamentos(id, nombre)
    `)
    .order('nombre')

  if (!todas) q = q.eq('activo', true)
  if (muniId) q = q.eq('municipio_id', parseInt(muniId))

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  const nombre = (b.nombre ?? '').trim()
  if (!nombre)       return err('nombre requerido')
  if (!b.municipio_id) return err('municipio_id requerido')

  const { data, error } = await supabaseAdmin.from('sedes').insert({
    nombre,
    municipio_id:         parseInt(String(b.municipio_id)),
    departamento_id:      b.departamento_id ? parseInt(String(b.departamento_id)) : null,
    direccion:            b.direccion    || null,
    telefono:             b.telefono     || null,
    horario:              b.horario      || null,
    correo:               b.correo       || null,
    codigo_institucional: b.codigo_institucional || null,
    activo: true,
  }).select('id, nombre').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.nombre              !== undefined) upd.nombre              = b.nombre.trim()
  if (b.activo              !== undefined) upd.activo              = Boolean(b.activo)
  if (b.municipio_id        !== undefined) upd.municipio_id        = b.municipio_id ? parseInt(String(b.municipio_id)) : null
  if (b.departamento_id     !== undefined) upd.departamento_id     = b.departamento_id ? parseInt(String(b.departamento_id)) : null
  if (b.direccion           !== undefined) upd.direccion           = b.direccion || null
  if (b.telefono            !== undefined) upd.telefono            = b.telefono  || null
  if (b.horario             !== undefined) upd.horario             = b.horario   || null
  if (b.correo              !== undefined) upd.correo              = b.correo    || null
  if (b.codigo_institucional !== undefined) upd.codigo_institucional = b.codigo_institucional || null

  const { error } = await supabaseAdmin.from('sedes').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  // Verificar que no haya inscripciones activas
  const { count } = await supabaseAdmin.from('inscripciones')
    .select('*', { count: 'exact', head: true })
    .eq('sede_id', id).eq('estado', 'en_curso')

  if ((count ?? 0) > 0)
    return err(`No se puede desactivar: tiene ${count} inscripción(es) activa(s)`, 409)

  const { error } = await supabaseAdmin.from('sedes').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
