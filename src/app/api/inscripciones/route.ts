// src/app/api/inscripciones/route.ts
// FIX: detalle usa LEFT join no INNER — muestra todos los estudiantes
// FIX: coordinador y director ven estudiantes correctamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('tecnicos')
    .select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

const BASE_SELECT = `
  id, ciclo_escolar, version_libro, estado, fecha_inscripcion,
  tiene_ajuste_discapacidad, creado_por,
  estudiante:estudiantes(
    id, codigo_estudiante, codigo_sireex,
    primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    cui, cui_pendiente, telefono, telefono_alternativo,
    fecha_nacimiento, genero, correo, direccion,
    municipio:municipios(id, nombre),
    discapacidad:tipos_discapacidad(id, nombre)
  ),
  etapa:etapas(id, nombre, nivel),
  sede:sedes(id, nombre),
  tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p      = req.nextUrl.searchParams
  const ciclo  = p.get('ciclo')    ?? '2026'
  const estado = p.get('estado')   ?? 'en_curso'
  const etapaId = p.get('etapa_id')
  const sedeId  = p.get('sede_id')

  let q = supabaseAdmin.from('inscripciones')
    .select(BASE_SELECT)
    .eq('ciclo_escolar', parseInt(ciclo))
    .order('fecha_inscripcion', { ascending: false })

  if (estado !== 'todos') q = q.eq('estado', estado)
  if (etapaId)            q = q.eq('etapa_id', parseInt(etapaId))
  if (sedeId)             q = q.eq('sede_id', sedeId)

  // ── Filtros por rol ──
  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return ok({ data: [], total: 0 })

    // Técnico ve sus propios + los de sus enlaces
    const { data: enlacesVinc } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id').eq('tecnico_id', tecnicoId)
      .eq('ciclo_escolar', parseInt(ciclo)).eq('activo', true)

    if (enlacesVinc && enlacesVinc.length > 0) {
      const enlaceIds = enlacesVinc.map((e: any) => e.enlace_id)
      const { data: enlacesInfo } = await supabaseAdmin
        .from('enlaces_institucionales').select('usuario_id').in('id', enlaceIds)
      const uids = (enlacesInfo ?? []).map((e: any) => e.usuario_id)
      if (uids.length > 0) {
        q = q.or(`tecnico_id.eq.${tecnicoId},creado_por.in.(${uids.join(',')})`)
      } else {
        q = q.eq('tecnico_id', tecnicoId)
      }
    } else {
      q = q.eq('tecnico_id', tecnicoId)
    }
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('institucion_id').eq('usuario_id', s.sub).single()
    if (!enl?.institucion_id) return ok({ data: [], total: 0 })

    const { data: sedesInst } = await supabaseAdmin
      .from('sedes').select('id').eq('institucion_id', enl.institucion_id).eq('activo', true)
    const sedeIds = (sedesInst ?? []).map((s: any) => s.id)
    if (sedeIds.length === 0) return ok({ data: [], total: 0 })
    q = q.in('sede_id', sedeIds)
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('sede_id').eq('usuario_id', s.sub).single()
    if (dir?.sede_id) {
      const { data: sedePrincipal } = await supabaseAdmin
        .from('sedes').select('institucion_id').eq('id', dir.sede_id).single()
      if (sedePrincipal?.institucion_id) {
        const { data: sedesInst } = await supabaseAdmin
          .from('sedes').select('id').eq('institucion_id', sedePrincipal.institucion_id)
        const ids = (sedesInst ?? []).map((s: any) => s.id)
        if (ids.length > 0) q = q.in('sede_id', ids)
      } else {
        q = q.eq('sede_id', dir.sede_id)
      }
    }
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const rolesPermitidos = ['tecnico', 'enlace_institucional', 'administrador', 'director']
  if (!rolesPermitidos.includes(s.rol)) return err('Sin permiso', 403)

  // Enlace no necesita permiso especial para inscribir — es función básica
  const b = await req.json().catch(() => ({}))
  const { estudiante_id, etapa_id, sede_id, version_libro = 'nuevo', ciclo_escolar = 2026 } = b

  if (!estudiante_id) return err('estudiante_id requerido')
  if (!etapa_id)      return err('etapa_id requerido')
  if (!sede_id)       return err('sede_id requerido')

  let tecnico_id = b.tecnico_id
  if (!tecnico_id && s.rol === 'tecnico') {
    tecnico_id = await getTecnicoId(s.sub)
    if (!tecnico_id) return err('Perfil de técnico no configurado', 404)
  }

  // Para enlace, asignar el técnico vinculado
  if (!tecnico_id && s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('id').eq('usuario_id', s.sub).single()
    if (enl) {
      const { data: te } = await supabaseAdmin
        .from('tecnico_enlaces').select('tecnico_id')
        .eq('enlace_id', enl.id).eq('activo', true).limit(1).single()
      tecnico_id = te?.tecnico_id ?? null
    }
  }

  if (!tecnico_id) return err('tecnico_id requerido', 400)

  // Verificar duplicado
  const { data: dup } = await supabaseAdmin.from('inscripciones')
    .select('id').eq('estudiante_id', estudiante_id)
    .eq('etapa_id', etapa_id).eq('ciclo_escolar', ciclo_escolar)
    .eq('estado', 'en_curso').maybeSingle()
  if (dup) return err('El estudiante ya está inscrito en esta etapa para el ciclo actual', 409)

  const { data, error } = await supabaseAdmin.from('inscripciones').insert({
    estudiante_id,
    etapa_id:      parseInt(String(etapa_id)),
    tecnico_id,
    sede_id,
    version_libro,
    ciclo_escolar: parseInt(String(ciclo_escolar)),
    estado: 'en_curso',
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
  if (!s || !['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.estado        !== undefined) upd.estado        = b.estado
  if (b.version_libro !== undefined) upd.version_libro = b.version_libro
  if (b.sede_id       !== undefined) upd.sede_id       = b.sede_id
  if (b.observaciones !== undefined) upd.observaciones = b.observaciones
  if (b.tecnico_id    !== undefined) upd.tecnico_id    = b.tecnico_id

  const { error } = await supabaseAdmin.from('inscripciones').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
