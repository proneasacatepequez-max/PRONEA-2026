// src/app/api/usuarios/route.ts
// FIX: enlace usa sede_id directo (la tabla instituciones queda en desuso
// tras la migración del SQL 13_unificar_sede_institucion.sql)
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const { data, error } = await supabaseAdmin.from('usuarios')
    .select(`
      id, correo, rol, activo, ultimo_acceso, creado_en, primer_ingreso,
      tecnicos(id, primer_nombre, primer_apellido, telefono, codigo_tecnico, cui, especialidad),
      directores(id, primer_nombre, primer_apellido, telefono, sede:sedes(id, nombre)),
      enlaces_institucionales(
        id, primer_nombre, primer_apellido, cargo, telefono,
        sede:sedes(id, nombre)
      ),
      coordinadores_departamento(id, primer_nombre, primer_apellido, cargo)
    `)
    .not('rol', 'eq', 'estudiante')
    .order('creado_en', { ascending: false })

  if (error) return err(error.message, 500)

  const lista = (data ?? []).map((u: any) => {
    let perfil: any = null
    if (u.rol === 'tecnico'              && u.tecnicos?.[0])               perfil = u.tecnicos[0]
    if (u.rol === 'director'             && u.directores?.[0])             perfil = u.directores[0]
    if (u.rol === 'enlace_institucional' && u.enlaces_institucionales?.[0]) perfil = u.enlaces_institucionales[0]
    if (u.rol === 'coordinador_digeex'   && u.coordinadores_departamento?.[0]) perfil = u.coordinadores_departamento[0]

    return {
      id: u.id, correo: u.correo, rol: u.rol, activo: u.activo,
      ultimo_acceso: u.ultimo_acceso, creado_en: u.creado_en,
      primer_ingreso: u.primer_ingreso, perfil,
    }
  })

  return ok(lista)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const {
    correo, contrasena, rol,
    primer_nombre, primer_apellido,
    segundo_nombre = '', segundo_apellido = '',
    telefono = '', codigo_tecnico = '',
    cui = '', especialidad = '',
    cargo = '', departamento_id,
    sede_id,        // ← FIX: directo a sedes, ya no institucion_id
  } = b

  if (!correo || !contrasena || !rol || !primer_nombre || !primer_apellido)
    return err('Nombre, apellido, correo, contraseña y rol son requeridos')
  if (contrasena.length < 6) return err('Contraseña mínimo 6 caracteres')

  if (rol === 'enlace_institucional' && !sede_id)
    return err('La sede/institución es obligatoria para el enlace institucional')

  const correoNorm = correo.toLowerCase().trim()
  const { data: existe } = await supabaseAdmin.from('usuarios')
    .select('id').eq('correo', correoNorm).maybeSingle()
  if (existe) return err('Ya existe un usuario con ese correo', 409)

  const hash = await bcrypt.hash(contrasena, 10)
  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios')
    .insert({ correo: correoNorm, contrasena_hash: hash, rol, activo: true, primer_ingreso: true })
    .select('id').single()
  if (eU) return err('Error creando usuario: ' + eU.message, 500)

  try {
    if (rol === 'tecnico') {
      let codigo = codigo_tecnico?.trim()
      if (!codigo) {
        const { count } = await supabaseAdmin.from('tecnicos')
          .select('*', { count: 'exact', head: true })
        codigo = `TEC-${String((count ?? 0) + 1).padStart(3, '0')}`
      }
      const cuiFinal = cui?.trim() || `CUI-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`

      const { error: eTec } = await supabaseAdmin.from('tecnicos').insert({
        usuario_id: usu.id,
        primer_nombre: primer_nombre.trim(),
        segundo_nombre: segundo_nombre?.trim() || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido: segundo_apellido?.trim() || null,
        telefono: telefono || null,
        codigo_tecnico: codigo,
        cui: cuiFinal,
        especialidad: especialidad?.trim() || null,
        activo: true,
      })
      if (eTec) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error creando perfil técnico: ' + eTec.message, 500)
      }

      // Si viene sede_id, vincular el técnico a esa sede
      if (sede_id) {
        const { data: tecCreado } = await supabaseAdmin
          .from('tecnicos').select('id').eq('usuario_id', usu.id).single()
        if (tecCreado) {
          await supabaseAdmin.from('tecnico_sedes').insert({
            tecnico_id: tecCreado.id, sede_id, es_principal: true, activo: true,
          }).catch(() => {})
        }
      }
    }

    if (rol === 'director') {
      const { error: eDir } = await supabaseAdmin.from('directores').insert({
        usuario_id: usu.id,
        primer_nombre: primer_nombre.trim(),
        segundo_nombre: segundo_nombre?.trim() || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido: segundo_apellido?.trim() || null,
        telefono: telefono || null,
        activo: true,
        sede_id: sede_id || null,
      })
      if (eDir) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error creando perfil de director: ' + eDir.message, 500)
      }
    }

    if (rol === 'enlace_institucional') {
      // FIX: sede_id directo — ya no institucion_id
      const { error: eEnl } = await supabaseAdmin.from('enlaces_institucionales').insert({
        usuario_id: usu.id,
        primer_nombre: primer_nombre.trim(),
        segundo_nombre: segundo_nombre?.trim() || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido: segundo_apellido?.trim() || null,
        telefono: telefono || null,
        cargo: cargo?.trim() || null,
        institucion_id: sede_id,  // compat: la FK vieja sigue apuntando, pero usamos el id de sede
        sede_id,                   // nueva columna directa
        activo: true,
      })
      if (eEnl) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error creando perfil de enlace: ' + eEnl.message, 500)
      }

      if (b.tecnico_id) {
        const { data: enl } = await supabaseAdmin.from('enlaces_institucionales')
          .select('id').eq('usuario_id', usu.id).single()
        if (enl) {
          await supabaseAdmin.from('tecnico_enlaces').insert({
            tecnico_id: b.tecnico_id, enlace_id: enl.id,
            ciclo_escolar: b.ciclo_escolar ?? 2026, activo: true,
          }).catch(() => {})
        }
      }
    }

    if (rol === 'coordinador_digeex') {
      const { error: eCoord } = await supabaseAdmin.from('coordinadores_departamento').insert({
        usuario_id: usu.id,
        primer_nombre: primer_nombre.trim(),
        segundo_nombre: segundo_nombre?.trim() || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido: segundo_apellido?.trim() || null,
        telefono: telefono || null,
        cargo: cargo?.trim() || null,
        departamento_id: departamento_id ? parseInt(String(departamento_id)) : null,
      })
      if (eCoord) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error creando perfil de coordinador: ' + eCoord.message, 500)
      }
    }
  } catch (e: any) {
    await supabaseAdmin.from('usuarios').delete().eq('id', usu.id).catch(() => {})
    return err('Error creando perfil: ' + e.message, 500)
  }

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'CREAR_USUARIO',
    tabla_afectada: 'usuarios', registro_id: usu.id,
    datos_nuevos: { correo: correoNorm, rol },
  }).catch(() => {})

  return ok({ ok: true, id: usu.id, correo: correoNorm, rol, contrasena }, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }
  const { id } = b
  if (!id) return err('id requerido')

  if (b.reset_password) {
    if (b.reset_password.length < 6) return err('Mínimo 6 caracteres')
    const hash = await bcrypt.hash(b.reset_password, 10)
    const { error } = await supabaseAdmin.from('usuarios')
      .update({ contrasena_hash: hash, intentos_fallidos: 0, bloqueado_hasta: null, primer_ingreso: true })
      .eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: 'Contraseña restablecida' })
  }

  if (typeof b.activo === 'boolean') {
    const { error } = await supabaseAdmin.from('usuarios').update({ activo: b.activo }).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, activo: b.activo })
  }

  if (b.correo || b.rol) {
    const upd: any = {}
    if (b.correo) upd.correo = b.correo.toLowerCase().trim()
    if (b.rol)    upd.rol    = b.rol
    const { error } = await supabaseAdmin.from('usuarios').update(upd).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true })
  }

  return err('Acción no reconocida')
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')
  if (id === s.sub) return err('No puedes eliminar tu propia cuenta', 400)

  const { error } = await supabaseAdmin.from('usuarios').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'DESACTIVAR_USUARIO',
    tabla_afectada: 'usuarios', registro_id: id,
  }).catch(() => {})

  return ok({ ok: true, mensaje: 'Usuario desactivado' })
}
