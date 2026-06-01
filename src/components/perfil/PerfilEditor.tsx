// src/app/api/mi-perfil/route.ts
// COMPLETO: GET devuelve todos los campos del perfil por rol
// PATCH actualiza datos personales + contraseña
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

const PERFIL_SELECT_TECNICO = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  cui, codigo_tecnico, telefono, correo_personal, especialidad,
  fecha_inicio, activo, nivel_escolaridad, titulo_profesional,
  direccion, genero, municipio_id,
  departamento:departamentos(id, nombre),
  municipio:municipios(id, nombre),
  usuario:usuarios!tecnicos_usuario_id_fkey(id, correo, ultimo_acceso, primer_ingreso),
  sedes:tecnico_sedes(
    es_principal, activo,
    sede:sedes(id, nombre, municipio:municipios(nombre))
  )
`

const PERFIL_SELECT_DIRECTOR = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  cui, telefono, correo_personal, activo,
  nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
  usuario:usuarios!directores_usuario_id_fkey(id, correo, ultimo_acceso),
  sede:sedes(id, nombre, municipio:municipios(nombre)),
  municipio:municipios(id, nombre)
`

const PERFIL_SELECT_ENLACE = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  cui, telefono, correo_personal, cargo, activo,
  nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
  usuario:usuarios!enlaces_institucionales_usuario_id_fkey(id, correo, ultimo_acceso),
  institucion:instituciones(id, nombre, tipo, municipio:municipios(nombre)),
  municipio:municipios(id, nombre)
`

const PERFIL_SELECT_COORDINADOR = `
  id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
  telefono, correo_personal, cargo, activo,
  nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
  usuario:usuarios!coordinadores_departamento_usuario_id_fkey(id, correo, ultimo_acceso),
  departamento:departamentos(id, nombre),
  municipio:municipios(id, nombre)
