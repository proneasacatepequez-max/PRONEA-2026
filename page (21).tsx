// src/app/api/establecimiento/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
export async function GET() {
  const { data } = await supabaseAdmin.from('info_establecimiento').select('*').eq('id',1).single()
  return ok(data??{})
}
export async function PUT(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const b = await req.json()
  const { error } = await supabaseAdmin.from('info_establecimiento')
    .update({ ...b, actualizado_por:s.sub, actualizado_en:new Date().toISOString() }).eq('id',1)
  if(error) return err(error.message,500)
  return ok({ ok:true })
}
