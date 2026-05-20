// src/app/api/libros/route.ts — PATCH/DELETE editar/eliminar
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('libros')
    .select('id,nombre,numero,version,total_tareas,activo,etapa_id,etapa:etapas(id,nombre,nivel)')
    .order('etapa_id').order('numero').order('version')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({})); if (!b.etapa_id || !b.nombre) return err('etapa_id y nombre requeridos')
  const { data, error } = await supabaseAdmin.from('libros').insert({
    etapa_id: b.etapa_id, nombre: b.nombre.trim(), numero: b.numero ?? 1,
    version: b.version ?? 'nuevo', total_tareas: b.total_tareas ?? 20, activo: true,
  }).select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({})); if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.nombre      !== undefined) upd.nombre        = b.nombre.trim()
  if (b.numero      !== undefined) upd.numero        = b.numero
  if (b.version     !== undefined) upd.version       = b.version
  if (b.total_tareas !== undefined) upd.total_tareas = b.total_tareas
  if (b.activo      !== undefined) upd.activo        = b.activo
  if (b.etapa_id    !== undefined) upd.etapa_id      = b.etapa_id
  const { error } = await supabaseAdmin.from('libros').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return err('id requerido')
  const { count } = await supabaseAdmin.from('notas_tareas').select('*', { count:'exact', head:true }).eq('libro_id', id)
  if ((count ?? 0) > 0) {
    await supabaseAdmin.from('libros').update({ activo: false }).eq('id', id)
    return ok({ ok:true, mensaje:'Libro desactivado (tiene notas)' })
  }
  const { error } = await supabaseAdmin.from('libros').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok:true, mensaje:'Libro eliminado' })
}
