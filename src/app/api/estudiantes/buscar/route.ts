// src/app/api/estudiantes/buscar/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const p = req.nextUrl.searchParams
  const cui=p.get('cui')?.replace(/[\s-]/g,''), codigo=p.get('codigo'), nombre=p.get('nombre')
  if(!cui&&!codigo&&!nombre) return err('Envía cui, codigo o nombre')

  let q = supabaseAdmin.from('estudiantes')
    .select(`id,codigo_estudiante,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,
      cui,cui_pendiente,telefono,correo,discapacidad_id,activo,
      discapacidad:tipos_discapacidad(nombre),
      inscripciones(id,ciclo_escolar,estado,version_libro,etapa:etapas(nombre),sede:sedes(nombre))
    `).limit(5)

  if(cui) q=q.eq('cui',cui)
  else if(codigo) q=q.ilike('codigo_estudiante',`%${codigo}%`)
  else if(nombre) {
    const pts=nombre.trim().split(' ')
    if(pts.length>=2) q=q.ilike('primer_apellido',`%${pts[pts.length-1]}%`).ilike('primer_nombre',`%${pts[0]}%`)
    else q=q.or(`primer_nombre.ilike.%${nombre}%,primer_apellido.ilike.%${nombre}%`)
  }

  const { data, error } = await q
  if(error) return err(error.message,500)
  return ok({ encontrado:(data??[]).length>0, estudiantes:data??[], total:(data??[]).length })
}
