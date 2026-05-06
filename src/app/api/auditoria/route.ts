// src/app/api/auditoria/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const p = req.nextUrl.searchParams
  let q = supabaseAdmin.from('auditoria')
    .select('id,accion,tabla_afectada,registro_id,ip_address,creado_en,usuario:usuarios(correo)')
    .order('creado_en', { ascending: false })
    .limit(200)

  if (p.get('accion')) q = q.ilike('accion', `%${p.get('accion')}%`)
  if (p.get('tabla'))  q = q.ilike('tabla_afectada', `%${p.get('tabla')}%`)
  if (p.get('desde'))  q = q.gte('creado_en', p.get('desde') + 'T00:00:00')
  if (p.get('hasta'))  q = q.lte('creado_en', p.get('hasta') + 'T23:59:59')

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
