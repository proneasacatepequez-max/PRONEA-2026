// src/app/api/recursos/route.ts — FIX 404
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const p = req.nextUrl.searchParams
  let q = supabaseAdmin.from('recursos_apoyo')
    .select('id,titulo,descripcion,url,tipo_contenido,duracion_minutos,destacado,orden,es_publico,activo,etapa_id,area_id')
    .eq('activo', true).order('destacado', { ascending:false }).order('orden')
  if (s.rol === 'estudiante') q = q.eq('es_publico', true)
  if (p.get('etapa_id')) q = q.eq('etapa_id', parseInt(p.get('etapa_id')!))
  if (p.get('area_id'))  q = q.eq('area_id',  parseInt(p.get('area_id')!))
  const { data, error } = await q
  if (error) { if (error.code === '42P01') return ok([]); return err(error.message, 500) }
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s || !['administrador','tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({})); if (!b.titulo || !b.url) return err('titulo y url requeridos')
  const { data, error } = await supabaseAdmin.from('recursos_apoyo').insert({
    titulo: b.titulo.trim(), descripcion: b.descripcion ?? null, url: b.url.trim(),
    tipo_contenido: b.tipo_contenido ?? 'link', es_publico: b.es_publico ?? false,
    destacado: b.destacado ?? false, orden: b.orden ?? 0, activo: true, creado_por: s.sub,
  }).select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req); if (!s || !['administrador','tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({})); if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.titulo     !== undefined) upd.titulo     = b.titulo.trim()
  if (b.url        !== undefined) upd.url        = b.url
  if (b.activo     !== undefined) upd.activo     = b.activo
  if (b.es_publico !== undefined) upd.es_publico = b.es_publico
  if (b.destacado  !== undefined) upd.destacado  = b.destacado
  const { error } = await supabaseAdmin.from('recursos_apoyo').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req); if (!s || !['administrador','tecnico'].includes(s.rol)) return err('Sin permiso', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return err('id requerido')
  const { error } = await supabaseAdmin.from('recursos_apoyo').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
