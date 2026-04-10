// src/app/api/permisos/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const { data, error } = await supabaseAdmin.from('v_panel_permisos_admin').select('*')
  if(error) return err(error.message,500)
  return ok(data??[])
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  if(s.rol!=='administrador') return err('Solo administrador',403)
  const { permiso, activo } = await req.json()
  if(!permiso || typeof activo!=='boolean') return err('permiso y activo requeridos')
  const { error } = await supabaseAdmin.from('permisos_globales')
    .update({ activo, actualizado_por:s.sub }).eq('permiso', permiso)
  if(error) return err(error.message,500)
  return ok({ ok:true, permiso, activo })
}
