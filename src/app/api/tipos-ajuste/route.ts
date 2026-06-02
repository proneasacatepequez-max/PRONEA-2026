// src/app/api/tipos-ajuste/route.ts
// CORRECCIÓN: eliminado discapacidad_id — no existe en la tabla tipos_ajuste_discapacidad
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .select('id, codigo, nombre, descripcion, activo')
    .order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.nombre?.trim()) return err('nombre requerido')

  // Generar código automático a partir del nombre
  const codigo = b.nombre.trim()
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '_')
    .slice(0, 20)
  const codigoFinal = `${codigo}_${Date.now().toString().slice(-4)}`

  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .insert({
      codigo:      codigoFinal,
      nombre:      b.nombre.trim(),
      descripcion: b.descripcion || null,
      activo:      true,
    })
    .select('id, codigo, nombre, descripcion, activo')
    .single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.nombre      !== undefined) upd.nombre      = b.nombre.trim()
  if (b.descripcion !== undefined) upd.descripcion = b.descripcion || null
  if (b.activo      !== undefined) upd.activo      = Boolean(b.activo)

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  const { error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .update(upd)
    .eq('id', b.id)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .update({ activo: false })
    .eq('id', parseInt(id))

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
