// src/app/api/sedes/asignar-tecnico/route.ts
// CORRECCIÓN: eliminada columna ciclo_escolar que no existe en tecnico_sedes
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { sede_id, tecnico_id, es_principal = false } = await req.json()
  if (!sede_id || !tecnico_id) return err('sede_id y tecnico_id requeridos')

  const { data: sede } = await supabaseAdmin.from('sedes').select('id,nombre').eq('id', sede_id).single()
  if (!sede) return err('Sede no encontrada', 404)

  const { data: tec } = await supabaseAdmin.from('tecnicos').select('id,primer_nombre').eq('id', tecnico_id).single()
  if (!tec) return err('Técnico no encontrado', 404)

  // tecnico_sedes SÍ existe. Columnas reales: id, tecnico_id, sede_id, es_principal, activo, asignado_en
  const { error } = await supabaseAdmin.from('tecnico_sedes').upsert({
    tecnico_id,
    sede_id,
    es_principal,
    activo: true,
    // NO incluir ciclo_escolar — esa columna no existe
  }, { onConflict: 'tecnico_id,sede_id' })

  if (error) return err(error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id:      s.sub,
    accion:          'ASIGNAR_TECNICO_SEDE',
    tabla_afectada:  'tecnico_sedes',
    datos_nuevos:    { tecnico_id, sede_id },
  }).catch(() => {})

  return ok({ ok: true, mensaje: `Técnico asignado a ${sede.nombre}` })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const { tecnico_id, sede_id } = await req.json()
  if (!tecnico_id || !sede_id) return err('tecnico_id y sede_id requeridos')

  const { error } = await supabaseAdmin
    .from('tecnico_sedes')
    .update({ activo: false })
    .eq('tecnico_id', tecnico_id)
    .eq('sede_id', sede_id)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
