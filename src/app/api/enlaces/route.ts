// src/app/api/enlaces/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { data, error } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select(`
      id, primer_nombre, primer_apellido, cargo, activo,
      sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre)
    `)
    .eq('activo', true)
    .order('primer_apellido')

  if (error) return ok([])
  return ok(data ?? [])
}
