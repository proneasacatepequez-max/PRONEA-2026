// src/app/api/autorizaciones/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(!['administrador','director','enlace_institucional'].includes(s.rol)) return err('Sin acceso',403)

  if(s.rol==='director') {
    const { data:dir } = await supabaseAdmin.from('directores').select('id').eq('usuario_id',s.sub).single()
    if(!dir) return err('Director no encontrado',404)
    const { data } = await supabaseAdmin.from('autorizaciones_director')
      .select(`id,permiso,activo,fecha_inicio,fecha_fin,autorizado_por_admin,observaciones,creado_en,
        enlace:enlaces_institucionales(id,primer_nombre,primer_apellido,cargo,institucion:instituciones(nombre))`)
      .eq('director_id', dir.id).order('creado_en',{ascending:false})
    return ok(data??[])
  }
  if(s.rol==='enlace_institucional') {
    const { data:en } = await supabaseAdmin.from('enlaces_institucionales').select('id').eq('usuario_id',s.sub).single()
    if(!en) return err('Enlace no encontrado',404)
    const { data } = await supabaseAdmin.from('v_permisos_enlace').select('*').eq('enlace_id',en.id)
    return ok(data??[])
  }
  // admin: todo
  const { data } = await supabaseAdmin.from('v_panel_permisos_admin').select('*')
  return ok(data??[])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(!['administrador','director'].includes(s.rol)) return err('Solo director o admin',403)
  const body = await req.json()
  const { enlace_id, permiso, fecha_inicio, fecha_fin, observaciones } = body
  if(!enlace_id||!permiso) return err('enlace_id y permiso requeridos')

  const { data:pg } = await supabaseAdmin.from('permisos_globales').select('activo').eq('permiso',permiso).single()
  if(!pg) return err(`Permiso "${permiso}" no existe`,400)
  if(!pg.activo) return err(`Permiso "${permiso}" está desactivado globalmente. El administrador debe activarlo primero.`,400)

  let director_id: string
  if(s.rol==='director') {
    const { data:dir } = await supabaseAdmin.from('directores').select('id').eq('usuario_id',s.sub).single()
    if(!dir) return err('Director no encontrado',404)
    director_id = dir.id
  } else {
    if(!body.director_id) return err('director_id requerido',400)
    director_id = body.director_id
  }

  const { data, error } = await supabaseAdmin.from('autorizaciones_director').insert({
    director_id, enlace_id, permiso, activo:true,
    fecha_inicio: fecha_inicio ?? new Date().toISOString().split('T')[0],
    fecha_fin: fecha_fin ?? null, observaciones: observaciones ?? null,
    autorizado_por_admin: s.rol==='administrador' ? s.sub : null,
    admin_confirmado_en:  s.rol==='administrador' ? new Date().toISOString() : null,
  }).select('id').single()

  if(error) return err(error.message,500)
  return ok({ ok:true, id:data.id }, 201)
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const { id, accion } = await req.json()
  if(!id||!accion) return err('id y accion requeridos')

  if(accion==='confirmar') {
    if(s.rol!=='administrador') return err('Solo admin puede confirmar',403)
    const { error } = await supabaseAdmin.from('autorizaciones_director')
      .update({ autorizado_por_admin:s.sub, admin_confirmado_en:new Date().toISOString() }).eq('id',id)
    if(error) return err(error.message,500)
    return ok({ ok:true, accion:'confirmada' })
  }
  if(accion==='revocar') {
    if(!['administrador','director'].includes(s.rol)) return err('Sin permiso para revocar',403)
    const { error } = await supabaseAdmin.from('autorizaciones_director').update({ activo:false }).eq('id',id)
    if(error) return err(error.message,500)
    return ok({ ok:true, accion:'revocada' })
  }
  return err('accion debe ser confirmar o revocar')
}
