// src/app/api/dua/route.ts
// Diseño Universal para el Aprendizaje
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const p = req.nextUrl.searchParams
  const ciclo = p.get('ciclo') ?? '2026'

  let tecnicoId: string | null = null
  if (s.rol === 'tecnico') {
    tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return err('Perfil técnico no encontrado', 404)
  }

  // Grupos DUA
  let qGrupos = supabaseAdmin.from('grupos_dua').select(`
    id, nombre, descripcion, estado, max_estudiantes, ciclo_escolar, creado_en,
    etapa:etapas(nombre),
    sede:sedes(nombre),
    tecnico:tecnicos(primer_nombre, primer_apellido),
    sesiones_dua(count)
  `).eq('ciclo_escolar', parseInt(ciclo)).order('creado_en', { ascending: false })

  if (tecnicoId) qGrupos = qGrupos.eq('tecnico_id', tecnicoId)

  const { data: grupos, error } = await qGrupos
  if (error) return err(error.message, 500)

  // Si piden un grupo específico con sesiones
  const grupoId = p.get('grupo_id')
  if (grupoId) {
    const { data: sesiones } = await supabaseAdmin.from('sesiones_dua')
      .select(`
        id, fecha_sesion, hora_inicio, hora_fin, estado, observaciones,
        actividades_dua(id, nombre, numero_actividad, puntos_max, area:areas(nombre))
      `)
      .eq('grupo_dua_id', grupoId).order('fecha_sesion', { ascending: false })

    return ok({ grupos: grupos ?? [], sesiones: sesiones ?? [] })
  }

  return ok({ grupos: grupos ?? [], sesiones: [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  const tipo = b.tipo // 'grupo' | 'sesion' | 'actividad'

  if (tipo === 'grupo') {
    if (!b.nombre || !b.sede_id || !b.ciclo_escolar) return err('nombre, sede_id y ciclo_escolar requeridos')
    let tecnicoId = b.tecnico_id
    if (!tecnicoId && s.rol === 'tecnico') {
      tecnicoId = await getTecnicoId(s.sub)
      if (!tecnicoId) return err('Perfil técnico no encontrado', 404)
    }
    const { data, error } = await supabaseAdmin.from('grupos_dua').insert({
      nombre:         b.nombre.trim(),
      descripcion:    b.descripcion    ?? null,
      tecnico_id:     tecnicoId,
      sede_id:        b.sede_id,
      etapa_id:       b.etapa_id       ?? null,
      ciclo_escolar:  parseInt(b.ciclo_escolar),
      max_estudiantes: b.max_estudiantes ?? 10,
      estado:         'activo',
      creado_por:     s.sub,
    }).select('id').single()
    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  if (tipo === 'sesion') {
    if (!b.grupo_dua_id || !b.fecha_sesion) return err('grupo_dua_id y fecha_sesion requeridos')
    const { data, error } = await supabaseAdmin.from('sesiones_dua').insert({
      grupo_dua_id:  b.grupo_dua_id,
      fecha_sesion:  b.fecha_sesion,
      hora_inicio:   b.hora_inicio   ?? null,
      hora_fin:      b.hora_fin      ?? null,
      estado:        'programada',
      observaciones: b.observaciones ?? null,
      creado_por:    s.sub,
    }).select('id').single()
    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  if (tipo === 'actividad') {
    if (!b.sesion_dua_id || !b.nombre) return err('sesion_dua_id y nombre requeridos')
    const { data, error } = await supabaseAdmin.from('actividades_dua').insert({
      sesion_dua_id:              b.sesion_dua_id,
      nombre:                     b.nombre.trim(),
      descripcion:                b.descripcion                ?? null,
      area_id:                    b.area_id                    ?? null,
      numero_actividad:           b.numero_actividad           ?? 1,
      adaptacion_representacion:  b.adaptacion_representacion  ?? null,
      adaptacion_accion:          b.adaptacion_accion          ?? null,
      adaptacion_expresion:       b.adaptacion_expresion       ?? null,
      puntos_max:                 b.puntos_max                 ?? 5,
      creado_por:                 s.sub,
    }).select('id').single()
    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  return err('tipo debe ser grupo, sesion o actividad')
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id || !b.tipo) return err('id y tipo requeridos')

  const tabla = b.tipo === 'grupo' ? 'grupos_dua'
    : b.tipo === 'sesion' ? 'sesiones_dua'
    : b.tipo === 'actividad' ? 'actividades_dua' : null

  if (!tabla) return err('tipo inválido')

  const upd: any = {}
  if (b.estado      !== undefined) upd.estado      = b.estado
  if (b.observaciones !== undefined) upd.observaciones = b.observaciones
  if (b.nombre      !== undefined) upd.nombre      = b.nombre
  if (b.hora_inicio !== undefined) upd.hora_inicio = b.hora_inicio
  if (b.hora_fin    !== undefined) upd.hora_fin    = b.hora_fin

  const { error } = await supabaseAdmin.from(tabla).update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
