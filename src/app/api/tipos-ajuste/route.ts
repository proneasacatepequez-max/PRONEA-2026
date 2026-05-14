// src/app/api/tipos-ajuste/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .select('id, nombre, descripcion, activo')
    .order('nombre')
  if (error) return ok([]) // tabla puede no existir aún
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { nombre, descripcion } = await req.json()
  if (!nombre?.trim()) return err('nombre requerido')

  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .insert({ nombre: nombre.trim(), descripcion: descripcion ?? null, activo: true })
    .select('id').single()

  if (error) {
    if (error.code === '42P01') return err('La tabla tipos_ajuste_discapacidad no existe. Ejecuta la migración v3.')
    return err(error.message, 500)
  }
  return ok(data, 201)
}
