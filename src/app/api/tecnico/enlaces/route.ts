// src/app/api/tecnico/enlaces/route.ts
// CORREGIDO: busca enlaces en AMBAS fuentes:
// 1. tecnico_enlaces (tabla de vinculación por ciclo)
// 2. enlaces_institucionales.tecnico_id (asignación directa desde admin/director)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

const SELECT_ENLACE = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  cargo, telefono, activo, sede_id, tecnico_id,
  usuario:usuarios!enlaces_institucionales_usuario_id_fkey(
    correo, ultimo_acceso
  ),
  sede:sedes!enlaces_institucionales_sede_id_fkey(
    id, nombre, municipio:municipios(nombre)
  )
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director', 'coordinador_digeex'].includes(s.rol))
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

  // ── FUENTE 1: tecnico_enlaces (vinculación por ciclo) ──────────────────
  const { data: vinculos } = await supabaseAdmin
    .from('tecnico_enlaces')
    .select(`enlace_id, ciclo_escolar, asignado_en`)
    .eq('tecnico_id', tecnico_id)
    .eq('ciclo_escolar', ciclo)
    .eq('activo', true)

  const idsViaVinculos = (vinculos ?? []).map((v: any) => v.enlace_id)

  // ── FUENTE 2: enlaces_institucionales.tecnico_id (asignación directa) ──
  const { data: enlacesDirec } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select(SELECT_ENLACE)
    .eq('tecnico_id', tecnico_id)
    .eq('activo', true)

  const idsDirec = (enlacesDirec ?? []).map((e: any) => e.id)

  // ── Combinar IDs únicos de ambas fuentes ────────────────────────────────
  const todosIds = [...new Set([...idsViaVinculos, ...idsDirec])]

  if (todosIds.length === 0) return ok([])

  // Cargar todos los enlaces encontrados
  const { data: todosEnlaces, error } = await supabaseAdmin
    .from('enlaces_institucionales')
    .select(SELECT_ENLACE)
    .in('id', todosIds)
    .order('primer_apellido')

  if (error) return err(error.message, 500)

  // Enriquecer con conteo de estudiantes
  const result = await Promise.all(
    (todosEnlaces ?? []).map(async (enl: any) => {
      const { count } = await supabaseAdmin
        .from('inscripciones')
        .select('*', { count: 'exact', head: true })
        .eq('sede_id', enl.sede?.id ?? enl.sede_id)
        .eq('ciclo_escolar', ciclo)
        .eq('estado', 'en_curso')

      return {
        id:               enl.id,
        nombre_completo:  `${enl.primer_nombre} ${enl.primer_apellido}`.trim(),
        primer_nombre:    enl.primer_nombre,
        primer_apellido:  enl.primer_apellido,
        cargo:            enl.cargo,
        telefono:         enl.telefono,
        activo:           enl.activo,
        correo:           enl.usuario?.correo,
        ultimo_acceso:    enl.usuario?.ultimo_acceso,
        sede:             enl.sede,
        total_estudiantes: count ?? 0,
      }
    })
  )

  return ok(result)
}
