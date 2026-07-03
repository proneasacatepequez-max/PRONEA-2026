// src/app/api/tecnico/sedes/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  // Si es técnico, devuelve sus propias sedes
  // Si es admin/director, puede pedir las de un técnico específico
  const tecnico_id_param = req.nextUrl.searchParams.get('tecnico_id')

  let tecnico_id: string | null = null

  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (!tec) return ok([])
    tecnico_id = tec.id
  } else {
    tecnico_id = tecnico_id_param
    if (!tecnico_id) return err('tecnico_id requerido para este rol', 400)
  }

  const { data, error } = await supabaseAdmin
    .from('tecnico_sedes')
    .select(`
      id, es_principal, activo, asignado_en,
      sede:sedes(
        id, nombre, direccion, telefono, horario,
        municipio:municipios(id, nombre)
      )
    `)
    .eq('tecnico_id', tecnico_id)
    .eq('activo', true)
    .order('es_principal', { ascending: false })

  if (error) return err(error.message, 500)

  // Enriquecer con conteo de estudiantes por sede
  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  const sedesConConteo = await Promise.all(
    (data ?? []).map(async (ts: any) => {
      // CORREGIDO: contar por sede_id (no por tecnico_id)
      // porque el técnico ahora ve todos los estudiantes de sus sedes
      const { count } = await supabaseAdmin
        .from('inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', ts.sede?.id)
        .eq('ciclo_escolar', ciclo)
        .eq('estado', 'en_curso')

      return {
        ...ts.sede,
        es_principal:      ts.es_principal,
        asignado_en:       ts.asignado_en,
        total_estudiantes: count ?? 0,
      }
    })
  )

  return ok(sedesConConteo)
}
