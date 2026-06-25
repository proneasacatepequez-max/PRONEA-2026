// src/app/api/instituciones/route.ts
// Las instituciones SON las sedes — no existe tabla "instituciones" separada.
// El enlace_institucional se vincula directamente a una sede (sede_id).
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { data: sedes, error } = await supabaseAdmin
    .from('sedes')
    .select('id, nombre, activo, municipio:municipios(id, nombre)')
    .eq('activo', true)
    .order('nombre')

  if (error) return err(error.message, 500)

  return ok((sedes ?? []).map((sede: any) => ({
    id:        sede.id,
    nombre:    sede.nombre,
    tipo:      'Sede educativa',
    activo:    sede.activo,
    municipio: sede.municipio,
  })))
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.nombre?.trim()) return err('nombre requerido')

  const { data, error } = await supabaseAdmin.from('sedes').insert({
    nombre:       b.nombre.trim(),
    municipio_id: b.municipio_id ? parseInt(b.municipio_id) : null,
    activo:       true,
  }).select('id, nombre').single()

  if (error) return err(error.message, 500)
  return ok({ ...data, tipo: 'Sede educativa' }, 201)
}
