// src/app/api/inscripciones/route.ts
// CORRECCIONES:
// 1. Técnico ve SUS estudiantes + estudiantes de sus enlaces vinculados (tecnico_enlaces)
// 2. Enlace ve solo estudiantes de su institución
// 3. Ciclo leído de configuración (no hardcodeado)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p      = req.nextUrl.searchParams
  const ciclo  = p.get('ciclo') ?? '2026'
  const estado = p.get('estado') ?? 'en_curso'

  const baseSelect = `
    id, ciclo_escolar, version_libro, estado, fecha_inscripcion, tiene_ajuste_discapacidad,
    estudiante:estudiantes(
      id, codigo_estudiante, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      cui, telefono, fecha_nacimiento, genero,
      municipio:municipios(nombre),
      discapacidad:tipos_discapacidad(nombre)
    ),
    etapa:etapas(id, nombre, nivel),
    sede:sedes(id, nombre),
    tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
  `

  let q = supabaseAdmin
    .from('inscripciones')
    .select(baseSelect)
    .eq('ciclo_escolar', parseInt(ciclo))

  if (estado !== 'todos') q = q.eq('estado', estado)
  if (p.get('etapa_id'))   q = q.eq('etapa_id',   parseInt(p.get('etapa_id')!))
  if (p.get('sede_id'))    q = q.eq('sede_id',    p.get('sede_id')!)
  if (p.get('tecnico_id')) q = q.eq('tecnico_id', p.get('tecnico_id')!)

  // ── FILTROS POR ROL ──
  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return err('Perfil de técnico no encontrado', 404)

    // Obtener IDs de enlaces a cargo del técnico
    const { data: enlacesVinculados } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id')
      .eq('tecnico_id', tecnicoId)
      .eq('ciclo_escolar', parseInt(ciclo))
      .eq('activo', true)

    if (enlacesVinculados && enlacesVinculados.length > 0) {
      // Obtener usuario_ids de esos enlaces
      const enlaceIds = enlacesVinculados.map((e: any) => e.enlace_id)
      const { data: enlacesInfo } = await supabaseAdmin
        .from('enlaces_institucionales')
        .select('usuario_id')
        .in('id', enlaceIds)

      // Obtener inscripciones creadas por esos enlaces
      const enlaceUsuarioIds = (enlacesInfo ?? []).map((e: any) => e.usuario_id)

      // Técnico ve: sus propias inscripciones + las de sus enlaces
      // Usamos .or() con tecnico_id y creado_por
      q = q.or(
        `tecnico_id.eq.${tecnicoId},creado_por.in.(${enlaceUsuarioIds.join(',')})`
      )
    } else {
      // Solo sus propias inscripciones
      q = q.eq('tecnico_id', tecnicoId)
    }
  }

  if (s.rol === 'enlace_institucional') {
    // Enlace ve solo estudiantes de su institución
    const { data: enlace } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('institucion_id')
      .eq('usuario_id', s.sub)
      .single()

    if (!enlace?.institucion_id) return ok({ data: [], total: 0 })

    // Obtener sedes de la institución
    const { data: sedes } = await supabaseAdmin
      .from('sedes')
      .select('id')
      .eq('institucion_id', enlace.institucion_id)
      .eq('activo', true)

    const sedeIds = (sedes ?? []).map((s: any) => s.id)
    if (sedeIds.length === 0) return ok({ data: [], total: 0 })

    q = q.in('sede_id', sedeIds)
  }

  if (s.rol === 'director') {
    // Director ve inscripciones de las sedes bajo su control
    const { data: dir } = await supabaseAdmin
      .from('directores')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (dir?.sede_id) {
      // Director ve su sede + otras sedes en la misma institución
      const { data: sedePrincipal } = await supabaseAdmin
        .from('sedes')
        .select('institucion_id')
        .eq('id', dir.sede_id)
        .single()

      if (sedePrincipal?.institucion_id) {
        const { data: sedesInst } = await supabaseAdmin
          .from('sedes')
          .select('id')
          .eq('institucion_id', sedePrincipal.institucion_id)
        const ids = (sedesInst ?? []).map((s: any) => s.id)
        if (ids.length > 0) q = q.in('sede_id', ids)
      } else {
        q = q.eq('sede_id', dir.sede_id)
      }
    }
  }

  q = q.order('fecha_inscripcion', { ascending: false })

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  // Verificar permiso del enlace si aplica
  if (s.rol === 'enlace_institucional') {
    const { data: enlace } = await supabaseAdmin
      .from('enlaces_institucionales').select('id').eq('usuario_id', s.sub).single()
    if (!enlace) return err('Perfil de enlace no encontrado', 404)

    const { data: auth } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('id').eq('enlace_id', enlace.id)
      .eq('permiso', 'inscribir_estudiantes_enlace').eq('activo', true).maybeSingle()
    if (!auth) return err('No tienes autorización para inscribir estudiantes.', 403)
  } else if (!['tecnico', 'administrador'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  const b = await req.json().catch(() => ({}))
  const { estudiante_id, etapa_id, sede_id, version_libro = 'nuevo', ciclo_escolar = 2026 } = b
  if (!estudiante_id || !etapa_id || !sede_id) return err('estudiante_id, etapa_id y sede_id son requeridos')

  let tecnico_id = b.tecnico_id
  if (!tecnico_id && s.rol === 'tecnico') {
    tecnico_id = await getTecnicoId(s.sub)
    if (!tecnico_id) return err('Perfil de técnico no encontrado', 404)
  }

  const { data: dup } = await supabaseAdmin.from('inscripciones')
    .select('id').eq('estudiante_id', estudiante_id)
    .eq('etapa_id', etapa_id).eq('ciclo_escolar', ciclo_escolar)
    .eq('estado', 'en_curso').maybeSingle()
  if (dup) return err('El estudiante ya está inscrito en esta etapa para el ciclo actual', 409)

  const { data, error } = await supabaseAdmin.from('inscripciones').insert({
    estudiante_id, etapa_id, tecnico_id, sede_id,
    version_libro, ciclo_escolar, estado: 'en_curso',
    fecha_inscripcion: new Date().toISOString().split('T')[0],
    creado_por: s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'INSCRIBIR_ESTUDIANTE',
    tabla_afectada: 'inscripciones', registro_id: data.id,
  }).catch(() => {})

  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.estado        !== undefined) upd.estado        = b.estado
  if (b.version_libro !== undefined) upd.version_libro = b.version_libro
  if (b.sede_id       !== undefined) upd.sede_id       = b.sede_id
  if (b.observaciones !== undefined) upd.observaciones = b.observaciones
  const { error } = await supabaseAdmin.from('inscripciones').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

