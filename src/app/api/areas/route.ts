// src/app/api/areas/route.ts — NUEVA RUTA
// Devuelve el catálogo de áreas para formularios
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('areas')
    .select('id, codigo, nombre, descripcion, activo')
    .eq('activo', true)
    .order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
