// src/app/api/instituciones/route.ts
// Instituciones = Sedes (son la misma entidad en este sistema)
// El enlace se vincula a una sede/institución
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  // Intentar tabla instituciones primero
  const { data: inst, error: eInst } = await supabaseAdmin
    .from('instituciones')
    .select('id, nombre, tipo, activo, municipio:municipios(id, nombre)')
    .order('nombre')

  if (!eInst && inst) {
    return ok(inst.filter((i: any) => i.activo !== false))
  }

  // Fallback: usar sedes directamente como instituciones
  const { data: sedes, error: eSedes } = await supabaseAdmin
    .from('sedes')
    .select('id, nombre, activo, municipio:municipios(id, nombre)')
    .eq('activo', true)
    .order('nombre')

  if (eSedes) return err(eSedes.message, 500)

  return ok((sedes ?? []).map((s: any) => ({
    id:        s.id,
    nombre:    s.nombre,
    tipo:      'Sede educativa',
    activo:    s.activo,
    municipio: s.municipio,
  })))
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.nombre?.trim()) return err('nombre requerido')

  // Crear sede (que es la institución)
  const { data, error } = await supabaseAdmin.from('sedes').insert({
    nombre:       b.nombre.trim(),
    municipio_id: b.municipio_id ? parseInt(b.municipio_id) : null,
    activo:       true,
  }).select('id, nombre').single()

  if (error) return err(error.message, 500)
  return ok({ ...data, tipo: 'Sede educativa' }, 201)
}
