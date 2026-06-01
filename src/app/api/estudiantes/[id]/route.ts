// src/app/api/estudiantes/[id]/route.ts — NUEVA RUTA
// PATCH: edita datos de un estudiante específico
// Roles permitidos: tecnico, enlace_institucional, administrador, director
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('estudiantes')
    .select(`
      id, codigo_estudiante, codigo_sireex,
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellido_casada,
      cui, cui_pendiente, tipo_documento, numero_documento, es_extranjero,
      fecha_nacimiento, genero, telefono, telefono_alternativo,
      correo, correo_alternativo, correo_classroom, direccion,
      municipio_id, discapacidad_id, activo, creado_en, actualizado_en,
      estado_civil_id, pueblo_id, idioma_id, tipo_vivienda_id,
      sabe_leer_escribir, trabaja_actualmente, ocupacion, lugar_trabajo,
      contacto_emergencia_nombre, contacto_emergencia_tel, contacto_emergencia_parent,
      ultimo_grado_aprobado, establecimiento_ultimo_grado, motivo_abandono, meta_estudio,
      cantidad_hijos, posee_enfermedad, descripcion_enfermedad,
      toma_medicamento, descripcion_medicamento, alergias,
      personas_vivienda, posee_internet, posee_computadora, observaciones_generales,
      municipio:municipios(id, nombre, departamento_id),
      discapacidad:tipos_discapacidad(id, nombre),
      inscripciones(id, ciclo_escolar, estado, version_libro,
        etapa:etapas(id, nombre), sede:sedes(id, nombre),
        tecnico:tecnicos(id, primer_nombre, primer_apellido))
    `)
    .eq('id', id)
    .single()

  if (error) return err(error.message, 500)
  return ok(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const rolesPermitidos = ['tecnico', 'enlace_institucional', 'administrador', 'director']
  if (!rolesPermitidos.includes(s.rol)) return err('Sin permiso', 403)

  const { id } = await params
  const b = await req.json().catch(() => ({}))

  // Campos editables (el estudiante NO puede editar su propio código MINEDUC)
  const campos = [
    'codigo_estudiante', 'codigo_sireex', // Editable por técnico/enlace/admin
    'primer_nombre', 'segundo_nombre', 'primer_apellido', 'segundo_apellido', 'apellido_casada',
    'cui', 'cui_pendiente', 'tipo_documento', 'numero_documento',
    'fecha_nacimiento', 'genero', 'telefono', 'telefono_alternativo',
    'correo', 'correo_alternativo', 'correo_classroom',
    'direccion', 'municipio_id', 'discapacidad_id',
    'estado_civil_id', 'pueblo_id', 'idioma_id', 'tipo_vivienda_id',
    'sabe_leer_escribir', 'trabaja_actualmente', 'ocupacion', 'lugar_trabajo',
    'contacto_emergencia_nombre', 'contacto_emergencia_tel', 'contacto_emergencia_parent',
    'ultimo_grado_aprobado', 'establecimiento_ultimo_grado', 'motivo_abandono', 'meta_estudio',
    'cantidad_hijos', 'posee_enfermedad', 'descripcion_enfermedad',
    'toma_medicamento', 'descripcion_medicamento', 'alergias',
    'personas_vivienda', 'posee_internet', 'posee_computadora', 'observaciones_generales',
  ]

  const upd: any = {}
  for (const campo of campos) {
    if (b[campo] !== undefined) {
      upd[campo] = b[campo] === '' ? null : b[campo]
    }
  }

  // municipio_id debe ser número
  if (upd.municipio_id) upd.municipio_id = parseInt(String(upd.municipio_id))
  if (upd.discapacidad_id) upd.discapacidad_id = parseInt(String(upd.discapacidad_id))

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  upd.actualizado_en = new Date().toISOString()

  const { error } = await supabaseAdmin
    .from('estudiantes')
    .update(upd)
    .eq('id', id)

  if (error) return err(error.message, 500)

  // Auditoría
  await supabaseAdmin.from('auditoria').insert({
    usuario_id:     s.sub,
    accion:         'EDITAR_ESTUDIANTE',
    tabla_afectada: 'estudiantes',
    registro_id:    id,
    datos_nuevos:   upd,
  }).catch(() => {})

  return ok({ ok: true, mensaje: 'Estudiante actualizado correctamente' })
}
