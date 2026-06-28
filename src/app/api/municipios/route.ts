// src/app/api/municipios/route.ts
// CORREGIDO: incluye JOIN a departamentos para que el frontend tenga
// toda la info en una sola llamada sin tener que hacer dos fetches
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const departamento_id = req.nextUrl.searchParams.get('departamento_id')
  const todos           = req.nextUrl.searchParams.get('todos') === '1'

  let q = supabaseAdmin
    .from('municipios')
    .select(`
      id, nombre, departamento, departamento_id, codigo_ine,
      departamento_obj:departamentos(id, nombre, codigo_ine)
    `)
    .eq('activo', true)
    .order('nombre')

  // Filtrar por departamento (cuando el usuario elige un depto en el selector)
  if (departamento_id && !todos) {
    q = q.eq('departamento_id', parseInt(departamento_id))
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
