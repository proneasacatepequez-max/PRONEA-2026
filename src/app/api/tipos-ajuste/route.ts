// src/app/api/tipos-ajuste/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('tipos_ajuste_discapacidad')
    .select('id, nombre, descripcion, activo')
    .order('nombre')
  if (error) return ok([]) // tabla puede no existir aún
  return ok(data ?? [])
}
