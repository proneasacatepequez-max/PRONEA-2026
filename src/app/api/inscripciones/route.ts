// src/app/api/inscripciones/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
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
        repite_etapa, tiene_ajuste_discapacidad, observaciones, creado_en, fecha_inscripcion,
        estudiante:estudiantes(
          id, codigo_estudiante, primer_nombre, segundo_nombre,
          primer_apellido, segundo_apellido, fecha_nacimiento, cui,
          cui_pendiente, telefono, genero, municipio_id, correo,
          direccion, discapacidad_id, estado_civil_id, pueblo_id,
          idioma_id, tipo_vivienda_id, ocupacion,
          contacto_emergencia_nombre, contacto_emergencia_tel, contacto_emergencia_parent
        ),
        etapa:etapas(id, codigo, nombre, nivel, orden),
        sede:sedes(id, nombre, municipio:municipios(nombre)),
        tecnico:tecnicos!inscripciones_tecnico_id_fkey(id, primer_nombre, primer_apellido, codigo_tecnico),
        modalidad:modalidades(id, nombre),
        seccion:secciones(id, codigo)
      `)
      .eq('id', id)
      .single()

    if (error) return err(error.message, 404)
    return ok(data)
  }

  // ── Query base ────────────────────────────────────────────────────────
  // NOTA: en vez de mutar un único query builder, ahora guardamos el
  // filtro por rol como una función (filtroRol) que se vuelve a aplicar
  // cada vez que se reconstruye la consulta — esto es necesario para
  // poder paginar con fetchAllRows (PostgREST limita cada consulta a
  // 1000 filas, y con ~1800 inscripciones/año en todo el sistema el
  // administrador SÍ estaba superando ese límite en este endpoint).
  const selectInscripciones = `
      id, ciclo_escolar, estado, repite_etapa, version_libro, creado_en, fecha_inscripcion,
      estudiante:estudiantes(
        id, codigo_estudiante, primer_nombre, segundo_nombre,
        primer_apellido, segundo_apellido, fecha_nacimiento, cui,
        cui_pendiente, telefono, genero, correo, direccion,
        discapacidad_id, estado_civil_id, pueblo_id, idioma_id,
        tipo_vivienda_id, ocupacion, contacto_emergencia_nombre,
        contacto_emergencia_tel, contacto_emergencia_parent,
        estado_civil:catalogo_estado_civil(nombre),
        municipio:municipios(nombre, departamento:departamentos(nombre))
      ),
      etapa:etapas(id, codigo, nombre, nivel, orden),
      sede:sedes(id, nombre, municipio:municipios(nombre)),
      tecnico:tecnicos!inscripciones_tecnico_id_fkey(id, primer_nombre, primer_apellido, codigo_tecnico)
    `

  // Sin filtro adicional por defecto (administrador ve todo el ciclo)
  let filtroRol: (query: any) => any = (query) => query

  // ── Filtro por rol ────────────────────────────────────────────────────
  if (s.rol === 'tecnico') {
    const { data: tec, error: eTec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    if (eTec) return err('Error al resolver perfil de técnico: ' + eTec.message, 500)
    if (!tec) return err('❌ No se encontró tu perfil de técnico. Contacta al administrador.', 404)

    // CORREGIDO: el técnico ve inscripciones de TODAS sus sedes asignadas
    // No solo las que él inscribió directamente (tecnico_id)
    const { data: tecSedes } = await supabaseAdmin
      .from('tecnico_sedes')
      .select('sede_id')
      .eq('tecnico_id', tec.id)
      .eq('activo', true)

    // CORREGIDO: además de sus sedes propias, el técnico debe ver las sedes
    // de los ENLACES que tiene a cargo (vía tecnico_enlaces Y vía
    // enlaces_institucionales.tecnico_id — son dos fuentes distintas y un
    // enlace puede estar vinculado por cualquiera de las dos).
    const [{ data: vinculos }, { data: enlacesDirec }] = await Promise.all([
      supabaseAdmin.from('tecnico_enlaces')
        .select('enlace_id').eq('tecnico_id', tec.id).eq('activo', true)
        .eq('ciclo_escolar', parseInt(ciclo)),
      supabaseAdmin.from('enlaces_institucionales')
        .select('id, sede_id').eq('tecnico_id', tec.id).eq('activo', true),
    ])

    const idsEnlacesVinculados = (vinculos ?? []).map((v: any) => v.enlace_id)
    let sedeIdsDeEnlaces = (enlacesDirec ?? []).map((e: any) => e.sede_id)

    if (idsEnlacesVinculados.length > 0) {
      const { data: enlacesPorVinculo } = await supabaseAdmin
        .from('enlaces_institucionales')
        .select('sede_id')
        .in('id', idsEnlacesVinculados)
      sedeIdsDeEnlaces = [...sedeIdsDeEnlaces, ...(enlacesPorVinculo ?? []).map((e: any) => e.sede_id)]
    }

    const sedeIds = [...new Set([
      ...(tecSedes ?? []).map((ts: any) => ts.sede_id),
      ...sedeIdsDeEnlaces,
    ])].filter(Boolean)

    filtroRol = sedeIds.length > 0
      // Ver inscripciones de sus sedes (propias o de sus enlaces) O que él inscribió directamente
      ? (query) => query.or(`tecnico_id.eq.${tec.id},sede_id.in.(${sedeIds.join(',')})`)
      // Sin sedes ni enlaces asignados: ver solo las que él inscribió directamente
      : (query) => query.eq('tecnico_id', tec.id)
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl, error: eEnl } = await supabaseAdmin
      .from('enlaces_institucionales').select('sede_id, tecnico_id').eq('usuario_id', s.sub).maybeSingle()
    if (eEnl) return err('Error al resolver perfil de enlace: ' + eEnl.message, 500)
    if (!enl) return err('❌ No se encontró tu perfil de enlace institucional. Contacta al administrador.', 404)

    // El enlace solo ve los estudiantes que ÉL MISMO inscribió — no todos los
    // del técnico compartido ni todos los de la sede (eso es alcance del técnico).
    filtroRol = (query) => query.eq('creado_por', s.sub)
  }

  if (s.rol === 'director') {
    const { data: dir, error: eDir } = await supabaseAdmin
      .from('directores').select('sede_id, departamento_id').eq('usuario_id', s.sub).maybeSingle()
    if (eDir) return err('Error al resolver perfil de director: ' + eDir.message, 500)
    if (!dir) return err('❌ No se encontró tu perfil de director. Contacta al administrador.', 404)
    if (!dir.departamento_id && !dir.sede_id) {
      return err('❌ Tu perfil de director no tiene departamento ni sede asignados. Pide al administrador que te asigne un departamento desde Usuarios → editar tu perfil.', 400)
    }

    // CORREGIDO: el director ve TODO su departamento — todas las sedes,
    // todos los técnicos y todos los enlaces de esas sedes — no solo una
    // sede específica. Si aún no tiene departamento asignado (dato legado),
    // se usa su sede como respaldo temporal.
    let sedeIds: string[] = []
    if (dir.departamento_id) {
      const { data: sedesDepto } = await supabaseAdmin
        .from('sedes').select('id').eq('departamento_id', dir.departamento_id)
      sedeIds = (sedesDepto ?? []).map((sd: any) => sd.id)
    } else if (dir.sede_id) {
      sedeIds = [dir.sede_id]
    }

    let tecnicoIds: string[] = []
    if (sedeIds.length > 0) {
      const { data: tecnicosDeSedes } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('tecnico_id')
        .in('sede_id', sedeIds)
        .eq('activo', true)
      tecnicoIds = [...new Set((tecnicosDeSedes ?? []).map((t: any) => t.tecnico_id))]
    }

    if (sedeIds.length > 0 && tecnicoIds.length > 0) {
      filtroRol = (query) => query.or(`sede_id.in.(${sedeIds.join(',')}),tecnico_id.in.(${tecnicoIds.join(',')})`)
    } else if (sedeIds.length > 0) {
      filtroRol = (query) => query.in('sede_id', sedeIds)
    } else {
      return ok({ data: [] })
    }
  }

  // ── Construcción de la consulta (una función factory, para poder
  // reconstruirla en cada página de fetchAllRows) ─────────────────────
  const buildQuery = (from: number, to: number) => {
    let qq = supabaseAdmin
      .from('inscripciones')
      .select(selectInscripciones)
      .eq('ciclo_escolar', parseInt(ciclo))

    qq = filtroRol(qq)

    // ── Filtros opcionales ────────────────────────────────────────────
    if (etapa_id) qq = qq.eq('etapa_id', parseInt(etapa_id))

    // CORREGIDO: el filtro de sede ahora aplica para todos los roles —
    // para técnico/director/enlace actúa como un filtro adicional DENTRO
    // de lo que ya pueden ver (no amplía su alcance, solo lo acota).
    if (sede_id) qq = qq.eq('sede_id', sede_id)

    // CORREGIDO: 'todos' omite el filtro de estado; cualquier otro valor filtra
    if (estado && estado !== 'todos') qq = qq.eq('estado', estado)

    return qq.order('creado_en', { ascending: false }).range(from, to)
  }

  // Paginado con fetchAllRows: PostgREST limita a 1000 filas por consulta.
  // Con ~1800 inscripciones/año en todo el sistema, el administrador
  // (que ve todo el ciclo sin filtro de rol) SÍ podía quedar truncado.
  try {
    const data = await fetchAllRows<any>(buildQuery)
    return ok({ data })
  } catch (e: any) {
    return err(e.message ?? 'Error al obtener inscripciones', 500)
  }
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'enlace_institucional', 'administrador'].includes(s.rol))
    return err('Sin permiso para crear inscripciones', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const {
    estudiante_id, etapa_id, sede_id,
    modalidad_id, seccion_id, ciclo_escolar = 2026,
    version_libro = 'nuevo',
  } = b

  // CORREGIDO: tecnico_id es opcional en el body — se resuelve automáticamente
  let tecnico_id = b.tecnico_id ?? null

  if (!estudiante_id) return err('estudiante_id requerido')
  if (!etapa_id)      return err('etapa_id requerido')
  if (!sede_id)       return err('sede_id requerido')

  // Auto-resolver tecnico_id si no viene en el body
  if (!tecnico_id && s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    if (!tec) return err('❌ No se encontró tu perfil de técnico', 404)
    tecnico_id = tec.id
  }

  if (!tecnico_id && s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('tecnico_id').eq('usuario_id', s.sub).single()
    if (!enl?.tecnico_id) return err('❌ Tu perfil no tiene técnico asignado. Contacta al administrador.', 403)
    tecnico_id = enl.tecnico_id
  }

  if (!tecnico_id) return err('tecnico_id requerido')

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

  const { id, estado, fecha_inscripcion, etapa_id, version_libro } = b
  if (!id) return err('id requerido')
  if (estado === undefined && fecha_inscripcion === undefined && etapa_id === undefined && version_libro === undefined) {
    return err('Nada que actualizar', 400)
  }

  // El técnico solo puede editar SUS PROPIAS inscripciones (las que él registró)
  if (s.rol === 'tecnico' && (etapa_id !== undefined || version_libro !== undefined)) {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', id).maybeSingle()
    if (!tec || !insc || insc.tecnico_id !== tec.id) {
      return err('❌ Solo puedes editar la etapa/libro de estudiantes que tú mismo inscribiste.', 403)
    }
  }

  const upd: any = {}
  if (estado !== undefined) {
    if (!['en_curso', 'aprobado', 'reprobado', 'retirado', 'completada'].includes(estado))
      return err('estado inválido', 400)
    upd.estado = estado
  }
  if (fecha_inscripcion !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha_inscripcion)) {
      return err('fecha_inscripcion debe tener formato AAAA-MM-DD', 400)
    }
    // No permitir fechas futuras
    if (fecha_inscripcion > new Date().toISOString().slice(0, 10)) {
      return err('La fecha de inscripción no puede ser futura', 400)
    }
    upd.fecha_inscripcion = fecha_inscripcion
  }
  if (etapa_id !== undefined) {
    if (!etapa_id) return err('etapa_id inválida', 400)
    upd.etapa_id = parseInt(String(etapa_id))
  }
  if (version_libro !== undefined) {
    if (!['nuevo', 'viejo'].includes(version_libro)) return err('version_libro inválida', 400)
    upd.version_libro = version_libro
  }

  const { error } = await supabaseAdmin
    .from('inscripciones').update(upd).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: '✅ Actualizado correctamente' })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol)) return err('Sin permiso — solo administrador o director', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const [{ count: cTareas }, { count: cExamenes }] = await Promise.all([
    supabaseAdmin.from('notas_tareas').select('*', { count: 'exact', head: true }).eq('inscripcion_id', id),
    supabaseAdmin.from('notas_examenes').select('*', { count: 'exact', head: true }).eq('inscripcion_id', id),
  ])

  if ((cTareas ?? 0) > 0 || (cExamenes ?? 0) > 0) {
    return err('❌ No se puede eliminar: esta inscripción ya tiene notas registradas. Considera cambiar el estado a "retirado" en vez de eliminarla.', 400)
  }

  const { error } = await supabaseAdmin.from('inscripciones').delete().eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: '✅ Inscripción eliminada' })
}
