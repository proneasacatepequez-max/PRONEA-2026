// src/app/api/firmantes-constancias/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const soloActivos = req.nextUrl.searchParams.get('activos') === '1'
  let q = supabaseAdmin.from('firmantes_constancias').select('*')
  if (soloActivos) q = q.eq('activo', true)

  const { data, error } = await q.order('es_predeterminado', { ascending: false }).order('nombre_completo')
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.nombre_completo?.trim() || !b.cargo?.trim()) return err('nombre_completo y cargo son requeridos', 400)

  // Si se marca como predeterminado, quitar la marca a los demás
  if (b.es_predeterminado) {
    await supabaseAdmin.from('firmantes_constancias').update({ es_predeterminado: false }).eq('es_predeterminado', true)
  }

  const { data, error } = await supabaseAdmin.from('firmantes_constancias').insert({
    nombre_completo: b.nombre_completo.trim(),
    cargo: b.cargo.trim(),
    dependencia: b.dependencia?.trim() || null,
    departamento_id: b.departamento_id || null,
    sede_id: b.sede_id || null,
    vigente_desde: b.vigente_desde || new Date().toISOString().slice(0, 10),
    vigente_hasta: b.vigente_hasta || null,
    es_predeterminado: !!b.es_predeterminado,
    creado_por: s.sub,
  }).select().single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, firmante: data })
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido', 400)

  if (b.es_predeterminado) {
    await supabaseAdmin.from('firmantes_constancias').update({ es_predeterminado: false }).eq('es_predeterminado', true)
  }

  const campos = ['nombre_completo', 'cargo', 'dependencia', 'departamento_id', 'sede_id', 'vigente_desde', 'vigente_hasta', 'es_predeterminado', 'activo']
  const upd: any = { actualizado_en: new Date().toISOString() }
  for (const c of campos) if (b[c] !== undefined) upd[c] = b[c]

  const { error } = await supabaseAdmin.from('firmantes_constancias').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
