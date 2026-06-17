// src/app/api/libros/route.ts
// FIX: el selector "Libro 1/2" en director/escalas mostraba "Todos" en vez
// de listar los libros reales porque el filtro por etapa_id+version no
// llegaba bien formado desde el frontend (comparaba string vs number)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p          = req.nextUrl.searchParams
  const etapaId    = p.get('etapa_id')
  const version    = p.get('version')      // 'nuevo' | 'viejo'

  let q = supabaseAdmin.from('libros')
    .select(`
      id, etapa_id, nombre, numero, descripcion, version, activo,
      etapa:etapas(id, nombre, codigo)
    `)
    .eq('activo', true)
    .order('numero')

  if (etapaId) q = q.eq('etapa_id', parseInt(etapaId))
  if (version) q = q.eq('version', version)

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.etapa_id) return err('etapa_id requerido')
  if (!b.numero)   return err('numero requerido')
  if (!b.version)  return err('version requerida (nuevo/viejo)')

  const { data, error } = await supabaseAdmin.from('libros').insert({
    etapa_id:    parseInt(String(b.etapa_id)),
    nombre:      b.nombre ?? `Libro ${b.numero}`,
    numero:      parseInt(String(b.numero)),
    version:     b.version,
    descripcion: b.descripcion ?? null,
    activo:      true,
  }).select('id, nombre, numero, version').single()

  if (error) {
    if (error.code === '23505') {
      return err(`Ya existe el Libro ${b.numero} (${b.version}) para esta etapa`, 409)
    }
    return err(error.message, 500)
  }
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.nombre      !== undefined) upd.nombre      = b.nombre
  if (b.numero      !== undefined) upd.numero      = parseInt(String(b.numero))
  if (b.version     !== undefined) upd.version     = b.version
  if (b.descripcion !== undefined) upd.descripcion = b.descripcion
  if (b.activo      !== undefined) upd.activo      = Boolean(b.activo)

  const { error } = await supabaseAdmin.from('libros').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin.from('libros').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