`

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (s.rol === 'estudiante') {
    const { data } = await supabaseAdmin.from('estudiantes').select(`
      id, codigo_estudiante, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      apellido_casada, cui, cui_pendiente, tipo_documento, numero_documento,
      fecha_nacimiento, genero, telefono, telefono_alternativo, correo, correo_alternativo,
      direccion, discapacidad_id, es_extranjero, activo,
      estado_civil_id, pueblo_id, idioma_id, tipo_vivienda_id,
      sabe_leer_escribir, trabaja_actualmente, ocupacion, lugar_trabajo,
      contacto_emergencia_nombre, contacto_emergencia_tel, contacto_emergencia_parent,
      ultimo_grado_aprobado, establecimiento_ultimo_grado, motivo_abandono, meta_estudio,
      cantidad_hijos, posee_enfermedad, descripcion_enfermedad,
      toma_medicamento, descripcion_medicamento, alergias, personas_vivienda,
      posee_internet, posee_computadora, observaciones_generales,
      municipio:municipios(id, nombre),
      discapacidad:tipos_discapacidad(id, nombre),
      estado_civil:catalogo_estado_civil(id, nombre),
      pueblo:catalogo_pueblos(id, nombre),
      idioma:catalogo_idiomas(id, nombre),
      tipo_vivienda:catalogo_tipo_vivienda(id, nombre),
      usuario:usuarios!estudiantes_usuario_id_fkey(correo, ultimo_acceso)
    `).eq('usuario_id', s.sub).single()
    return ok({ rol: 'estudiante', perfil: data })
  }

  if (s.rol === 'tecnico') {
    const { data } = await supabaseAdmin.from('tecnicos')
      .select(PERFIL_SELECT_TECNICO).eq('usuario_id', s.sub).single()
    return ok({ rol: 'tecnico', perfil: data })
  }

  if (s.rol === 'director') {
    const { data } = await supabaseAdmin.from('directores')
      .select(PERFIL_SELECT_DIRECTOR).eq('usuario_id', s.sub).single()
    return ok({ rol: 'director', perfil: data })
  }

  if (s.rol === 'enlace_institucional') {
    const { data } = await supabaseAdmin.from('enlaces_institucionales')
      .select(PERFIL_SELECT_ENLACE).eq('usuario_id', s.sub).single()
    return ok({ rol: 'enlace_institucional', perfil: data })
  }

  if (s.rol === 'coordinador_digeex') {
    const { data } = await supabaseAdmin.from('coordinadores_departamento')
      .select(PERFIL_SELECT_COORDINADOR).eq('usuario_id', s.sub).single()
    return ok({ rol: 'coordinador_digeex', perfil: data })
  }

  if (s.rol === 'administrador') {
    const { data: usu } = await supabaseAdmin.from('usuarios')
      .select('id, correo, rol, activo, creado_en, ultimo_acceso').eq('id', s.sub).single()
    const { data: estab } = await supabaseAdmin.from('info_establecimiento')
      .select('director_nombre, director_titulo, telefono, whatsapp, correo').eq('id', 1).single()
    return ok({ rol: 'administrador', perfil: usu, establecimiento: estab })
  }

  return err('Rol no reconocido', 400)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))

  // Cambio de contraseña
  if (b.contrasena_actual !== undefined) {
    if (!b.contrasena_nueva) return err('contrasena_nueva requerida')
    if (b.contrasena_nueva.length < 8) return err('Mínimo 8 caracteres')
    if (b.contrasena_nueva !== b.contrasena_confirmar && b.contrasena_confirmar)
      return err('Las contraseñas no coinciden')

    const { data: u } = await supabaseAdmin.from('usuarios')
      .select('contrasena_hash').eq('id', s.sub).single()
    if (!u) return err('Usuario no encontrado', 404)

    const valida = await bcrypt.compare(b.contrasena_actual, u.contrasena_hash)
    if (!valida) return err('La contraseña actual es incorrecta', 401)

    await supabaseAdmin.from('usuarios').update({
      contrasena_hash: await bcrypt.hash(b.contrasena_nueva, 10),
      primer_ingreso:  false,
      actualizado_en:  new Date().toISOString(),
    }).eq('id', s.sub)

    return ok({ ok: true, mensaje: 'Contraseña actualizada' })
  }

  // Actualizar datos del perfil
  const camposComunes = [
    'primer_nombre','segundo_nombre','primer_apellido','segundo_apellido',
    'telefono','correo_personal','direccion','genero','municipio_id',
    'nivel_escolaridad','titulo_profesional',
  ]

  const upd: any = {}
  for (const campo of camposComunes) {
    if (b[campo] !== undefined) upd[campo] = b[campo] || null
  }

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  let tabla = ''
  if (s.rol === 'tecnico')              tabla = 'tecnicos'
  else if (s.rol === 'director')        tabla = 'directores'
  else if (s.rol === 'enlace_institucional') tabla = 'enlaces_institucionales'
  else if (s.rol === 'coordinador_digeex')   tabla = 'coordinadores_departamento'
  else if (s.rol === 'estudiante') {
    // Estudiante puede actualizar campos específicos
    const camposEst = ['telefono','correo','direccion','municipio_id',
      'contacto_emergencia_nombre','contacto_emergencia_tel','contacto_emergencia_parent',
      'trabaja_actualmente','ocupacion','lugar_trabajo','meta_estudio',
      'posee_internet','posee_computadora']
    const updEst: any = {}
    for (const c of camposEst) if (b[c] !== undefined) updEst[c] = b[c] || null
    if (Object.keys(updEst).length === 0) return err('Nada que actualizar')
    const { error } = await supabaseAdmin.from('estudiantes')
      .update({ ...updEst, actualizado_en: new Date().toISOString() }).eq('usuario_id', s.sub)
    if (error) return err(error.message, 500)
    return ok({ ok: true })
  }
  else if (s.rol === 'administrador') {
    // Admin actualiza info_establecimiento
    const camposEstab = ['director_nombre','director_titulo','telefono','whatsapp','correo',
      'nombre_completo','nombre_corto','municipio','departamento','direccion','horario_atencion',
      'facebook','sitio_web']
    const updEstab: any = {}
    for (const c of camposEstab) if (b[c] !== undefined) updEstab[c] = b[c] || null
    if (Object.keys(updEstab).length > 0) {
      await supabaseAdmin.from('info_establecimiento')
        .update({ ...updEstab, actualizado_en: new Date().toISOString(), actualizado_por: s.sub })
        .eq('id', 1)
    }
    return ok({ ok: true })
  }

  if (!tabla) return err('Rol no soporta edición de perfil', 400)

  upd.actualizado_en = new Date().toISOString()
  const { error } = await supabaseAdmin.from(tabla).update(upd).eq('usuario_id', s.sub)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: 'Perfil actualizado' })
}
