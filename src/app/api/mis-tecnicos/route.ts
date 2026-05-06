// src/app/api/mis-tecnicos/route.ts
// Técnicos asignados a la sede del director
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  let sede_id: string | null = null

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin.from('directores')
      .select('sede_id').eq('usuario_id', s.sub).single()
    sede_id = dir?.sede_id ?? null
  }

  let q = supabaseAdmin.from('tecnicos')
    .select(`id,primer_nombre,primer_apellido,codigo_tecnico,telefono,activo,
      _count:inscripciones(count)`)
    .eq('activo', true)

  if (sede_id) {
    // Técnicos que tienen inscripciones en esta sede
    const { data: tIds } = await supabaseAdmin.from('inscripciones')
      .select('tecnico_id').eq('sede_id', sede_id).eq('ciclo_escolar', 2026)
    const ids = [...new Set((tIds ?? []).map((i: any) => i.tecnico_id))]
    if (ids.length > 0) q = q.in('id', ids)
  }

  const { data, error } = await q.order('primer_apellido')
  if (error) return err(error.message, 500)

  // Contar estudiantes activos por técnico
  const result = await Promise.all((data ?? []).map(async (t: any) => {
    const { count } = await supabaseAdmin.from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', t.id).eq('ciclo_escolar', 2026).eq('estado', 'en_curso')
    return { ...t, total_estudiantes: count ?? 0 }
  }))

  return ok(result)
}
