// src/app/api/visibilidad/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { data, error } = await supabaseAdmin
    .from('visibilidad_institucion')
    .select(`
      id, visible_para_coordinador, ocultar_enlace, razon_ocultamiento,
      configurado_en, sede:sedes!visibilidad_institucion_sede_id_fkey(id, nombre)
    `)
    .order('configurado_en', { ascending: false })

  if (error) {
    if (error.code === '42P01') return ok([])
    return err(error.message, 500)
  }
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.sede_id) return err('sede_id requerido')

  const { data: existente } = await supabaseAdmin
    .from('visibilidad_institucion')
    .select('id').eq('sede_id', b.sede_id).maybeSingle()

  if (existente) {
    const { error } = await supabaseAdmin.from('visibilidad_institucion').update({
      visible_para_coordinador: Boolean(b.visible_para_coordinador),
      ocultar_enlace:           Boolean(b.ocultar_enlace),
      razon_ocultamiento:       b.razon_ocultamiento || null,
      configurado_por:          s.sub,
      actualizado_en:           new Date().toISOString(),
    }).eq('id', existente.id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, id: existente.id })
  }

  const { data, error } = await supabaseAdmin.from('visibilidad_institucion').insert({
    sede_id:                  b.sede_id,
    visible_para_coordinador: Boolean(b.visible_para_coordinador ?? true),
    ocultar_enlace:           Boolean(b.ocultar_enlace ?? false),
    razon_ocultamiento:       b.razon_ocultamiento || null,
    configurado_por:          s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = { actualizado_en: new Date().toISOString() }
  if (b.visible_para_coordinador !== undefined) upd.visible_para_coordinador = Boolean(b.visible_para_coordinador)
  if (b.ocultar_enlace           !== undefined) upd.ocultar_enlace           = Boolean(b.ocultar_enlace)
  if (b.razon_ocultamiento       !== undefined) upd.razon_ocultamiento       = b.razon_ocultamiento || null

  const { error } = await supabaseAdmin.from('visibilidad_institucion').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
