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

  // CORREGIDO: coordinador_digeex ve técnicos de SU departamento — ahora
  // considerando TAMBIÉN las sedes donde trabajan (tecnico_sedes → sedes.
  // departamento_id), no solo el campo individual tecnicos.departamento_id
  // que en la práctica no está poblado para la mayoría de técnicos.
  if (s.rol === 'coordinador_digeex') {
    const { data: coord } = await supabaseAdmin
      .from('coordinadores_departamento')
      .select('departamento_id')
      .eq('usuario_id', s.sub)
      .single()

    if (coord?.departamento_id) {
      const { data: sedesDepto } = await supabaseAdmin
        .from('sedes').select('id').eq('departamento_id', coord.departamento_id)
      const sedeIds = (sedesDepto ?? []).map((s: any) => s.id)

      let idsPorSede: string[] = []
      if (sedeIds.length > 0) {
        const { data: tsDepto } = await supabaseAdmin
          .from('tecnico_sedes').select('tecnico_id')
          .in('sede_id', sedeIds).eq('activo', true)
        idsPorSede = (tsDepto ?? []).map((t: any) => t.tecnico_id)
      }

      if (idsPorSede.length > 0) {
        qTec = qTec.or(`departamento_id.eq.${coord.departamento_id},id.in.(${idsPorSede.join(',')})`)
      } else {
        qTec = qTec.eq('departamento_id', coord.departamento_id)
      }
      qTec = qTec.eq('activo', true)
    } else {
      // Sin departamento configurado → no ve ningún técnico (evita fuga de datos)
      return ok([])
    }
  }

  const { data: tecnicos, error } = await qTec
  if (error) return err(error.message, 500)

  const conEstadisticas = await Promise.all(
    (tecnicos ?? []).map(async (t: any) => {
      const [
        { data: sedesData },
        { data: enlacesData },
      ] = await Promise.all([
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

      // CORREGIDO: el conteo de estudiantes ahora incluye TAMBIÉN los que
      // inscribieron los enlaces de este técnico (por sede), no solo los
      // que él mismo registró directamente — igual que /api/inscripciones.
      const { data: enlacesDirectos } = await supabaseAdmin
        .from('enlaces_institucionales').select('sede_id').eq('tecnico_id', t.id).eq('activo', true)

      const sedeIdsPropias  = (sedesData ?? []).map((s: any) => s.sede?.id).filter(Boolean)
      const sedeIdsEnlaces  = [
        ...(enlacesData ?? []).map((e: any) => e.enlace?.sede?.id).filter(Boolean),
        ...(enlacesDirectos ?? []).map((e: any) => e.sede_id).filter(Boolean),
      ]
      const todasSedeIds = [...new Set([...sedeIdsPropias, ...sedeIdsEnlaces])]

      let totalEst = 0
      if (todasSedeIds.length > 0) {
        const { count } = await supabaseAdmin
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .or(`tecnico_id.eq.${t.id},sede_id.in.(${todasSedeIds.join(',')})`)
          .eq('ciclo_escolar', ciclo)
          .eq('estado', 'en_curso')
        totalEst = count ?? 0
      } else {
        const { count } = await supabaseAdmin
          .from('inscripciones')
          .select('*', { count: 'exact', head: true })
          .eq('tecnico_id', t.id)
          .eq('ciclo_escolar', ciclo)
          .eq('estado', 'en_curso')
        totalEst = count ?? 0
      }

      return {
        ...t,
        nombre_completo:   `${t.primer_nombre} ${t.primer_apellido}`,
        total_estudiantes: totalEst,
        sedes:             (sedesData ?? []).map((s: any) => s.sede).filter(Boolean),
        total_sedes:       (sedesData ?? []).length,
        enlaces:           (enlacesData ?? []).map((e: any) => e.enlace).filter(Boolean),
        total_enlaces:     (enlacesData ?? []).length,
      }
    })
  )

  return ok(conEstadisticas)
}
