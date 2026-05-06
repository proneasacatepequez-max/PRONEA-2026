// src/app/api/etapas/route.ts
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('etapas')
    .select('id,nombre,codigo,nivel,activo')
    .eq('activo', true)
    .order('nivel').order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
