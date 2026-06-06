// src/app/api/dua/route.ts
// FIX: sesión DUA guarda sede_id correctamente desde el grupo
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p       = req.nextUrl.searchParams
  const ciclo   = p.get('ciclo')    ?? '2026'
  const grupoId = p.get('grupo_id')

  let tecnicoId: string | null = null
  if (s.rol === 'tecnico') {
    tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) {
      return ok({
        grupos: [],
        sesiones: [],
        _aviso: 'Tu perfil de técnico no está completamente configurado. Contacta al administrador.',
      })
    }
  }

  let qGrupos = supabaseAdmin.from('grupos_dua').select(`
    id, nombre, descripcion, estado, max_estudiantes, ciclo_escolar, creado_en,
    etapa:etapas(id, nombre),
    sede:sedes(id, nombre),
    tecnico:tecnicos(id, primer_nombre, primer_apellido)
  `)
  .eq('ciclo_escolar', parseInt(ciclo))
  .order('creado_en', { ascending: false })

  if (tecnicoId) qGrupos = qGrupos.eq('tecnico_id', tecnicoId)

  const { data: grupos, error } = await qGrupos
  if (error) return err(error.message, 500)

  if (grupoId) {
    const { data: sesiones } = await supabaseAdmin.from('sesiones_dua').select(`
      id, fecha_sesion, hora_inicio, hora_fin, estado, observaciones,
      actividades_dua(id, nombre, numero_actividad, puntos_max, area:areas(nombre))
    `)
    .eq('grupo_dua_id', grupoId)
    .order('fecha_sesion', { ascending: false })
    return ok({ grupos: grupos ?? [], sesiones: sesiones ?? [] })
  }

  return ok({ grupos: grupos ?? [], sesiones: [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))
  const tipo = b.tipo ?? 'grupo'

  // ── Crear GRUPO DUA ──
  if (tipo === 'grupo') {
    if (!['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

    let tecnicoId: string | null = b.tecnico_id ?? null
    if (!tecnicoId && s.rol === 'tecnico') {
      tecnicoId = await getTecnicoId(s.sub)
      if (!tecnicoId) return err('Tu perfil de técnico no está configurado. Contacta al administrador.', 404)
    }
    if (!tecnicoId) return err('tecnico_id requerido', 400)
    if (!b.sede_id)       return err('sede_id requerido', 400)
    if (!b.ciclo_escolar) return err('ciclo_escolar requerido', 400)

    const { data, error } = await supabaseAdmin.from('grupos_dua').insert({
      tecnico_id:      tecnicoId,
      sede_id:         b.sede_id,
      ciclo_escolar:   parseInt(b.ciclo_escolar),
      nombre:          b.nombre?.trim() || `Grupo DUA ${new Date().toLocaleDateString('es-GT')}`,
      descripcion:     b.descripcion    || null,
      etapa_id:        b.etapa_id       ? parseInt(b.etapa_id) : null,
      max_estudiantes: b.max_estudiantes ?? 10,
      estado:          'activo',
      creado_por:      s.sub,
    }).select('id, nombre').single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  // ── Crear SESIÓN DUA ──
  if (tipo === 'sesion') {
    if (!['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
    if (!b.grupo_dua_id)   return err('grupo_dua_id requerido', 400)
    if (!b.fecha_sesion)   return err('fecha_sesion requerida', 400)

    // Obtener sede_id del grupo automáticamente
    const { data: grupo } = await supabaseAdmin.from('grupos_dua')
      .select('sede_id').eq('id', b.grupo_dua_id).single()

    if (!grupo) return err('Grupo DUA no encontrado', 404)

    const { data, error } = await supabaseAdmin.from('sesiones_dua').insert({
      grupo_dua_id:  b.grupo_dua_id,
      fecha_sesion:  b.fecha_sesion,
      hora_inicio:   b.hora_inicio   || null,
      hora_fin:      b.hora_fin      || null,
      observaciones: b.observaciones || null,
      estado:        'programada',
      creado_por:    s.sub,
    }).select('id, fecha_sesion, estado').single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  return err('tipo debe ser grupo o sesion', 400)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const tipo = b.tipo ?? 'grupo'

  if (tipo === 'grupo') {
    const upd: any = {}
    if (b.nombre          !== undefined) upd.nombre          = b.nombre?.trim() || null
    if (b.descripcion     !== undefined) upd.descripcion     = b.descripcion    || null
    if (b.estado          !== undefined) upd.estado          = b.estado
    if (b.max_estudiantes !== undefined) upd.max_estudiantes = parseInt(b.max_estudiantes)
    if (b.etapa_id        !== undefined) upd.etapa_id        = b.etapa_id ? parseInt(b.etapa_id) : null

    const { error } = await supabaseAdmin.from('grupos_dua').update(upd).eq('id', b.id)
    if (error) return err(error.message, 500)
  }

  if (tipo === 'sesion') {
    const upd: any = {}
    if (b.fecha_sesion  !== undefined) upd.fecha_sesion  = b.fecha_sesion
    if (b.hora_inicio   !== undefined) upd.hora_inicio   = b.hora_inicio   || null
    if (b.hora_fin      !== undefined) upd.hora_fin      = b.hora_fin      || null
    if (b.estado        !== undefined) upd.estado        = b.estado
    if (b.observaciones !== undefined) upd.observaciones = b.observaciones || null

    const { error } = await supabaseAdmin.from('sesiones_dua').update(upd).eq('id', b.id)
    if (error) return err(error.message, 500)
  }

  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const id   = req.nextUrl.searchParams.get('id')
  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'grupo'
  if (!id) return err('id requerido')

  if (tipo === 'sesion') {
    const { error } = await supabaseAdmin.from('sesiones_dua').delete().eq('id', id)
    if (error) return err(error.message, 500)
  } else {
    // Desactivar grupo en lugar de eliminar
    const { error } = await supabaseAdmin.from('grupos_dua')
      .update({ estado: 'archivado' }).eq('id', id)
    if (error) return err(error.message, 500)
  }

  return ok({ ok: true })
}
