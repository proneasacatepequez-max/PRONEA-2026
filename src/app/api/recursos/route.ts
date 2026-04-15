// src/app/api/recursos/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const p = req.nextUrl.searchParams
  let q = supabaseAdmin.from('recursos_apoyo')
    .select(`id,titulo,descripcion,url,tipo_contenido,duracion_minutos,destacado,orden,es_publico,
      categoria:categorias_recurso(nombre,icono,color), etapa:etapas(nombre,nivel), area:areas(nombre)`)
    .eq('activo',true).order('destacado',{ascending:false}).order('orden')
  if(p.get('etapa_id')) q=q.eq('etapa_id',parseInt(p.get('etapa_id')!))
  if(p.get('area_id'))  q=q.eq('area_id',parseInt(p.get('area_id')!))
  if(s.rol==='estudiante') q=q.eq('es_publico',true)
  const { data, error } = await q
  if(error) return err(error.message,500)
  return ok(data??[])
}
export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(!['administrador','tecnico'].includes(s.rol)) return err('Sin permiso',403)
  const b = await req.json()
  if(!b.titulo||!b.url) return err('titulo y url requeridos')
  const { data, error } = await supabaseAdmin.from('recursos_apoyo').insert({ ...b, creado_por:s.sub }).select('id').single()
  if(error) return err(error.message,500)
  return ok(data,201)
}
