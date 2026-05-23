// src/app/api/inscripciones/route.ts
// Inscripciones: el técnico inscribe estudiantes
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// Obtener el tecnico_id (UUID de tecnicos) a partir del usuario_id
async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams
  const ciclo = p.get('ciclo') ?? '2026'
  const estado = p.get('estado') ?? 'en_curso'

  let q = supabaseAdmin.from('inscripciones').select(`
    id, ciclo_escolar, version_libro, estado, fecha_inscripcion, tiene_ajuste_discapacidad,
    estudiante:estudiantes(
      id, codigo_estudiante, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      cui, telefono, fecha_nacimiento, genero, municipio_id,
      municipio:municipios(nombre),
      discapacidad:tipos_discapacidad(nombre)
    ),
    etapa:etapas(id, nombre, nivel),
    sede:sedes(id, nombre),
    tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
  `)
  .eq('ciclo_escolar', parseInt(ciclo))

  if (estado !== 'todos') q = q.eq('estado', estado)

  // Filtrar por técnico si es rol técnico
  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return err('Perfil de técnico no encontrado', 404)
    q = q.eq('tecnico_id', tecnicoId)
  }

  if (p.get('sede_id'))    q = q.eq('sede_id', p.get('sede_id')!)
  if (p.get('etapa_id'))   q = q.eq('etapa_id', parseInt(p.get('etapa_id')!))
  if (p.get('tecnico_id')) q = q.eq('tecnico_id', p.get('tecnico_id')!)

  q = q.order('fecha_inscripcion', { ascending: false })

  const { data, error } = await q
  if (error) return err(error.message, 500)

  return ok({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const { estudiante_id, etapa_id, sede_id, version_libro = 'nuevo', ciclo_escolar = 2026 } = b

  if (!estudiante_id || !etapa_id || !sede_id) {
    return err('estudiante_id, etapa_id y sede_id son requeridos')
  }

  // Obtener tecnico_id
  let tecnico_id = b.tecnico_id
  if (!tecnico_id && s.rol === 'tecnico') {
    tecnico_id = await getTecnicoId(s.sub)
    if (!tecnico_id) return err('Perfil de técnico no encontrado', 404)
  }

  // Verificar inscripción duplicada
  const { data: dup } = await supabaseAdmin.from('inscripciones')
    .select('id').eq('estudiante_id', estudiante_id)
    .eq('etapa_id', etapa_id).eq('ciclo_escolar', ciclo_escolar)
    .eq('estado', 'en_curso').maybeSingle()
  if (dup) return err('El estudiante ya está inscrito en esta etapa para el ciclo actual', 409)

  const { data, error } = await supabaseAdmin.from('inscripciones').insert({
    estudiante_id,
    etapa_id,
    tecnico_id,
    sede_id,
    version_libro,
    ciclo_escolar,
    estado: 'en_curso',
    fecha_inscripcion: new Date().toISOString().split('T')[0],
    creado_por: s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)

  try {
    await supabaseAdmin.from('auditoria').insert({
      usuario_id: s.sub, accion: 'INSCRIBIR_ESTUDIANTE',
      tabla_afectada: 'inscripciones', registro_id: data.id,
    })
  } catch { }

  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')
  const upd: any = {}
  if (b.estado        !== undefined) upd.estado         = b.estado
  if (b.version_libro !== undefined) upd.version_libro  = b.version_libro
  if (b.sede_id       !== undefined) upd.sede_id        = b.sede_id
  if (b.observaciones !== undefined) upd.observaciones  = b.observaciones
  const { error } = await supabaseAdmin.from('inscripciones').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
