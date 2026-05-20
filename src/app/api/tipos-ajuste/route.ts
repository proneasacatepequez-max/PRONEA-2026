// src/app/api/tipos-ajuste/route.ts — PATCH/DELETE editar/eliminar
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('tipos_ajuste_discapacidad').select('id,nombre,descripcion,activo,discapacidad_id').order('nombre')
  if (error) return ok([])
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({})); if (!b.nombre?.trim()) return err('nombre requerido')
  const { data, error } = await supabaseAdmin.from('tipos_ajuste_discapacidad')
    .insert({ nombre: b.nombre.trim(), descripcion: b.descripcion ?? null, discapacidad_id: b.discapacidad_id ?? null, activo: true })
    .select('id').single()
  if (error) { if (error.code === '42P01') return err('Tabla no existe. Ejecuta migración v3.', 500); return err(error.message, 500) }
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({})); if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.nombre        !== undefined) upd.nombre         = b.nombre.trim()
  if (b.descripcion   !== undefined) upd.descripcion    = b.descripcion
  if (b.activo        !== undefined) upd.activo         = b.activo
  if (b.discapacidad_id !== undefined) upd.discapacidad_id = b.discapacidad_id
  const { error } = await supabaseAdmin.from('tipos_ajuste_discapacidad').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return err('id requerido')
  const { error } = await supabaseAdmin.from('tipos_ajuste_discapacidad').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
