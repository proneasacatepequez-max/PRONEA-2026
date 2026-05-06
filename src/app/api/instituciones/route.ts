// src/app/api/instituciones/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const { data, error } = await supabaseAdmin
    .from('instituciones')
    .select('id,nombre,tipo,activo')
    .eq('activo', true).order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json()
  if (!b.nombre) return err('nombre requerido')
  const { data, error } = await supabaseAdmin.from('instituciones')
    .insert({ nombre: b.nombre.trim(), tipo: b.tipo ?? 'otro', activo: true })
    .select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}
