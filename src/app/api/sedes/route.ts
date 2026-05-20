// src/app/api/sedes/route.ts — campos país/departamento/enlace
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin.from('sedes')
    .select('id,nombre,direccion,telefono,horario,activo,pais,departamento,municipio,municipio_id,enlace_id,municipio_rel:municipios(id,nombre),enlace:enlaces_institucionales(id,primer_nombre,primer_apellido,cargo)')
    .order('nombre')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  const nombre = (b.nombre_institucion ?? b.nombre ?? '').trim()
  if (!nombre) return err('nombre requerido')
  const { data, error } = await supabaseAdmin.from('sedes').insert({
    nombre, direccion: b.direccion ?? null, telefono: b.telefono ?? null,
    horario: b.horario ?? null, municipio_id: b.municipio_id ?? null,
    pais: b.pais ?? 'Guatemala', departamento: b.departamento ?? null,
    municipio: b.municipio ?? null, enlace_id: b.enlace_id ?? null, activo: true,
  }).select('id').single()
  if (error) return err(error.message, 500)
  try { await supabaseAdmin.from('visibilidad_coordinador').insert({ sede_id: data.id, visible_para_coordinador: true, ocultar_enlace: false }) } catch { }
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({})); if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.nombre_institucion !== undefined) upd.nombre = b.nombre_institucion.trim()
  if (b.nombre   !== undefined) upd.nombre       = b.nombre.trim()
  if (b.activo   !== undefined) upd.activo       = b.activo
  if (b.enlace_id !== undefined) upd.enlace_id   = b.enlace_id
  if (b.pais     !== undefined) upd.pais         = b.pais
  if (b.departamento !== undefined) upd.departamento = b.departamento
  if (b.municipio !== undefined) upd.municipio   = b.municipio
  if (b.municipio_id !== undefined) upd.municipio_id = b.municipio_id
  const { error } = await supabaseAdmin.from('sedes').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req); if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const id = req.nextUrl.searchParams.get('id'); if (!id) return err('id requerido')
  const { error } = await supabaseAdmin.from('sedes').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

