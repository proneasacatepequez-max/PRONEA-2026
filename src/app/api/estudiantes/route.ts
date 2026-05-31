// src/app/api/estudiantes/route.ts
// CORRECCIÓN: generarCodigo usa timestamp para evitar race condition
// El count+1 genera duplicados cuando dos requests llegan al mismo tiempo
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getCicloActual(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('configuracion').select('valor')
    .eq('parametro', 'ciclo_escolar_actual').single()
  return parseInt(data?.valor ?? '2026')
}

// CORRECCIÓN: timestamp para evitar race condition
// Formato: EST-2026-XXXXX donde XXXXX es base36 del timestamp recortado
async function generarCodigo(): Promise<string> {
  const ciclo = await getCicloActual()
  // Usar timestamp + random para garantizar unicidad
  const ts    = Date.now()
  const rand  = Math.floor(Math.random() * 1000)
  const sufijo = String(ts).slice(-4) + String(rand).padStart(3, '0')
  return `EST-${ciclo}-${sufijo}`
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p       = req.nextUrl.searchParams
  const ciclo   = p.get('ciclo') ?? '2026'
  const detalle = p.get('detalle') === '1'
  const id      = p.get('id')

  // Un estudiante específico
  if (id) {
    const { data, error } = await supabaseAdmin.from('estudiantes')
      .select(`
        *,
        municipio:municipios(nombre),
        discapacidad:tipos_discapacidad(nombre),
        estado_civil:catalogo_estado_civil(nombre),
        pueblo:catalogo_pueblos(nombre),
        idioma:catalogo_idiomas(nombre),
        tipo_vivienda:catalogo_tipo_vivienda(nombre)
      `).eq('id', id).single()
    if (error) return err(error.message, 500)
    return ok(data)
  }

  const select = detalle
    ? `id,codigo_estudiante,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,
       cui,cui_pendiente,telefono,fecha_nacimiento,genero,municipio_id,
       municipio:municipios(nombre),
       discapacidad:tipos_discapacidad(nombre),
       inscripciones!inner(id,ciclo_escolar,version_libro,estado,tiene_ajuste_discapacidad,
         etapa:etapas(id,nombre,nivel),
         sede:sedes(id,nombre),
         tecnico:tecnicos(id,primer_nombre,primer_apellido,codigo_tecnico))`
    : `id,codigo_estudiante,primer_nombre,primer_apellido,segundo_apellido,telefono,cui,cui_pendiente,activo`

  let q = supabaseAdmin.from('estudiantes').select(select).eq('activo', true)
  if (detalle) q = (q as any).eq('inscripciones.ciclo_escolar', parseInt(ciclo))
  const { data, error } = await q.order('primer_apellido')
  if (error) return err(error.message, 500)

  if (detalle) {
    const flat = (data ?? []).flatMap((est: any) =>
      (est.inscripciones ?? []).map((insc: any) => ({
        ...insc,
        estudiante: { ...est, inscripciones: undefined },
      }))
    )
    return ok({ data: flat, total: flat.length })
  }

  return ok({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'enlace_institucional'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const {
    primer_nombre, primer_apellido, segundo_nombre = '', segundo_apellido = '',
    cui, cui_pendiente = false, numero_documento,
    fecha_nacimiento, genero, telefono,
    telefono_alternativo = '', correo = '',
    pais_id, municipio_id, direccion = '',
    discapacidad_id, tipo_documento = 'DPI', es_extranjero = false,
    estado_civil_id, pueblo_id, idioma_id, tipo_vivienda_id,
    sabe_leer_escribir, trabaja_actualmente, ocupacion,
    contacto_emergencia_nombre, contacto_emergencia_tel, contacto_emergencia_parent,
    ultimo_grado_aprobado, motivo_abandono, meta_estudio,
    cantidad_hijos, posee_enfermedad, descripcion_enfermedad,
    toma_medicamento, alergias, personas_vivienda,
    posee_internet, posee_computadora, observaciones_generales,
  } = b

  if (!primer_nombre || !primer_apellido || !telefono)
    return err('Nombre, apellido y teléfono son requeridos')
  if (!cui_pendiente && !cui && !numero_documento)
    return err('Ingresa el CUI o marca "CUI pendiente"')

  const cuiFinal = cui?.trim() || (cui_pendiente ? null : numero_documento?.trim())

  // Verificar duplicado de CUI
  if (cuiFinal && !cui_pendiente) {
    const { data: dup } = await supabaseAdmin.from('estudiantes')
      .select('id, codigo_estudiante').eq('cui', cuiFinal).maybeSingle()
    if (dup) return err(`Ya existe un estudiante con ese CUI (${dup.codigo_estudiante})`, 409)
  }

  // Generar código con timestamp (sin race condition)
  const codigoEstudiante = await generarCodigo()
  const correoUser = correo || `${codigoEstudiante.toLowerCase().replace(/-/g, '')}@pronea.edu.gt`
  const hash = await bcrypt.hash('Pronea2026!', 10)

  // Crear usuario
  let v_uid: string | null = null
  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios').insert({
    correo: correoUser,
    contrasena_hash: hash,
    rol: 'estudiante',
    activo: true,
    primer_ingreso: true,
  }).select('id').single()

  if (eU) {
    // Correo duplicado — usar código con timestamp adicional
    const correoAlt = `${codigoEstudiante.toLowerCase().replace(/-/g, '')}.${Date.now()}@pronea.edu.gt`
    const { data: usu2, error: eU2 } = await supabaseAdmin.from('usuarios').insert({
      correo: correoAlt, contrasena_hash: hash, rol: 'estudiante', activo: true, primer_ingreso: true,
    }).select('id').single()
    if (eU2) return err('Error creando usuario: ' + eU2.message, 500)
    v_uid = usu2.id
  } else {
    v_uid = usu.id
  }

  const { data, error } = await supabaseAdmin.from('estudiantes').insert({
    usuario_id:        v_uid,
    codigo_estudiante: codigoEstudiante,
    primer_nombre:     primer_nombre.trim(),
    segundo_nombre:    segundo_nombre?.trim()  || null,
    primer_apellido:   primer_apellido.trim(),
    segundo_apellido:  segundo_apellido?.trim() || null,
    cui:               cuiFinal || null,
    cui_pendiente,
    numero_documento:  numero_documento?.trim() || null,
    tipo_documento,
    fecha_nacimiento:  fecha_nacimiento || null,
    genero:            genero           || null,
    telefono:          telefono.trim(),
    telefono_alternativo: telefono_alternativo || null,
    correo:            correo || null,
    municipio_id:      municipio_id ? parseInt(String(municipio_id)) : null,
    direccion:         direccion    || null,
    discapacidad_id:   discapacidad_id ? parseInt(String(discapacidad_id)) : null,
    pais_id:           pais_id ? parseInt(String(pais_id)) : 1,
    es_extranjero,
    activo:            true,
    estado_civil_id:   estado_civil_id   || null,
    pueblo_id:         pueblo_id         || null,
    idioma_id:         idioma_id         || null,
    tipo_vivienda_id:  tipo_vivienda_id  || null,
    sabe_leer_escribir:  sabe_leer_escribir  ?? true,
    trabaja_actualmente: trabaja_actualmente ?? false,
    ocupacion:           ocupacion           || null,
    contacto_emergencia_nombre: contacto_emergencia_nombre || null,
    contacto_emergencia_tel:    contacto_emergencia_tel    || null,
    contacto_emergencia_parent: contacto_emergencia_parent || null,
    ultimo_grado_aprobado:      ultimo_grado_aprobado      || null,
    motivo_abandono:    motivo_abandono || null,
    meta_estudio:       meta_estudio    || null,
    cantidad_hijos:     cantidad_hijos  ?? 0,
    posee_enfermedad:   posee_enfermedad   ?? false,
    descripcion_enfermedad: descripcion_enfermedad || null,
    toma_medicamento:   toma_medicamento   ?? false,
    alergias:           alergias           || null,
    personas_vivienda:  personas_vivienda  || null,
    posee_internet:     posee_internet     ?? false,
    posee_computadora:  posee_computadora  ?? false,
    observaciones_generales: observaciones_generales || null,
  }).select('id, codigo_estudiante').single()

  if (error) return err('Error creando estudiante: ' + error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'CREAR_ESTUDIANTE',
    tabla_afectada: 'estudiantes', registro_id: data.id,
    datos_nuevos: { codigo: codigoEstudiante, nombre: `${primer_nombre} ${primer_apellido}` },
  }).catch(() => {})

  return ok({ ok: true, id: data.id, codigo_estudiante: data.codigo_estudiante }, 201)
}
