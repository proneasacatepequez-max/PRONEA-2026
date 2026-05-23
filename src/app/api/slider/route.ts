// src/app/api/slider/route.ts
// FIX: tabla real es slider_imagenes (no "slider")
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('slider_imagenes')  // ← nombre real
    .select('id,titulo,descripcion,url_imagen,orden,activo')
    .eq('activo', true).order('orden')
  if (error) return ok([])
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.url_imagen) return err('url_imagen requerida')
  const { data, error } = await supabaseAdmin.from('slider_imagenes').insert({
    titulo:     b.titulo    ?? null,
    descripcion: b.descripcion ?? null,
    url_imagen: b.url_imagen.trim(),
    orden:      b.orden     ?? 0,
    activo:     true,
    creado_por: s.sub,
  }).select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')
  const { error } = await supabaseAdmin.from('slider_imagenes').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
