// src/app/api/discapacidades/route.ts
// CORRECCIÓN: tabla correcta es tipos_discapacidad (no 'discapacidades')
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tipos_discapacidad')
    .select('id, nombre, codigo, descripcion, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
