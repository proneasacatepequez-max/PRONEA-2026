// src/app/api/recursos/route.ts
// CORRECCIÓN: PATCH guarda etapa_id, area_id, libro_id correctamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  const p = req.nextUrl.searchParams

  let q = supabaseAdmin.from('recursos_apoyo').select(`
    id, titulo, descripcion, url, tipo_contenido,
    duracion_minutos, es_publico, activo, orden, destacado,
    etapa_id, area_id, libro_id,
    etapa:etapas(id, nombre),
    area:areas(id, nombre)
  `)
  .eq('activo', true)
  .order('destacado', { ascending: false })
  .order('orden')

  if (s.rol === 'estudiante') q = q.eq('es_publico', true)
  if (p.get('etapa_id')) q = q.eq('etapa_id', parseInt(p.get('etapa_id')!))
  if (p.get('area_id'))  q = q.eq('area_id',  parseInt(p.get('area_id')!))
  if (p.get('libro_id')) q = q.eq('libro_id', p.get('libro_id')!)
  if (p.get('tipo'))     q = q.eq('tipo_contenido', p.get('tipo')!)

  const { data, error } = await q
  if (error) {
    if (error.code === '42P01') return ok([])
    return err(error.message, 500)
  }
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.titulo?.trim()) return err('titulo requerido')
  if (!b.url?.trim())    return err('url requerida')

  const { data, error } = await supabaseAdmin.from('recursos_apoyo').insert({
    titulo:         b.titulo.trim(),
    descripcion:    b.descripcion    ?? null,
    url:            b.url.trim(),
    tipo_contenido: b.tipo_contenido ?? 'link',
    etapa_id:       b.etapa_id       ? parseInt(String(b.etapa_id))  : null,
    area_id:        b.area_id        ? parseInt(String(b.area_id))   : null,
    libro_id:       b.libro_id       || null,
    es_publico:     b.es_publico     ?? false,
    destacado:      b.destacado      ?? false,
    orden:          b.orden          ?? 0,
    activo:         true,
    creado_por:     s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  // Campos de texto
  if (b.titulo         !== undefined) upd.titulo         = b.titulo?.trim() || null
  if (b.descripcion    !== undefined) upd.descripcion    = b.descripcion    || null
  if (b.url            !== undefined) upd.url            = b.url?.trim()    || null
  if (b.tipo_contenido !== undefined) upd.tipo_contenido = b.tipo_contenido || null
  // CORRECCIÓN: guardar etapa_id, area_id, libro_id correctamente
  if (b.etapa_id       !== undefined) upd.etapa_id       = b.etapa_id ? parseInt(String(b.etapa_id)) : null
  if (b.area_id        !== undefined) upd.area_id        = b.area_id  ? parseInt(String(b.area_id))  : null
  if (b.libro_id       !== undefined) upd.libro_id       = b.libro_id || null
  // Booleanos
  if (b.activo         !== undefined) upd.activo         = Boolean(b.activo)
  if (b.es_publico     !== undefined) upd.es_publico     = Boolean(b.es_publico)
  if (b.destacado      !== undefined) upd.destacado      = Boolean(b.destacado)
  if (b.orden          !== undefined) upd.orden          = parseInt(String(b.orden)) || 0

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  const { error } = await supabaseAdmin.from('recursos_apoyo').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')
  const { error } = await supabaseAdmin.from('recursos_apoyo').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
