// src/app/api/mis-tecnicos/route.ts
// FIX: Director ve TODOS los técnicos creados por el admin
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  // Todos los técnicos activos con sus estadísticas
  const { data: tecnicos, error } = await supabaseAdmin
    .from('tecnicos')
    .select(`
      id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      codigo_tecnico, telefono, activo, usuario_id,
      usuario:usuarios(correo, ultimo_acceso)
    `)
    .eq('activo', true)
    .order('primer_apellido')

  if (error) return err(error.message, 500)

  // Para cada técnico, contar estudiantes activos y sedes
  const conEstadisticas = await Promise.all(
    (tecnicos ?? []).map(async (t: any) => {
      const { count: totalEstudiantes } = await supabaseAdmin
        .from('inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('tecnico_id', t.id)
        .eq('ciclo_escolar', 2026)
        .eq('estado', 'en_curso')

      const { data: sedesData } = await supabaseAdmin
        .from('inscripciones')
        .select('sede_id')
        .eq('tecnico_id', t.id)
        .eq('ciclo_escolar', 2026)
        .eq('estado', 'en_curso')

      const sedesUnicas = new Set((sedesData ?? []).map((i: any) => i.sede_id)).size

      return {
        ...t,
        nombre_completo: `${t.primer_nombre} ${t.primer_apellido}`,
        total_estudiantes: totalEstudiantes ?? 0,
        total_sedes: sedesUnicas,
      }
    })
  )

  return ok(conEstadisticas)
}
