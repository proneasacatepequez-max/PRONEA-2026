// src/app/api/inscripciones/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p        = req.nextUrl.searchParams
  const id       = p.get('id')
  const ciclo    = p.get('ciclo')    ?? '2026'
  const etapa_id = p.get('etapa_id')
  const sede_id  = p.get('sede_id')
  const estado   = p.get('estado')   ?? 'en_curso' // 'todos' = sin filtro

  // ── GET por ID específico ─────────────────────────────────────────────
  if (id) {
    const { data, error } = await supabaseAdmin
      .from('inscripciones')
      .select(`
        id, ciclo_escolar, estado, version_libro, version_libro_id,
        repite_etapa, tiene_ajuste_discapacidad, observaciones, creado_en,
        estudiante:estudiantes(
          id, codigo_estudiante, primer_nombre, segundo_nombre,
          primer_apellido, segundo_apellido, fecha_nacimiento, cui,
          cui_pendiente, telefono, genero, municipio_id
        ),
        etapa:etapas(id, codigo, nombre, nivel, orden),
        sede:sedes(id, nombre, municipio:municipios(nombre)),
        tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico),
        modalidad:modalidades(id, nombre),
        seccion:secciones(id, codigo)
      `)
      .eq('id', id)
      .single()

    if (error) return err(error.message, 404)
    return ok(data)
  }

  // ── Query base ────────────────────────────────────────────────────────
  let q = supabaseAdmin
    .from('inscripciones')
    .select(`
      id, ciclo_escolar, estado, repite_etapa, version_libro, creado_en,
      estudiante:estudiantes(
        id, codigo_estudiante, primer_nombre, segundo_nombre,
        primer_apellido, segundo_apellido, fecha_nacimiento, cui,
        cui_pendiente, telefono, municipio:municipios(nombre)
      ),
      etapa:etapas(id, codigo, nombre, nivel, orden),
      sede:sedes(id, nombre),
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('ciclo_escolar', parseInt(ciclo))

  // ── Filtro por rol ────────────────────────────────────────────────────
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (!tec) return ok({ data: [] })
    q = q.eq('tecnico_id', tec.id)
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('sede_id').eq('usuario_id', s.sub).single()
    if (!enl) return ok({ data: [] })
    q = q.eq('sede_id', enl.sede_id)
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('sede_id').eq('usuario_id', s.sub).single()
    if (!dir) return ok({ data: [] })
    q = q.eq('sede_id', dir.sede_id)
  }

  // ── Filtros opcionales ────────────────────────────────────────────────
  if (etapa_id) q = q.eq('etapa_id', parseInt(etapa_id))

  // Admin puede filtrar por sede; otros roles ya tienen su sede fija
  if (sede_id && s.rol === 'administrador') q = q.eq('sede_id', sede_id)

  // CORREGIDO: 'todos' omite el filtro de estado; cualquier otro valor filtra
  if (estado && estado !== 'todos') q = q.eq('estado', estado)

  const { data, error } = await q.order('creado_en', { ascending: false })
  if (error) return err(error.message, 500)
  return ok({ data: data ?? [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'enlace_institucional', 'administrador'].includes(s.rol))
    return err('Sin permiso para crear inscripciones', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const {
    estudiante_id, etapa_id, tecnico_id, sede_id,
    modalidad_id, seccion_id, ciclo_escolar = 2026,
    version_libro = 'nuevo',
  } = b

  if (!estudiante_id) return err('estudiante_id requerido')
  if (!etapa_id)      return err('etapa_id requerido')
  if (!tecnico_id)    return err('tecnico_id requerido')
  if (!sede_id)       return err('sede_id requerido')

  // Verificar inscripción activa en misma etapa y ciclo (evitar duplicados)
  const { data: existe } = await supabaseAdmin
    .from('inscripciones')
    .select('id, estado, sede:sedes(nombre), etapa:etapas(nombre)')
    .eq('estudiante_id', estudiante_id)
    .eq('etapa_id', parseInt(etapa_id))
    .eq('ciclo_escolar', parseInt(String(ciclo_escolar)))
    .eq('estado', 'en_curso')
    .maybeSingle()

  if (existe) {
    const sedeNombre  = (existe as any).sede?.nombre  ?? 'otra sede'
    const etapaNombre = (existe as any).etapa?.nombre ?? 'esta etapa'
    return err(
      `❌ Este estudiante ya está inscrito en "${etapaNombre}" en "${sedeNombre}" para el ciclo ${ciclo_escolar}.`,
      409
    )
  }

  // Validar permisos por rol
  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('sede_id').eq('usuario_id', s.sub).single()
    if (!enl || enl.sede_id !== sede_id)
      return err('❌ No puedes inscribir estudiantes fuera de tu sede', 403)
  }

  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).eq('id', tecnico_id).single()
    if (!tec) return err('❌ No puedes usar ese técnico', 403)
  }

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
  return ok({ ok: true, id: data.id, mensaje: '✅ Estudiante inscrito correctamente' }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director', 'tecnico'].includes(s.rol))
    return err('Sin permiso', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { id, estado } = b
  if (!id) return err('id requerido')
  if (!estado || !['en_curso', 'aprobado', 'reprobado', 'retirado', 'completada'].includes(estado))
    return err('estado inválido', 400)

  const { error } = await supabaseAdmin
    .from('inscripciones').update({ estado }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: '✅ Estado actualizado' })
}
