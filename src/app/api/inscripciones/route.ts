// src/app/api/inscripciones/route.ts
// FIX #3: STUDENT TABLE - Filtrar inscripciones por rol (tecnico, enlace, director)
// CORREGIDO: libro_id → version_libro_id + estado=todos
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams
  const id = p.get('id')
  const ciclo = p.get('ciclo') ?? '2026'
  const etapa_id = p.get('etapa_id')
  const sede_id = p.get('sede_id')
  const estado = p.get('estado') ?? 'en_curso' // 'todos' para no filtrar

  // Obtener una inscripción específica por ID
  if (id) {
    const { data, error } = await supabaseAdmin
      .from('inscripciones')
      .select(`
        id, ciclo_escolar, estado, version_libro, version_libro_id,
        estudiante:estudiantes(
          id, codigo_estudiante, primer_nombre, segundo_nombre,
          primer_apellido, segundo_apellido, fecha_nacimiento, cui
        ),
        etapa:etapas(id, codigo, nombre),
        sede:sedes(id, nombre),
        tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
      `)
      .eq('id', id)
      .single()

    if (error) return err(error.message, 404)
    return ok(data)
  }

  // Query base para listar inscripciones
  let q = supabaseAdmin
    .from('inscripciones')
    .select(`
      id, ciclo_escolar, estado, repite_etapa, version_libro,
      creado_en,
      estudiante:estudiantes(
        id, codigo_estudiante, primer_nombre, segundo_nombre,
        primer_apellido, segundo_apellido, fecha_nacimiento, cui, telefono
      ),
      etapa:etapas(id, codigo, nombre),
      sede:sedes(id, nombre),
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('ciclo_escolar', parseInt(ciclo))

  // Filtrar por rol del usuario
  if (s.rol === 'tecnico') {
    const { data: tec, error: tecErr } = await supabaseAdmin
      .from('tecnicos')
      .select('id')
      .eq('usuario_id', s.sub)
      .single()

    if (tecErr || !tec) return ok({ data: [] })
    q = q.eq('tecnico_id', tec.id)
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl, error: enlErr } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (enlErr || !enl) return ok({ data: [] })
    q = q.eq('sede_id', enl.sede_id)
  }

  if (s.rol === 'director') {
    const { data: dir, error: dirErr } = await supabaseAdmin
      .from('directores')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (dirErr || !dir) return ok({ data: [] })
    q = q.eq('sede_id', dir.sede_id)
  }

  // Filtros opcionales
  if (etapa_id) q = q.eq('etapa_id', parseInt(etapa_id))
  if (sede_id && s.rol === 'administrador') q = q.eq('sede_id', sede_id)

  // estado='todos' no filtra; cualquier otro valor sí filtra
  if (estado && estado !== 'todos') q = q.eq('estado', estado)

  const { data, error } = await q.order('creado_en', { ascending: false })

  if (error) return err(error.message, 500)
  return ok({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (!['tecnico', 'enlace_institucional', 'administrador'].includes(s.rol)) {
    return err('Sin permiso para crear inscripciones', 403)
  }

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { 
    estudiante_id, 
    etapa_id, 
    tecnico_id, 
    sede_id,
    modalidad_id, 
    seccion_id, 
    ciclo_escolar = 2026, 
    version_libro = 'nuevo' 
  } = b

  // Validaciones de campos requeridos
  if (!estudiante_id) return err('estudiante_id requerido')
  if (!etapa_id)      return err('etapa_id requerido')
  if (!tecnico_id)    return err('tecnico_id requerido')
  if (!sede_id)       return err('sede_id requerido')

  // Verificar que no tenga inscripción activa en la misma etapa y ciclo
  const { data: existe } = await supabaseAdmin
    .from('inscripciones')
    .select('id')
    .eq('estudiante_id', estudiante_id)
    .eq('etapa_id', parseInt(etapa_id))
    .eq('ciclo_escolar', parseInt(String(ciclo_escolar)))
    .eq('estado', 'en_curso')
    .maybeSingle()

  if (existe) {
    return err('❌ El estudiante ya tiene una inscripción activa en esta etapa y ciclo', 409)
  }

  // Validar permisos según rol
  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('sede_id')
      .eq('usuario_id', s.sub)
      .single()

    if (!enl || enl.sede_id !== sede_id) {
      return err('❌ No puedes inscribir estudiantes fuera de tu sede', 403)
    }
  }

  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos')
      .select('id')
      .eq('usuario_id', s.sub)
      .eq('id', tecnico_id)
      .single()

    if (!tec) {
      return err('❌ No puedes usar ese técnico', 403)
    }
  }

  // Insertar la inscripción
  const { data, error } = await supabaseAdmin
    .from('inscripciones')
    .insert({
      estudiante_id,
      etapa_id:      parseInt(etapa_id),
      tecnico_id,
      sede_id,
      modalidad_id:  modalidad_id  ? parseInt(modalidad_id)  : null,
      seccion_id:    seccion_id    ? parseInt(seccion_id)    : null,
      ciclo_escolar: parseInt(String(ciclo_escolar)),
      version_libro: version_libro ?? 'nuevo',
      estado:        'en_curso',
      creado_por:    s.sub,
    })
    .select('id')
    .single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, id: data.id, mensaje: '✅ Estudiante inscrito' }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director', 'tecnico'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { id, estado } = b
  if (!id) return err('id requerido')

  if (!estado || !['en_curso', 'aprobado', 'reprobado', 'retirado', 'completada'].includes(estado)) {
    return err('estado inválido', 400)
  }

  // Si es técnico, verificar que la inscripción le pertenezca
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos')
      .select('id')
      .eq('usuario_id', s.sub)
      .single()

    if (!tec) return err('Técnico no encontrado', 404)

    const { data: inscripcion } = await supabaseAdmin
      .from('inscripciones')
      .select('tecnico_id')
      .eq('id', id)
      .single()

    if (!inscripcion || inscripcion.tecnico_id !== tec.id) {
      return err('No tienes permiso para modificar esta inscripción', 403)
    }
  }

  const { error } = await supabaseAdmin
    .from('inscripciones')
    .update({ estado })
    .eq('id', id)

  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: '✅ Estado actualizado' })
}
