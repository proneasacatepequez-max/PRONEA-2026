// src/app/api/mis-tecnicos/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador', 'coordinador_digeex'].includes(s.rol))
    return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  let qTec = supabaseAdmin
    .from('tecnicos')
    .select(`
      id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      codigo_tecnico, telefono, especialidad, activo, creado_en,
      usuario:usuarios!tecnicos_usuario_id_fkey(id, correo, ultimo_acceso, activo)
    `)
    .order('primer_apellido')

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('sede_id').eq('usuario_id', s.sub).single()

    if (dir?.sede_id) {
      const { data: ts } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('tecnico_id')
        .eq('sede_id', dir.sede_id)
        .eq('activo', true)

      const ids = (ts ?? []).map((t: any) => t.tecnico_id)
      if (ids.length === 0) {
        qTec = qTec.eq('activo', true)
      } else {
        qTec = qTec.in('id', ids)
      }
    } else {
      qTec = qTec.eq('activo', true)
    }
  }

  const { data: tecnicos, error } = await qTec
  if (error) return err(error.message, 500)

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
          .select('es_principal, activo, sede:sedes(id, nombre, municipio:municipios(nombre))')
          .eq('tecnico_id', t.id)
          .eq('activo', true),
        supabaseAdmin
          .from('tecnico_enlaces')
          .select(`
            enlace:enlaces_institucionales(
              id, primer_nombre, primer_apellido, cargo,
              sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre)
            )
          `)
          .eq('tecnico_id', t.id)
          .eq('ciclo_escolar', ciclo)
          .eq('activo', true),
      ])

      return {
        ...t,
        nombre_completo:   `${t.primer_nombre} ${t.primer_apellido}`,
        total_estudiantes: totalEst ?? 0,
        sedes:             (sedesData ?? []).map((s: any) => s.sede).filter(Boolean),
        total_sedes:       (sedesData ?? []).length,
        enlaces:           (enlacesData ?? []).map((e: any) => e.enlace).filter(Boolean),
        total_enlaces:     (enlacesData ?? []).length,
      }
    })
  )

  return ok(conEstadisticas)
}
