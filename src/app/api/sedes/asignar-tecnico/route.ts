// src/app/api/sedes/asignar-tecnico/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { sede_id, tecnico_id } = await req.json()
  if (!sede_id || !tecnico_id) return err('sede_id y tecnico_id requeridos')

  // Verificar que existen
  const { data: sede } = await supabaseAdmin.from('sedes').select('id,nombre').eq('id', sede_id).single()
  if (!sede) return err('Sede no encontrada', 404)

  const { data: tec } = await supabaseAdmin.from('tecnicos').select('id,primer_nombre').eq('id', tecnico_id).single()
  if (!tec) return err('Técnico no encontrado', 404)

  // Intentar insertar en tecnico_sedes si existe esa tabla
  const { error: e1 } = await supabaseAdmin.from('tecnico_sedes').upsert({
    tecnico_id,
    sede_id,
    activo: true,
    ciclo_escolar: 2026,
  }, { onConflict: 'tecnico_id,sede_id' })

  // Si la tabla no existe, actualizar la sede_id en tecnicos directamente
  if (e1?.code === '42P01') {
    const { error: e2 } = await supabaseAdmin.from('tecnicos')
      .update({ sede_id } as any).eq('id', tecnico_id)
    if (e2) return err(e2.message, 500)
  } else if (e1) {
    return err(e1.message, 500)
  }

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub,
    accion: 'ASIGNAR_TECNICO_SEDE',
    tabla_afectada: 'tecnico_sedes',
    datos_nuevos: { tecnico_id, sede_id },
  }).catch(() => {})

  return ok({ ok: true, mensaje: `Técnico asignado a ${sede.nombre}` })
}
