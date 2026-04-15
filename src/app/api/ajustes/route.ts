// src/app/api/ajustes/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const { inscripcion_id } = Object.fromEntries(req.nextUrl.searchParams)
  if(!inscripcion_id) return err('inscripcion_id requerido')
  const { data, error } = await supabaseAdmin.from('ajustes_discapacidad')
    .select(`id,descripcion_ajuste,tareas_total_ajustado,puntos_max_ajustado,porcentaje_examen_ajustado,activo,creado_en,
      tipo_ajuste:tipos_ajuste_discapacidad(nombre,descripcion), area:areas(nombre), libro:libros(nombre,version)`)
    .eq('inscripcion_id',inscripcion_id).order('creado_en',{ascending:false})
  if(error) return err(error.message,500)
  return ok(data??[])
}
export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(!['tecnico','administrador'].includes(s.rol)) return err('Sin permiso',403)
  const b = await req.json()
  if(!b.inscripcion_id||!b.descripcion_ajuste) return err('inscripcion_id y descripcion_ajuste requeridos')
  const { data, error } = await supabaseAdmin.from('ajustes_discapacidad').insert({ ...b, creado_por:s.sub }).select('id').single()
  if(error) return err(error.message,500)
  return ok(data,201)
}
