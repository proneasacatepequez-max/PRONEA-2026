// src/app/api/mi-perfil/route.ts
// FIX: el perfil del enlace ahora incluye sede y técnico responsable
// (necesario para que enlace/inscribir sepa si puede inscribir)
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (s.rol === 'tecnico') {
    const { data: tec, error } = await supabaseAdmin
      .from('tecnicos')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, codigo_tecnico, telefono, correo_personal, especialidad,
        fecha_inicio, activo, nivel_escolaridad, titulo_profesional,
        direccion, genero, municipio_id, departamento_id
      `)
      .eq('usuario_id', s.sub)
      .single()

    if (error || !tec) {
      return ok({ rol: 'tecnico', perfil: null, _aviso: 'Tu perfil de técnico no está configurado.' })
    }

    const [usu, deptoData, muniData, sedesData] = await Promise.allSettled([
      supabaseAdmin.from('usuarios').select('correo, ultimo_acceso, primer_ingreso').eq('id', s.sub).single(),
      tec.departamento_id ? supabaseAdmin.from('departamentos').select('id, nombre').eq('id', tec.departamento_id).single() : Promise.resolve({ data: null }),
      tec.municipio_id    ? supabaseAdmin.from('municipios').select('id, nombre').eq('id', tec.municipio_id).single()       : Promise.resolve({ data: null }),
      supabaseAdmin.from('tecnico_sedes').select('es_principal, activo, sede:sedes(id, nombre, municipio:municipios(nombre))').eq('tecnico_id', tec.id).eq('activo', true),
    ])

    return ok({
      rol: 'tecnico',
      perfil: {
        ...tec,
        usuario: usu.status === 'fulfilled' ? usu.value.data : null,
        departamento: deptoData.status === 'fulfilled' ? (deptoData.value as any).data : null,
        municipio: muniData.status === 'fulfilled' ? (muniData.value as any).data : null,
        sedes: sedesData.status === 'fulfilled' ? (sedesData.value as any).data : [],
      },
    })
  }

  if (s.rol === 'director') {
    const { data: dir, error } = await supabaseAdmin
      .from('directores')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, telefono, correo_personal, activo,
        nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
        departamento_id,
        municipio:municipios(id, nombre, departamento:departamentos(id, nombre)),
        sede:sedes(id, nombre, municipio:municipios(nombre)),
        departamento_gestion:departamentos!directores_departamento_id_fkey(id, nombre)
      `)
      .eq('usuario_id', s.sub)
      .single()

    if (error || !dir) return ok({ rol: 'director', perfil: null })

    const usu = await supabaseAdmin.from('usuarios').select('correo, ultimo_acceso').eq('id', s.sub).single()
    return ok({
      rol: 'director',
      perfil: {
        ...dir,
        departamento: (dir as any).municipio?.departamento ?? null,
        usuario: usu.data,
      },
    })
  }

  if (s.rol === 'enlace_institucional') {
    // FIX: incluir sede y tecnico responsable — clave para inscribir
    // FIX: incluir municipio/departamento de residencia — antes no se mostraban
    const { data: enl, error } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, telefono, correo_personal, cargo, activo,
        nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
        municipio:municipios(id, nombre, departamento:departamentos(id, nombre)),
        sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre, municipio:municipios(nombre)),
        tecnico:tecnicos!enlaces_institucionales_tecnico_id_fkey(id, primer_nombre, primer_apellido, codigo_tecnico)
      `)
      .eq('usuario_id', s.sub)
      .single()

    if (error || !enl) return ok({ rol: 'enlace_institucional', perfil: null })

    const usu = await supabaseAdmin.from('usuarios').select('correo, ultimo_acceso').eq('id', s.sub).single()
    return ok({
      rol: 'enlace_institucional',
      perfil: {
        ...enl,
        departamento: (enl as any).municipio?.departamento ?? null,
        institucion: (enl as any).sede ?? null, // "Institución" del enlace = su sede asignada
        usuario: usu.data,
      },
    })
  }

  if (s.rol === 'coordinador_digeex') {
    const { data: coord, error } = await supabaseAdmin
      .from('coordinadores_departamento')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        telefono, correo_personal, cargo, activo,
        nivel_escolaridad, titulo_profesional, direccion, genero, municipio_id,
        municipio:municipios(id, nombre),
        departamento:departamentos(id, nombre)
      `)
      .eq('usuario_id', s.sub)
      .single()

    if (error || !coord) return ok({ rol: 'coordinador_digeex', perfil: null })
    const usu = await supabaseAdmin.from('usuarios').select('correo, ultimo_acceso').eq('id', s.sub).single()
    return ok({ rol: 'coordinador_digeex', perfil: { ...coord, usuario: usu.data } })
  }

  if (s.rol === 'estudiante') {
    const { data: est, error } = await supabaseAdmin
      .from('estudiantes')
      .select(`
        id, codigo_estudiante, primer_nombre, segundo_nombre,
        primer_apellido, segundo_apellido, apellido_casada,
        cui, cui_pendiente, tipo_documento, fecha_nacimiento, genero,
        telefono, telefono_alternativo, correo, correo_alternativo,
        direccion, municipio_id, discapacidad_id, activo,
        trabaja_actualmente, ocupacion, lugar_trabajo,
        contacto_emergencia_nombre, contacto_emergencia_tel, contacto_emergencia_parent,
        meta_estudio, posee_internet, posee_computadora, observaciones_generales
      `)
      .eq('usuario_id', s.sub)
      .single()

    if (error || !est) return ok({ rol: 'estudiante', perfil: null })

    const [usu, muni, disc, inscData] = await Promise.allSettled([
      supabaseAdmin.from('usuarios').select('correo, ultimo_acceso').eq('id', s.sub).single(),
      est.municipio_id ? supabaseAdmin.from('municipios').select('id, nombre').eq('id', est.municipio_id).single() : Promise.resolve({ data: null }),
      est.discapacidad_id ? supabaseAdmin.from('tipos_discapacidad').select('id, nombre').eq('id', est.discapacidad_id).single() : Promise.resolve({ data: null }),
      supabaseAdmin.from('inscripciones').select(`
        id, ciclo_escolar, version_libro, estado,
        etapa:etapas(id, nombre), sede:sedes(id, nombre),
        tecnico:tecnicos!inscripciones_tecnico_id_fkey(id, primer_nombre, primer_apellido)
      `).eq('estudiante_id', est.id).eq('estado', 'en_curso').single(),
    ])

    return ok({
      rol: 'estudiante',
      perfil: {
        ...est,
        usuario: usu.status === 'fulfilled' ? usu.value.data : null,
        municipio: muni.status === 'fulfilled' ? (muni.value as any).data : null,
        discapacidad: disc.status === 'fulfilled' ? (disc.value as any).data : null,
      },
      inscripcion: inscData.status === 'fulfilled' ? (inscData.value as any).data : null,
    })
  }

  if (s.rol === 'administrador') {
    const { data: usu } = await supabaseAdmin
      .from('usuarios').select('id, correo, rol, activo, creado_en, ultimo_acceso').eq('id', s.sub).single()
    const { data: estab } = await supabaseAdmin
      .from('info_establecimiento')
      .select('director_nombre, director_titulo, telefono, whatsapp, correo, nombre_completo, nombre_corto, municipio, departamento, direccion, horario_atencion, facebook, sitio_web')
      .eq('id', 1).single()
    return ok({ rol: 'administrador', perfil: usu, establecimiento: estab })
  }

  return err('Rol no reconocido', 400)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))

  if (b.contrasena_actual !== undefined) {
    if (!b.contrasena_nueva) return err('contrasena_nueva requerida')
    if (b.contrasena_nueva.length < 8) return err('Mínimo 8 caracteres')
    if (b.contrasena_confirmar && b.contrasena_nueva !== b.contrasena_confirmar)
      return err('Las contraseñas no coinciden')

    const { data: u } = await supabaseAdmin.from('usuarios').select('contrasena_hash').eq('id', s.sub).single()
    if (!u) return err('Usuario no encontrado', 404)
    const valida = await bcrypt.compare(b.contrasena_actual, u.contrasena_hash)
    if (!valida) return err('La contraseña actual es incorrecta', 401)

    await supabaseAdmin.from('usuarios').update({
      contrasena_hash: await bcrypt.hash(b.contrasena_nueva, 10),
      primer_ingreso: false,
      actualizado_en: new Date().toISOString(),
    }).eq('id', s.sub)

    return ok({ ok: true, mensaje: 'Contraseña actualizada correctamente' })
  }

  const camposComunes = [
    'primer_nombre','segundo_nombre','primer_apellido','segundo_apellido',
    'telefono','correo_personal','direccion','genero',
    'municipio_id','departamento_id',
    'nivel_escolaridad','titulo_profesional',
    'especialidad','cargo',
  ]
  const upd: any = {}
  for (const campo of camposComunes) if (b[campo] !== undefined) upd[campo] = b[campo] === '' ? null : b[campo]
  if (upd.municipio_id)    upd.municipio_id    = parseInt(String(upd.municipio_id))
  if (upd.departamento_id) upd.departamento_id = parseInt(String(upd.departamento_id))

  if (upd.municipio_id && !upd.departamento_id) {
    const { data: muni } = await supabaseAdmin
      .from('municipios').select('departamento_id').eq('id', upd.municipio_id).single()
    if (muni?.departamento_id) upd.departamento_id = muni.departamento_id
  }

  if (s.rol === 'estudiante') {
    const camposEst = ['telefono','correo','direccion','municipio_id',
      'contacto_emergencia_nombre','contacto_emergencia_tel','contacto_emergencia_parent',
      'trabaja_actualmente','ocupacion','lugar_trabajo','meta_estudio','posee_internet','posee_computadora']
    const updEst: any = {}
    for (const c of camposEst) if (b[c] !== undefined) updEst[c] = b[c] === '' ? null : b[c]
    if (updEst.municipio_id) updEst.municipio_id = parseInt(String(updEst.municipio_id))
    if (Object.keys(updEst).length === 0) return err('Nada que actualizar')
    updEst.actualizado_en = new Date().toISOString()
    const { error } = await supabaseAdmin.from('estudiantes').update(updEst).eq('usuario_id', s.sub)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: 'Perfil actualizado' })
  }

  if (s.rol === 'administrador') {
    const camposEstab = ['director_nombre','director_titulo','telefono','whatsapp','correo',
      'nombre_completo','nombre_corto','municipio','departamento','direccion','horario_atencion','facebook','sitio_web']
    const updEstab: any = {}
    for (const c of camposEstab) if (b[c] !== undefined) updEstab[c] = b[c] || null
    if (Object.keys(updEstab).length > 0) {
      await supabaseAdmin.from('info_establecimiento')
        .update({ ...updEstab, actualizado_en: new Date().toISOString(), actualizado_por: s.sub }).eq('id', 1)
    }
    return ok({ ok: true, mensaje: 'Información actualizada' })
  }

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  const TABLA: Record<string, string> = {
    tecnico: 'tecnicos', director: 'directores',
    enlace_institucional: 'enlaces_institucionales', coordinador_digeex: 'coordinadores_departamento',
  }
  const tabla = TABLA[s.rol]
  if (!tabla) return err('Rol no soporta edición de perfil', 400)

  // Cada rol solo guarda los campos que existen en su tabla
  if (s.rol === 'director')   { delete upd.departamento_id; delete upd.cargo; delete upd.especialidad }
  if (s.rol === 'tecnico')    { delete upd.cargo }
  if (s.rol === 'enlace_institucional') { delete upd.departamento_id; delete upd.especialidad }
  if (s.rol === 'coordinador_digeex')   { delete upd.especialidad }

  // CORREGIDO: solo la tabla 'tecnicos' tiene columna actualizado_en —
  // directores, enlaces_institucionales y coordinadores_departamento NO
  // la tienen, y agregarla causaba "column ... does not exist" al guardar.
  if (s.rol === 'tecnico') upd.actualizado_en = new Date().toISOString()

  const { error } = await supabaseAdmin.from(tabla).update(upd).eq('usuario_id', s.sub)
  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: 'Perfil actualizado correctamente' })
}
