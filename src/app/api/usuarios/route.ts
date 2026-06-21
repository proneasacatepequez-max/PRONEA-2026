// src/app/api/usuarios/route.ts
// FIX: campos correctos para crear enlace con sede_id, mensajes claros
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
      tecnicos(
        id, primer_nombre, primer_apellido, telefono,
        codigo_tecnico, cui, especialidad
      ),
      directores(
        id, primer_nombre, primer_apellido, telefono,
        sede:sedes(id, nombre)
      ),
      enlaces_institucionales(
        id, primer_nombre, primer_apellido, cargo, telefono,
        sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre),
        tecnico:tecnicos!enlaces_institucionales_tecnico_id_fkey(
          id, primer_nombre, primer_apellido, codigo_tecnico
        )
      ),
      coordinadores_departamento(
        id, primer_nombre, primer_apellido, cargo
      )
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
    sede_id, tecnico_id,
  } = b

  // Validaciones básicas con mensajes claros
  if (!correo?.trim())           return err('El correo electrónico es requerido')
  if (!contrasena?.trim())       return err('La contraseña es requerida')
  if (!rol)                      return err('El rol es requerido')
  if (!primer_nombre?.trim())    return err('El primer nombre es requerido')
  if (!primer_apellido?.trim())  return err('El primer apellido es requerido')
  if (contrasena.length < 6)     return err('La contraseña debe tener al menos 6 caracteres')

  // Validaciones por rol
  if (rol === 'enlace_institucional') {
    if (!sede_id) return err('La sede/institución es OBLIGATORIA para el enlace institucional. Selecciona una sede.')
  }

  const correoNorm = correo.toLowerCase().trim()

  // Verificar correo duplicado
  const { data: existe } = await supabaseAdmin.from('usuarios')
    .select('id, rol').eq('correo', correoNorm).maybeSingle()
  if (existe) return err(`Ya existe un usuario con el correo "${correoNorm}" (rol: ${existe.rol})`, 409)

  // Crear usuario
  const hash = await bcrypt.hash(contrasena, 10)
  const { data: usu, error: eU } = await supabaseAdmin.from('usuarios')
    .insert({ correo: correoNorm, contrasena_hash: hash, rol, activo: true, primer_ingreso: true })
    .select('id').single()
  if (eU) return err('Error al crear el usuario: ' + eU.message, 500)

  // Crear perfil según rol
  try {
    if (rol === 'tecnico') {
      let codigo = codigo_tecnico?.trim()
      if (!codigo) {
        const { count } = await supabaseAdmin.from('tecnicos')
          .select('*', { count: 'exact', head: true })
        codigo = `TEC-${String((count ?? 0) + 1).padStart(3, '0')}`
      }
      // CUI único — generar si no viene
      const cuiLimpio = cui?.trim()
      const cuiFinal  = cuiLimpio || `CUI-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`

      const { data: tecCreado, error: eTec } = await supabaseAdmin.from('tecnicos').insert({
        usuario_id:      usu.id,
        primer_nombre:   primer_nombre.trim(),
        segundo_nombre:  segundo_nombre?.trim()   || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido:segundo_apellido?.trim() || null,
        telefono:        telefono                 || null,
        codigo_tecnico:  codigo,
        cui:             cuiFinal,
        especialidad:    especialidad?.trim()     || null,
        activo:          true,
      }).select('id').single()

      if (eTec) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error al crear perfil de técnico: ' + eTec.message, 500)
      }

      if (sede_id && tecCreado) {
        await supabaseAdmin.from('tecnico_sedes').insert({
          tecnico_id: tecCreado.id, sede_id, es_principal: true, activo: true,
        }).catch(() => {})
      }
    }

    if (rol === 'director') {
      const { error: eDir } = await supabaseAdmin.from('directores').insert({
        usuario_id:      usu.id,
        primer_nombre:   primer_nombre.trim(),
        segundo_nombre:  segundo_nombre?.trim()   || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido:segundo_apellido?.trim() || null,
        telefono:        telefono                 || null,
        activo:          true,
        sede_id:         sede_id                  || null,
      })
      if (eDir) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error al crear perfil de director: ' + eDir.message, 500)
      }
    }

    if (rol === 'enlace_institucional') {
      // sede_id es NOT NULL en la BD — ya validado arriba
      const { data: enlCreado, error: eEnl } = await supabaseAdmin
        .from('enlaces_institucionales').insert({
          usuario_id:      usu.id,
          primer_nombre:   primer_nombre.trim(),
          segundo_nombre:  segundo_nombre?.trim()   || null,
          primer_apellido: primer_apellido.trim(),
          segundo_apellido:segundo_apellido?.trim() || null,
          telefono:        telefono                 || null,
          cargo:           cargo?.trim()            || null,
          sede_id,           // ← NOT NULL, ya validado
          tecnico_id:      tecnico_id               || null,
          activo:          true,
        }).select('id').single()

      if (eEnl) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error al crear perfil de enlace: ' + eEnl.message, 500)
      }

      // Registrar en tecnico_enlaces si se asignó técnico
      if (tecnico_id && enlCreado) {
        await supabaseAdmin.from('tecnico_enlaces').insert({
          tecnico_id, enlace_id: enlCreado.id,
          ciclo_escolar: 2026, activo: true,
        }).catch(() => {})
      }
    }

    if (rol === 'coordinador_digeex') {
      const { error: eCoord } = await supabaseAdmin.from('coordinadores_departamento').insert({
        usuario_id:      usu.id,
        primer_nombre:   primer_nombre.trim(),
        segundo_nombre:  segundo_nombre?.trim()   || null,
        primer_apellido: primer_apellido.trim(),
        segundo_apellido:segundo_apellido?.trim() || null,
        telefono:        telefono                 || null,
        cargo:           cargo?.trim()            || null,
        departamento_id: departamento_id ? parseInt(String(departamento_id)) : null,
      })
      if (eCoord) {
        await supabaseAdmin.from('usuarios').delete().eq('id', usu.id)
        return err('Error al crear perfil de coordinador: ' + eCoord.message, 500)
      }
    }
  } catch (e: any) {
    await supabaseAdmin.from('usuarios').delete().eq('id', usu.id).catch(() => {})
    return err('Error inesperado al crear perfil: ' + (e?.message ?? ''), 500)
  }

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'CREAR_USUARIO',
    tabla_afectada: 'usuarios', registro_id: usu.id,
    datos_nuevos: { correo: correoNorm, rol },
  }).catch(() => {})

  return ok({
    ok: true,
    id: usu.id,
    correo: correoNorm,
    rol,
    contrasena,
    mensaje: `✅ Usuario ${primer_nombre} ${primer_apellido} creado correctamente`,
  }, 201)
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
    const { error } = await supabaseAdmin.from('usuarios').update({
      contrasena_hash: hash, intentos_fallidos: 0,
      bloqueado_hasta: null, primer_ingreso: true,
    }).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Contraseña restablecida correctamente' })
  }

  if (typeof b.activo === 'boolean') {
    const { error } = await supabaseAdmin.from('usuarios').update({ activo: b.activo }).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, activo: b.activo, mensaje: b.activo ? '✅ Usuario activado' : '✅ Usuario desactivado' })
  }

  if (b.correo || b.rol) {
    const upd: any = {}
    if (b.correo) upd.correo = b.correo.toLowerCase().trim()
    if (b.rol)    upd.rol    = b.rol
    const { error } = await supabaseAdmin.from('usuarios').update(upd).eq('id', id)
    if (error) return err(error.message, 500)
    return ok({ ok: true, mensaje: '✅ Usuario actualizado' })
  }

  return err('No se especificó qué actualizar')
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')
  if (id === s.sub) return err('No puedes desactivar tu propia cuenta', 400)

  const { error } = await supabaseAdmin.from('usuarios').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'DESACTIVAR_USUARIO',
    tabla_afectada: 'usuarios', registro_id: id,
  }).catch(() => {})

  return ok({ ok: true, mensaje: '✅ Usuario desactivado' })
}
