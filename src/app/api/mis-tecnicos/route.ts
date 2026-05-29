// src/app/api/mis-tecnicos/route.ts
// CORRECCIÓN: El director solo ve técnicos de su sede
// También incluye los enlaces vinculados a cada técnico
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador', 'coordinador_digeex'].includes(s.rol))
    return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  let tecnicoIds: string[] | null = null

  // Director: filtrar por técnicos de su sede
  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (dir?.sede_id) {
      const { data: ts } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('tecnico_id')
        .eq('sede_id', dir.sede_id)
        .eq('activo', true)
      tecnicoIds = (ts ?? []).map((t: any) => t.tecnico_id)
    }
  }

  // Construir query de técnicos
  let q = supabaseAdmin
    .from('tecnicos')
    .select(`
      id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      codigo_tecnico, telefono, especialidad, activo, creado_en,
      usuario:usuarios!tecnicos_usuario_id_fkey(id, correo, ultimo_acceso, activo)
    `)
    .eq('activo', true)
    .order('primer_apellido')

  if (tecnicoIds !== null) {
    if (tecnicoIds.length === 0) return ok([])  // Director sin técnicos asignados
    q = q.in('id', tecnicoIds)
  }

  const { data: tecnicos, error } = await q
  if (error) return err(error.message, 500)

  // Para cada técnico: inscripciones activas + sedes + enlaces vinculados
  const conEstadisticas = await Promise.all(
    (tecnicos ?? []).map(async (t: any) => {
      const [
        { count: totalEst },
        { data: sedesData },
        { data: enlacesData },
      ] = await Promise.all([
        supabaseAdmin
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('tecnico_id', t.id)
          .eq('ciclo_escolar', ciclo)
          .eq('estado', 'en_curso'),
        supabaseAdmin
          .from('tecnico_sedes')
          .select('sede:sedes(id, nombre)')
          .eq('tecnico_id', t.id)
          .eq('activo', true),
        supabaseAdmin
          .from('tecnico_enlaces')
          .select(`
            enlace:enlaces_institucionales(
              id, primer_nombre, primer_apellido, cargo,
              institucion:instituciones(nombre)
            )
          `)
          .eq('tecnico_id', t.id)
          .eq('ciclo_escolar', ciclo)
          .eq('activo', true),
      ])

      return {
        ...t,
        nombre_completo:    `${t.primer_nombre} ${t.primer_apellido}`,
        total_estudiantes:  totalEst ?? 0,
        sedes:              (sedesData ?? []).map((s: any) => s.sede).filter(Boolean),
        total_sedes:        (sedesData ?? []).length,
        enlaces:            (enlacesData ?? []).map((e: any) => e.enlace).filter(Boolean),
        total_enlaces:      (enlacesData ?? []).length,
      }
    })
  )

  return ok(conEstadisticas)
}

