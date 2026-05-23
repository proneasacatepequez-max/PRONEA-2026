// src/app/api/municipios/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const depto = req.nextUrl.searchParams.get('departamento_id')
  let q = supabaseAdmin.from('municipios')
    .select('id,nombre,departamento,departamento_id,codigo_ine')
    .eq('activo', true).order('nombre')
  if (depto) q = q.eq('departamento_id', parseInt(depto))
  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
