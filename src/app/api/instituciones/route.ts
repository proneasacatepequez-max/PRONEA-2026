// src/app/api/instituciones/route.ts — NUEVA RUTA
// Devuelve catálogo de instituciones para el formulario de enlace
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  // Instituciones son esencialmente las sedes con nombre de institución
  // En este sistema, si no hay tabla instituciones separada,
  // usamos las sedes como instituciones
  const { data: instData, error: eInst } = await supabaseAdmin
    .from('instituciones')
    .select('id, nombre, tipo, activo, municipio:municipios(nombre)')
    .order('nombre')

  if (!eInst && instData) {
    return ok(instData.filter((i: any) => i.activo !== false))
  }

  // Fallback: si no existe tabla instituciones, usar sedes como instituciones
  const { data: sedes, error: eSedes } = await supabaseAdmin
    .from('sedes')
    .select('id, nombre, municipio:municipios(nombre)')
    .eq('activo', true)
    .order('nombre')

  if (eSedes) return err(eSedes.message, 500)

  // Mapear sedes como instituciones
  const instituciones = (sedes ?? []).map((s: any) => ({
    id:     s.id,
    nombre: s.nombre,
    tipo:   'Sede educativa',
    municipio: s.municipio,
  }))

  return ok(instituciones)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.nombre?.trim()) return err('nombre requerido')

  // Intentar insertar en tabla instituciones
  const { data, error } = await supabaseAdmin.from('instituciones').insert({
    nombre:      b.nombre.trim(),
    tipo:        b.tipo       || null,
    municipio_id: b.municipio_id ? parseInt(b.municipio_id) : null,
    activo:      true,
  }).select('id').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
