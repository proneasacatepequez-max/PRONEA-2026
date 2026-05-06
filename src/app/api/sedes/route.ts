// src/app/api/sedes/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('sedes')
    .select('id,nombre,direccion,telefono,horario,activo,municipio:municipios(id,nombre)')
    .order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json()
  if (!b.nombre) return err('nombre requerido')
  const { data, error } = await supabaseAdmin.from('sedes').insert({
    nombre:       b.nombre.trim(),
    direccion:    b.direccion ?? null,
    telefono:     b.telefono  ?? null,
    horario:      b.horario   ?? null,
    municipio_id: b.municipio_id ?? null,
    activo:       true,
  }).select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}
