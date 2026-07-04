// src/app/api/estudiantes/route.ts
// FIX CRÍTICO: eliminar 'departamento' del insert (columna puede no existir)
// Se usa municipio_id para la ubicación geográfica
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

async function generarCodigo(): Promise<string> {
  const ciclo = await getCicloActual()
  const ts    = Date.now()
  const rand  = Math.floor(Math.random() * 1000)
  return `EST-${ciclo}-${String(ts).slice(-4)}${String(rand).padStart(3, '0')}`
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p     = req.nextUrl.searchParams
  const id    = p.get('id')

  if (id) {
    const { data, error } = await supabaseAdmin.from('estudiantes').select(`
      *,
      municipio:municipios(id,nombre,departamento_id),
      discapacidad:tipos_discapacidad(id,nombre),
      inscripciones(id, ciclo_escolar, estado, version_libro,
        etapa:etapas(id,nombre), sede:sedes(id,nombre),
        tecnico:tecnicos!inscripciones_tecnico_id_fkey(id,primer_nombre,primer_apellido))
    `).eq('id', id).single()
    if (error) return err(error.message, 500)
    return ok(data)
  }

  const ciclo  = p.get('ciclo')   ?? '2026'
  const detalle = p.get('detalle') === '1'

  let q = supabaseAdmin.from('estudiantes')
    .select(`id, codigo_estudiante, primer_nombre, primer_apellido,
             segundo_apellido, telefono, cui, cui_pendiente, activo`)
    .eq('activo', true)
    .order('primer_apellido')

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok({ data: data ?? [], total: (data ?? []).length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'enlace_institucional'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const {
    primer_nombre, primer_apellido,
    segundo_nombre = '', segundo_apellido = '',
    cui, cui_pendiente = false,
    codigo_estudiante: codigoMineduc,
    fecha_nacimiento, genero, telefono,
    telefono_alternativo = '', correo = '',
    municipio_id, direccion = '',
    discapacidad_id, tipo_documento = 'DPI',
    es_extranjero = false, numero_documento = '',
  } = b

  if (!primer_nombre?.trim())   return err('Primer nombre requerido')
  if (!primer_apellido?.trim()) return err('Primer apellido requerido')
  if (!telefono?.trim())        return err('Teléfono requerido')

  // Validar CUI solo si tiene valor real
  const cuiLimpio = cui?.trim() ?? ''
  const cuiFinal  = !cui_pendiente && cuiLimpio.length > 0 ? cuiLimpio : null

  if (cuiFinal) {
    const { data: dup } = await supabaseAdmin.from('estudiantes')
      .select('id, codigo_estudiante, primer_nombre, primer_apellido')
      .eq('cui', cuiFinal).maybeSingle()
    if (dup) {
      return err(
        `Ya existe un estudiante con ese CUI: ${dup.primer_nombre} ${dup.primer_apellido} (${dup.codigo_estudiante})`,
        409
      )
    }
  }

  const codigoEstudiante = codigoMineduc?.trim() || await generarCodigo()
  const correoUser       = correo?.trim() || `${codigoEstudiante.toLowerCase().replace(/-/g, '')}@pronea.edu.gt`
  const hash             = await bcrypt.hash('Pronea2026!', 10)

  // Crear usuario
  let v_uid: string
  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios').insert({
    correo: correoUser, contrasena_hash: hash,
    rol: 'estudiante', activo: true, primer_ingreso: true,
  }).select('id').single()

  if (eU) {
    const correoAlt = `${codigoEstudiante.toLowerCase().replace(/-/g, '')}.${Date.now()}@pronea.edu.gt`
    const { data: usu2, error: eU2 } = await supabaseAdmin.from('usuarios').insert({
      correo: correoAlt, contrasena_hash: hash, rol: 'estudiante', activo: true, primer_ingreso: true,
    }).select('id').single()
    if (eU2) return err('Error creando usuario: ' + eU2.message, 500)
    v_uid = usu2.id
  } else {
    v_uid = usu.id
  }

  // Insert estudiante — SIN la columna 'departamento' que puede no existir
  const insertData: any = {
    usuario_id:        v_uid,
    codigo_estudiante: codigoEstudiante,
    primer_nombre:     primer_nombre.trim(),
    segundo_nombre:    segundo_nombre?.trim()   || null,
    primer_apellido:   primer_apellido.trim(),
    segundo_apellido:  segundo_apellido?.trim() || null,
    cui:               cuiFinal,
    cui_pendiente:     Boolean(cui_pendiente),
    numero_documento:  numero_documento?.trim() || null,
    tipo_documento,
    fecha_nacimiento:  fecha_nacimiento || null,
    genero:            genero           || null,
    telefono:          telefono.trim(),
    telefono_alternativo: telefono_alternativo || null,
    correo:            correo?.trim()   || null,
    municipio_id:      municipio_id     ? parseInt(String(municipio_id)) : null,
    direccion:         direccion        || null,
    discapacidad_id:   discapacidad_id  ? parseInt(String(discapacidad_id)) : null,
    pais_id:           1, // Guatemala siempre
    es_extranjero:     Boolean(es_extranjero),
    activo:            true,
  }

  // Campos opcionales — solo agregar si vienen en el body
  const camposOpcionales = [
    'estado_civil_id','pueblo_id','idioma_id','tipo_vivienda_id',
    'sabe_leer_escribir','trabaja_actualmente','ocupacion','lugar_trabajo',
    'contacto_emergencia_nombre','contacto_emergencia_tel','contacto_emergencia_parent',
    'ultimo_grado_aprobado','motivo_abandono','meta_estudio',
    'cantidad_hijos','posee_enfermedad','descripcion_enfermedad',
    'toma_medicamento','alergias','personas_vivienda',
    'posee_internet','posee_computadora','observaciones_generales',
  ]
  for (const campo of camposOpcionales) {
    if (b[campo] !== undefined) insertData[campo] = b[campo] || null
  }

  const { data, error } = await supabaseAdmin
    .from('estudiantes')
    .insert(insertData)
    .select('id, codigo_estudiante')
    .single()

  if (error) return err('Error al registrar estudiante: ' + error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'CREAR_ESTUDIANTE',
    tabla_afectada: 'estudiantes', registro_id: data.id,
    datos_nuevos: { codigo: codigoEstudiante, nombre: `${primer_nombre} ${primer_apellido}` },
  }).catch(() => {})

  return ok({ ok: true, id: data.id, codigo_estudiante: data.codigo_estudiante }, 201)
}

