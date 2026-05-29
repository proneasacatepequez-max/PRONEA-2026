// src/app/api/mi-perfil/route.ts
// CORRECCIÓN: devuelve perfil completo para TODOS los roles
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  if (s.rol === 'estudiante') {
    const { data: est } = await supabaseAdmin
      .from('estudiantes')
      .select(`
        id, codigo_estudiante, primer_nombre, segundo_nombre,
        primer_apellido, segundo_apellido, cui, cui_pendiente,
        telefono, correo, fecha_nacimiento, genero, direccion,
        municipio:municipios(nombre),
        discapacidad:tipos_discapacidad(nombre),
        inscripciones(
          id, version_libro, estado, ciclo_escolar,
          etapa:etapas(nombre),
          sede:sedes(nombre)
        )
      `)
      .eq('usuario_id', s.sub)
      .single()
    const inscripcion = (est?.inscripciones as any[])?.find((i: any) => i.estado === 'en_curso') ?? null
    return ok({ rol: 'estudiante', perfil: est, inscripcion })
  }

  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin
      .from('tecnicos')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, codigo_tecnico, telefono, especialidad, fecha_inicio, activo,
        departamento:departamentos(nombre),
        usuario:usuarios!tecnicos_usuario_id_fkey(correo, ultimo_acceso, primer_ingreso),
        sedes:tecnico_sedes(
          es_principal, activo,
          sede:sedes(id, nombre, municipio:municipios(nombre))
        )
      `)
      .eq('usuario_id', s.sub)
      .single()
    return ok({ rol: 'tecnico', perfil: tec })
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, telefono, activo,
        usuario:usuarios!directores_usuario_id_fkey(correo, ultimo_acceso),
        sede:sedes(id, nombre, municipio:municipios(nombre))
      `)
      .eq('usuario_id', s.sub)
      .single()
    return ok({ rol: 'director', perfil: dir })
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, telefono, cargo, activo,
        usuario:usuarios!enlaces_institucionales_usuario_id_fkey(correo, ultimo_acceso),
        institucion:instituciones(id, nombre, tipo, municipio:municipios(nombre))
      `)
      .eq('usuario_id', s.sub)
      .single()
    return ok({ rol: 'enlace_institucional', perfil: enl })
  }

  if (s.rol === 'coordinador_digeex') {
    const { data: coord } = await supabaseAdmin
      .from('coordinadores_departamento')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        telefono, cargo, activo,
        usuario:usuarios!coordinadores_departamento_usuario_id_fkey(correo, ultimo_acceso),
        departamento:departamentos(nombre)
      `)
      .eq('usuario_id', s.sub)
      .single()
    return ok({ rol: 'coordinador_digeex', perfil: coord })
  }

  if (s.rol === 'administrador') {
    const { data: usu } = await supabaseAdmin
      .from('usuarios')
      .select('id, correo, rol, activo, creado_en, ultimo_acceso')
      .eq('id', s.sub)
      .single()
    return ok({ rol: 'administrador', perfil: usu })
  }

  return err('Rol no reconocido', 400)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))
  const { contrasena_actual, contrasena_nueva } = b

  if (!contrasena_actual || !contrasena_nueva) return err('Contraseña actual y nueva requeridas')
  if (contrasena_nueva.length < 8) return err('La nueva contraseña debe tener al menos 8 caracteres')

  const { data: u } = await supabaseAdmin
    .from('usuarios').select('id, contrasena_hash').eq('id', s.sub).single()
  if (!u) return err('Usuario no encontrado', 404)

  const valida = await bcrypt.compare(contrasena_actual, u.contrasena_hash)
  if (!valida) return err('La contraseña actual es incorrecta', 401)

  const hash = await bcrypt.hash(contrasena_nueva, 10)
  await supabaseAdmin.from('usuarios').update({
    contrasena_hash: hash,
    primer_ingreso:  false,
    actualizado_en:  new Date().toISOString(),
  }).eq('id', s.sub)

  return ok({ ok: true, mensaje: 'Contraseña actualizada correctamente' })
}
