// src/app/api/inscripciones/route.ts
// FIX DEFINITIVO: tecnico_id es NOT NULL en la BD — si no se resuelve, el insert
// falla con error genérico de Postgres que el frontend mostraba como
// "Error del servidor". Ahora se valida ANTES de intentar el insert
// y se da un mensaje claro.
// FIX: permitir reinscribir en etapa diferente (no bloquear por estudiante ya inscrito)
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
    municipio:municipios(id, nombre, departamento_id),
    discapacidad:tipos_discapacidad(id, nombre)
  ),
  etapa:etapas(id, nombre, nivel, orden),
  sede:sedes(id, nombre, municipio_id),
  tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p      = req.nextUrl.searchParams
  const ciclo   = p.get('ciclo')    ?? '2026'
  const estado  = p.get('estado')   ?? 'en_curso'
  const etapaId = p.get('etapa_id')
  const sedeId  = p.get('sede_id')
  const municipioId = p.get('municipio_id')

  let q = supabaseAdmin.from('inscripciones')
    .select(BASE_SELECT)
    .eq('ciclo_escolar', parseInt(ciclo))
    .order('fecha_inscripcion', { ascending: false })

  if (estado !== 'todos') q = q.eq('estado', estado)
  if (etapaId) q = q.eq('etapa_id', parseInt(etapaId))
  if (sedeId)  q = q.eq('sede_id', sedeId)

  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return ok({ data: [], total: 0 })

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
      .select('sede_id').eq('usuario_id', s.sub).single()
    if (!enl?.sede_id) return ok({ data: [], total: 0 })
    q = q.eq('sede_id', enl.sede_id)
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('sede_id').eq('usuario_id', s.sub).single()
    if (dir?.sede_id) q = q.eq('sede_id', dir.sede_id)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)

  let resultado = data ?? []
  if (municipioId) {
    resultado = resultado.filter((i: any) =>
      String((i.estudiante as any)?.municipio?.id) === municipioId
    )
  }

  return ok({ data: resultado, total: resultado.length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const rolesPermitidos = ['tecnico', 'enlace_institucional', 'administrador', 'director']
  if (!rolesPermitidos.includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const { estudiante_id, etapa_id, sede_id, version_libro = 'nuevo', ciclo_escolar = 2026 } = b

  if (!estudiante_id) return err('estudiante_id requerido')
  if (!etapa_id)      return err('etapa_id requerido')
  if (!sede_id)       return err('sede_id requerido')

  // ── FIX CRÍTICO: resolver tecnico_id ANTES de intentar el insert ──
  // inscripciones.tecnico_id es NOT NULL — si no se resuelve aquí con un
  // mensaje claro, Postgres devuelve un error genérico 500.
  let tecnico_id: string | null = b.tecnico_id ?? null

  if (!tecnico_id && s.rol === 'tecnico') {
    tecnico_id = await getTecnicoId(s.sub)
    if (!tecnico_id) {
      return err(
        'No se encontró tu perfil de técnico vinculado a este usuario. ' +
        'El administrador debe verificar que tu cuenta tenga un registro en la tabla de técnicos.',
        404
      )
    }
  }

  if (!tecnico_id && s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('id').eq('usuario_id', s.sub).single()
    if (!enl) return err('Perfil de enlace no encontrado', 404)

    const { data: te } = await supabaseAdmin
      .from('tecnico_enlaces').select('tecnico_id')
      .eq('enlace_id', enl.id).eq('activo', true)
      .order('asignado_en', { ascending: false })
      .limit(1).maybeSingle()

    tecnico_id = te?.tecnico_id ?? null

    if (!tecnico_id) {
      return err(
        'Tu institución no tiene un técnico responsable asignado. ' +
        'Pide al director o administrador que vincule un técnico a tu institución antes de inscribir.',
        404
      )
    }
  }

  if (!tecnico_id && s.rol === 'director') {
    return err('Como director debes especificar tecnico_id al inscribir', 400)
  }

  if (!tecnico_id) {
    return err('No fue posible determinar el técnico responsable de la inscripción', 400)
  }

  // ── FIX: solo bloquear duplicado en la MISMA etapa, no en general ──
  // Esto permite que un estudiante avance de 1a Etapa Básico (2025)
  // a 2a Etapa Básico (2026) sin error, porque son etapas diferentes.
  const { data: dup } = await supabaseAdmin.from('inscripciones')
    .select('id, etapa:etapas(nombre)')
    .eq('estudiante_id', estudiante_id)
    .eq('etapa_id', etapa_id)
    .eq('ciclo_escolar', ciclo_escolar)
    .eq('estado', 'en_curso')
    .maybeSingle()

  if (dup) {
    return err(
      `El estudiante ya está inscrito en ${(dup.etapa as any)?.nombre ?? 'esta etapa'} para el ciclo ${ciclo_escolar}`,
      409
    )
  }

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

  if (error) {
    // Mensaje claro según el tipo de error de Postgres
    if (error.code === '23502') {
      return err(`Falta un campo obligatorio en la base de datos: ${error.message}`, 500)
    }
    if (error.code === '23503') {
      return err('Uno de los datos referenciados (técnico, sede o etapa) no existe', 400)
    }
    return err('Error al inscribir: ' + error.message, 500)
  }

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
