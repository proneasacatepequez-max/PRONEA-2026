// src/app/api/usuarios/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select(`
      id, correo, rol, activo, ultimo_acceso, creado_en, primer_ingreso,
      tecnicos(id, primer_nombre, primer_apellido, telefono, codigo_tecnico),
      directores(id, primer_nombre, primer_apellido),
      enlaces_institucionales(id, primer_nombre, primer_apellido, cargo),
      coordinadores_departamento(id, primer_nombre, primer_apellido)
    `)
    .order('creado_en', { ascending: false })

  if (error) return err(error.message, 500)

  // Normalizar perfil según rol
  const usuarios = (data ?? []).map((u: any) => {
    let perfil = null
    if (u.rol === 'tecnico' && u.tecnicos?.[0])
      perfil = { primer_nombre: u.tecnicos[0].primer_nombre, primer_apellido: u.tecnicos[0].primer_apellido, telefono: u.tecnicos[0].telefono }
    else if (u.rol === 'director' && u.directores?.[0])
      perfil = { primer_nombre: u.directores[0].primer_nombre, primer_apellido: u.directores[0].primer_apellido }
    else if (u.rol === 'enlace_institucional' && u.enlaces_institucionales?.[0])
      perfil = { primer_nombre: u.enlaces_institucionales[0].primer_nombre, primer_apellido: u.enlaces_institucionales[0].primer_apellido }
    else if (u.rol === 'coordinador_digeex' && u.coordinadores_departamento?.[0])
      perfil = { primer_nombre: u.coordinadores_departamento[0].primer_nombre, primer_apellido: u.coordinadores_departamento[0].primer_apellido }

    return { id: u.id, correo: u.correo, rol: u.rol, activo: u.activo, ultimo_acceso: u.ultimo_acceso, creado_en: u.creado_en, perfil }
  })

  return ok(usuarios)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo el administrador puede crear usuarios', 403)

  const { correo, contrasena, rol, primer_nombre, primer_apellido, telefono } = await req.json()

  if (!correo || !contrasena || !rol || !primer_nombre || !primer_apellido)
    return err('Correo, contraseña, rol, nombre y apellido son requeridos')

  if (contrasena.length < 6)
    return err('La contraseña debe tener al menos 6 caracteres')

  // Verificar que el correo no existe
  const { data: existe } = await supabaseAdmin.from('usuarios').select('id').eq('correo', correo.toLowerCase().trim()).single()
  if (existe) return err('Ya existe un usuario con ese correo', 409)

  // Crear hash de contraseña
  const hash = await bcrypt.hash(contrasena, 10)

  // Crear usuario
  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios').insert({
    correo:          correo.toLowerCase().trim(),
    contrasena_hash: hash,
    rol,
    activo:          true,
    primer_ingreso:  true,
  }).select('id').single()

  if (eU) return err(eU.message, 500)

  // Crear perfil según rol
  try {
    if (rol === 'tecnico') {
      await supabaseAdmin.from('tecnicos').insert({
        usuario_id:     usu.id,
        primer_nombre:  primer_nombre.trim(),
        primer_apellido: primer_apellido.trim(),
        telefono:       telefono ?? null,
        activo:         true,
      })
    } else if (rol === 'director') {
      await supabaseAdmin.from('directores').insert({
        usuario_id:     usu.id,
        primer_nombre:  primer_nombre.trim(),
        primer_apellido: primer_apellido.trim(),
      })
    } else if (rol === 'enlace_institucional') {
      await supabaseAdmin.from('enlaces_institucionales').insert({
        usuario_id:     usu.id,
        primer_nombre:  primer_nombre.trim(),
        primer_apellido: primer_apellido.trim(),
        telefono:       telefono ?? null,
      })
    } else if (rol === 'coordinador_digeex') {
      await supabaseAdmin.from('coordinadores_departamento').insert({
        usuario_id:     usu.id,
        primer_nombre:  primer_nombre.trim(),
        primer_apellido: primer_apellido.trim(),
        departamento_id: 3, // Sacatepéquez por defecto
      })
    }
  } catch (e: any) {
    // Si falla el perfil no borramos el usuario, solo avisamos
    console.warn('Perfil no creado:', e.message)
  }

  await supabaseAdmin.from('auditoria').insert({
    usuario_id:      s.sub,
    accion:          'CREAR_USUARIO',
    tabla_afectada:  'usuarios',
    registro_id:     usu.id,
    datos_nuevos:    { correo, rol, primer_nombre, primer_apellido },
  })

  return ok({ ok: true, id: usu.id, correo, rol }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const body = await req.json()
  const { id } = body

  if (!id) return err('id requerido')

  // Resetear contraseña
  if (body.reset_password) {
    if (body.reset_password.length < 6) return err('Mínimo 6 caracteres')
    const hash = await bcrypt.hash(body.reset_password, 10)
    const { error } = await supabaseAdmin.from('usuarios').update({
      contrasena_hash:   hash,
      intentos_fallidos: 0,
      bloqueado_hasta:   null,
      primer_ingreso:    true,
    }).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, accion: 'password_reseteada' })
  }

  // Activar / desactivar
  if (typeof body.activo === 'boolean') {
    const { error } = await supabaseAdmin.from('usuarios').update({ activo: body.activo }).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, activo: body.activo })
  }

  return err('Acción no reconocida')
}
