// src/app/api/estudiantes/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// Generar código de estudiante único
async function generarCodigo(): Promise<string> {
  const { count } = await supabaseAdmin.from('estudiantes').select('*', { count: 'exact', head: true })
  const num = String((count ?? 0) + 1).padStart(5, '0')
  return `EST-2026-${num}`
}

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const p = req.nextUrl.searchParams
  const ciclo  = p.get('ciclo') ?? '2026'
  const detalle = p.get('detalle') === '1'

  let select = detalle
    ? `id,codigo_estudiante,primer_nombre,primer_apellido,segundo_nombre,segundo_apellido,
       cui,telefono,fecha_nacimiento,genero,municipio_id,departamento,
       municipio:municipios(nombre),
       discapacidad:tipos_discapacidad(nombre),
       inscripciones!inner(id,ciclo_escolar,version_libro,estado,
         etapa:etapas(id,nombre),
         sede:sedes(id,nombre),
         tecnico:tecnicos(id,primer_nombre,primer_apellido))`
    : `id,codigo_estudiante,primer_nombre,primer_apellido,telefono,cui`

  let q = supabaseAdmin.from('estudiantes').select(select).eq('activo', true)

  if (detalle) q = (q as any).eq('inscripciones.ciclo_escolar', parseInt(ciclo))

  const { data, error } = await q.order('primer_apellido')
  if (error) return err(error.message, 500)

  // Aplanar inscripciones para el coordinador
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
  if (!s || !['tecnico', 'administrador', 'enlace_institucional'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  const b = await req.json().catch(() => ({}))
  const {
    primer_nombre, primer_apellido, segundo_nombre, segundo_apellido,
    cui, cui_pendiente = false, numero_documento,
    fecha_nacimiento, genero,
    telefono, telefono_alternativo = '', correo = '',
    pais_id, municipio_id, departamento_id, direccion = '',
    discapacidad_id,
    tipo_documento = 'DPI', es_extranjero = false,
  } = b

  if (!primer_nombre || !primer_apellido || !telefono) {
    return err('Nombre, apellido y teléfono son requeridos')
  }

  if (!cui_pendiente && !cui && !numero_documento) {
    return err('Debes ingresar el CUI o marcar "CUI pendiente"')
  }

  // CUI o documento temporal
  const cuiFinal = cui?.trim() || (cui_pendiente ? null : numero_documento?.trim())

  // Verificar CUI duplicado si no es pendiente
  if (cuiFinal && !cui_pendiente) {
    const { data: dup } = await supabaseAdmin.from('estudiantes')
      .select('id, codigo_estudiante').eq('cui', cuiFinal).maybeSingle()
    if (dup) return err(`Ya existe un estudiante con CUI ${cuiFinal} (${dup.codigo_estudiante})`, 409)
  }

  // Generar código
  const codigoEstudiante = await generarCodigo()

  // Crear usuario para el estudiante
  const correoUser = correo || `${codigoEstudiante.toLowerCase()}@pronea.edu.gt`
  const hash = await bcrypt.hash('Pronea2026', 10)

  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios').insert({
    correo:          correoUser,
    contrasena_hash: hash,
    rol:             'estudiante',
    activo:          true,
    primer_ingreso:  true,
  }).select('id').single()

  if (eU) {
    // Si el correo ya existe, crear uno único
    const correoAlt = `${codigoEstudiante.toLowerCase()}@pronea-${Date.now()}.edu.gt`
    const { data: usu2, error: eU2 } = await supabaseAdmin.from('usuarios').insert({
      correo: correoAlt, contrasena_hash: hash, rol: 'estudiante', activo: true, primer_ingreso: true,
    }).select('id').single()
    if (eU2) return err('Error creando usuario del estudiante: ' + eU2.message, 500)
    Object.assign(usu!, usu2)
  }

  // Crear estudiante
  const { data, error } = await supabaseAdmin.from('estudiantes').insert({
    usuario_id:         (usu as any).id,
    codigo_estudiante:  codigoEstudiante,
    primer_nombre:      primer_nombre.trim(),
    segundo_nombre:     segundo_nombre?.trim() || null,
    primer_apellido:    primer_apellido.trim(),
    segundo_apellido:   segundo_apellido?.trim() || null,
    cui:                cuiFinal || null,
    cui_pendiente,
    numero_documento:   numero_documento?.trim() || null,
    tipo_documento,
    fecha_nacimiento:   fecha_nacimiento || null,
    genero:             genero || null,
    telefono:           telefono.trim(),
    telefono_alternativo: telefono_alternativo || null,
    correo:             correo || null,
    municipio_id:       municipio_id ? parseInt(String(municipio_id)) : null,
    departamento:       b.departamento || 'Sacatepéquez',
    direccion:          direccion || null,
    discapacidad_id:    discapacidad_id ? parseInt(String(discapacidad_id)) : null,
    pais_id:            pais_id ? parseInt(String(pais_id)) : 1,
    es_extranjero,
    activo:             true,
  }).select('id, codigo_estudiante').single()

  if (error) return err('Error creando estudiante: ' + error.message, 500)

  try {
    await supabaseAdmin.from('auditoria').insert({
      usuario_id: s.sub, accion: 'CREAR_ESTUDIANTE',
      tabla_afectada: 'estudiantes', registro_id: data.id,
      datos_nuevos: { codigo: codigoEstudiante, nombre: `${primer_nombre} ${primer_apellido}` },
    })
  } catch { }

  return ok({ ok: true, id: data.id, codigo_estudiante: data.codigo_estudiante }, 201)
}
