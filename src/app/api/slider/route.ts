// src/app/api/slider/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
export async function GET() {
  const { data } = await supabaseAdmin.from('slider_imagenes').select('*').eq('activo',true).order('orden')
  return ok(data??[])
}
export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const b = await req.json()
  if(!b.url_imagen) return err('url_imagen requerida')
  const { data, error } = await supabaseAdmin.from('slider_imagenes')
    .insert({ ...b, creado_por:s.sub }).select('id').single()
  if(error) return err(error.message,500)
  return ok(data,201)
}
