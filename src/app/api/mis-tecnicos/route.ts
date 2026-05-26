// src/app/api/mis-tecnicos/route.ts
// FIX: Director ve TODOS los técnicos — no filtra por sede_id (puede ser NULL)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador', 'coordinador_digeex'].includes(s.rol))
    return err('Sin permiso', 403)

  // Obtener todos los técnicos activos con estadísticas
  const { data: tecnicos, error } = await supabaseAdmin
    .from('tecnicos')
    .select(`
      id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      codigo_tecnico, telefono, especialidad, activo, creado_en,
      usuario:usuarios(id, correo, ultimo_acceso, activo)
    `)
    .eq('activo', true)
    .order('primer_apellido')

  if (error) return err(error.message, 500)

  // Contar inscripciones activas y sedes por cada técnico
  const conEstadisticas = await Promise.all(
    (tecnicos ?? []).map(async (t: any) => {
      const [{ count: totalEst }, { data: sedesData }] = await Promise.all([
        supabaseAdmin.from('inscripciones').select('*', { count: 'exact', head: true })
          .eq('tecnico_id', t.id).eq('ciclo_escolar', 2026).eq('estado', 'en_curso'),
        supabaseAdmin.from('inscripciones').select('sede_id')
          .eq('tecnico_id', t.id).eq('ciclo_escolar', 2026).eq('estado', 'en_curso'),
      ])
      const sedesUnicas = new Set((sedesData ?? []).map((i: any) => i.sede_id)).size
      return {
        ...t,
        nombre_completo: `${t.primer_nombre} ${t.primer_apellido}`,
        total_estudiantes: totalEst ?? 0,
        total_sedes: sedesUnicas,
      }
    })
  )

  return ok(conEstadisticas)
}
