// src/app/api/libros/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('libros')
    .select('id,nombre,numero,version,total_tareas,activo,etapa:etapas(id,nombre,nivel)')
    .order('etapa_id').order('numero').order('version')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json()
  if (!b.etapa_id || !b.nombre) return err('etapa_id y nombre requeridos')
  const { data, error } = await supabaseAdmin.from('libros').insert({
    etapa_id:     b.etapa_id,
    nombre:       b.nombre.trim(),
    numero:       b.numero ?? 1,
    version:      b.version ?? 'nuevo',
    total_tareas: b.total_tareas ?? 20,
    activo:       true,
  }).select('id').single()
  if (error) return err(error.message, 500)
  return ok(data, 201)
}
