// src/app/api/municipios/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('municipios')
    .select('id,nombre,departamento')
    .order('departamento').order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
