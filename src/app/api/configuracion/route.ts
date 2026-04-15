// src/app/api/configuracion/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const { data } = await supabaseAdmin.from('configuracion').select('parametro,valor,descripcion').order('parametro')
  const config = Object.fromEntries((data??[]).map((c:any)=>[c.parametro,c.valor]))
  return ok({ raw:data??[], config })
}
export async function PUT(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const { parametro, valor } = await req.json()
  if(!parametro||valor===undefined) return err('parametro y valor requeridos')
  const { error } = await supabaseAdmin.from('configuracion')
    .update({ valor:String(valor), actualizado_en:new Date().toISOString(), actualizado_por:s.sub }).eq('parametro',parametro)
  if(error) return err(error.message,500)
  return ok({ ok:true })
}
