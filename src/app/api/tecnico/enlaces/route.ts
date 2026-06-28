// src/app/api/tecnico/enlaces/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  const tecnico_id_param = req.nextUrl.searchParams.get('tecnico_id')
  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

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

  // Obtener enlaces vinculados al técnico en el ciclo
  const { data, error } = await supabaseAdmin
    .from('tecnico_enlaces')
    .select(`
      id, ciclo_escolar, activo, asignado_en,
      enlace:enlaces_institucionales(
        id, primer_nombre, segundo_nombre, primer_apellido,
        segundo_apellido, cargo, telefono, activo,
        usuario:usuarios!enlaces_institucionales_usuario_id_fkey(
          correo, ultimo_acceso
        ),
        sede:sedes!enlaces_institucionales_sede_id_fkey(
          id, nombre, municipio:municipios(nombre)
        )
      )
    `)
    .eq('tecnico_id', tecnico_id)
    .eq('ciclo_escolar', ciclo)
    .eq('activo', true)

  if (error) return err(error.message, 500)

  // Enriquecer con conteo de estudiantes por enlace (en su sede)
  const enlacesConConteo = await Promise.all(
    (data ?? []).map(async (te: any) => {
      const enl = te.enlace
      if (!enl) return null

      const { count } = await supabaseAdmin
        .from('inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', enl.sede?.id)
        .eq('tecnico_id', tecnico_id!)
        .eq('ciclo_escolar', ciclo)
        .eq('estado', 'en_curso')

      return {
        id:              enl.id,
        nombre_completo: `${enl.primer_nombre} ${enl.primer_apellido}`.trim(),
        primer_nombre:   enl.primer_nombre,
        primer_apellido: enl.primer_apellido,
        cargo:           enl.cargo,
        telefono:        enl.telefono,
        activo:          enl.activo,
        correo:          enl.usuario?.correo,
        ultimo_acceso:   enl.usuario?.ultimo_acceso,
        sede:            enl.sede,
        total_estudiantes: count ?? 0,
        asignado_en:     te.asignado_en,
      }
    })
  )

  return ok(enlacesConConteo.filter(Boolean))
}
