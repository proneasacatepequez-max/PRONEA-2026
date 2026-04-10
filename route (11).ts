// src/app/api/visibilidad/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const { data } = await supabaseAdmin.from('visibilidad_institucion')
    .select('*,institucion:instituciones(id,nombre,tipo)').order('configurado_en',{ascending:false})
  return ok(data??[])
}
export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const { institucion_id, visible_para_coordinador, ocultar_enlace, razon_ocultamiento } = await req.json()
  if(!institucion_id) return err('institucion_id requerido')
  const { data, error } = await supabaseAdmin.from('visibilidad_institucion')
    .upsert({ institucion_id, visible_para_coordinador:visible_para_coordinador??true, ocultar_enlace:ocultar_enlace??false, razon_ocultamiento:razon_ocultamiento??null, configurado_por:s.sub },{ onConflict:'institucion_id' }).select('id').single()
  if(error) return err(error.message,500)
  return ok({ ok:true, id:data.id })
}
