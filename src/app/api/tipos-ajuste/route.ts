// src/app/api/tipos-ajuste/route.ts
// FIX: genera campo 'codigo' automáticamente (NOT NULL UNIQUE)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

function generarCodigo(nombre: string): string {
  return nombre
    .toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^A-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/).slice(0, 3).join('-')
    .substring(0, 20) + '-' + Date.now().toString().slice(-4)
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .select('id, codigo, nombre, descripcion, activo')
    .order('nombre')
  if (error) return ok([])
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.nombre?.trim()) return err('nombre requerido')

  const codigo = b.codigo?.trim() || generarCodigo(b.nombre)

  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .insert({
      codigo,
      nombre:      b.nombre.trim(),
      descripcion: b.descripcion ?? null,
      activo:      true,
    })
    .select('id').single()

  if (error) {
    if (error.code === '42P01') return err('Tabla no existe. Ejecuta migración SQL.')
    if (error.code === '23505') {
      // Código duplicado — generar otro
      const codigoAlt = generarCodigo(b.nombre) + Math.floor(Math.random() * 100)
      const { data: d2, error: e2 } = await supabaseAdmin
        .from('tipos_ajuste_discapacidad')
        .insert({ codigo: codigoAlt, nombre: b.nombre.trim(), descripcion: b.descripcion ?? null, activo: true })
        .select('id').single()
      if (e2) return err(e2.message, 500)
      return ok(d2, 201)
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
  if (b.nombre      !== undefined) upd.nombre      = b.nombre.trim()
  if (b.descripcion !== undefined) upd.descripcion = b.descripcion
  if (b.activo      !== undefined) upd.activo      = b.activo
  const { error } = await supabaseAdmin.from('tipos_ajuste_discapacidad').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')
  const { error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
