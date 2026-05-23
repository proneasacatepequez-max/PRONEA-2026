// src/app/api/departamentos/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('departamentos')
    .select('id,codigo_ine,nombre,region,activo')
    .eq('activo', true)
    .order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
