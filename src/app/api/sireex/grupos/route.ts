// src/app/api/sireex/grupos/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const p = req.nextUrl.searchParams
  const ciclo=p.get('ciclo')??"2026", estado=p.get('estado')
  let q = supabaseAdmin.from('grupos_sireex')
    .select(`id,codigo,nombre,estado,ciclo_escolar,fecha_apertura,fecha_cierre,observaciones,
      tecnico:tecnicos(id,primer_nombre,primer_apellido,codigo_tecnico),
      etapa:etapas(id,nombre,codigo), sede:sedes(id,nombre)
    `).eq('ciclo_escolar',parseInt(ciclo)).order('creado_en',{ascending:false})

  if(s.rol==='tecnico') {
    const { data:tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id',s.sub).single()
    if(tec) q=q.eq('tecnico_id',tec.id)
  }
  if(estado) q=q.eq('estado',estado)
  const { data, error } = await q
  if(error) return err(error.message,500)

  const grupos = await Promise.all((data??[]).map(async (g:any) => {
    const { count } = await supabaseAdmin.from('inscripcion_grupo_sireex').select('*',{count:'exact',head:true}).eq('grupo_sireex_id',g.id)
    return { ...g, _count:{ estudiantes:count??0 } }
  }))
  return ok(grupos)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(!['tecnico','administrador','director'].includes(s.rol)) return err('Sin permiso',403)
  const b = await req.json()
  if(!b.etapa_id||!b.sede_id||!b.ciclo_escolar) return err('etapa_id, sede_id, ciclo_escolar requeridos')
  if(!b.codigo) {
    const { count } = await supabaseAdmin.from('grupos_sireex').select('*',{count:'exact',head:true}).eq('ciclo_escolar',b.ciclo_escolar)
    b.codigo = `SIREEX-${b.ciclo_escolar}-${String((count??0)+1).padStart(3,'0')}`
  }
  const { data:tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id',s.sub).single()
  const { data, error } = await supabaseAdmin.from('grupos_sireex').insert({
    codigo:b.codigo, nombre:b.nombre??null,
    tecnico_id:b.tecnico_id??(tec?.id??s.sub), etapa_id:b.etapa_id,
    sede_id:b.sede_id, ciclo_escolar:b.ciclo_escolar, estado:'abierto',
    observaciones:b.observaciones??null, creado_por:s.sub,
  }).select('id,codigo').single()
  if(error) return err(error.message,500)
  await supabaseAdmin.from('grupos_sireex_historial').insert({ grupo_sireex_id:data.id, accion:'CREADO', usuario_id:s.sub, detalle:`Grupo creado: ${data.codigo}` })
  return ok(data,201)
}
