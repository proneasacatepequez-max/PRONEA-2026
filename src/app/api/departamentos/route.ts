// src/app/api/departamentos/route.ts
// CORREGIDO: permite resolver departamento desde municipio_id
// Útil para pre-cargar el selector al editar un perfil existente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const municipio_id = req.nextUrl.searchParams.get('municipio_id')

  // Si viene municipio_id → devuelve el departamento de ese municipio
  // El frontend lo usa para pre-seleccionar el depto al cargar un perfil
  if (municipio_id) {
    const { data, error } = await supabaseAdmin
      .from('municipios')
      .select('id, nombre, departamento_id, departamento:departamentos(id, nombre, codigo_ine)')
      .eq('id', parseInt(municipio_id))
      .single()
    if (error) return err(error.message, 500)
    return ok(data)
  }

  // Sin parámetros → devuelve todos los departamentos
  const { data, error } = await supabaseAdmin
    .from('departamentos')
    .select('id, codigo_ine, nombre, region, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
