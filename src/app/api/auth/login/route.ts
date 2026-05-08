// src/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, setSession, DASHBOARD, ok, err } from '@/lib/auth'
import type { RolUsuario } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const correo    = body?.correo    ?? ''
    const contrasena = body?.contrasena ?? ''

    if (!correo || !contrasena) {
      return err('Correo y contraseña requeridos')
    }

    // Leer configuración de intentos (con fallback si la tabla no tiene datos)
    let maxInt  = 5
    let minBloq = 15
    try {
      const { data: cfgs } = await supabaseAdmin
        .from('configuracion')
        .select('parametro,valor')
        .in('parametro', ['INTENTOS_LOGIN', 'MINUTOS_BLOQUEO_LOGIN'])
      if (cfgs) {
        const mi = cfgs.find((c: any) => c.parametro === 'INTENTOS_LOGIN')?.valor
        const mb = cfgs.find((c: any) => c.parametro === 'MINUTOS_BLOQUEO_LOGIN')?.valor
        if (mi) maxInt  = parseInt(mi)
        if (mb) minBloq = parseInt(mb)
      }
    } catch { /* usar defaults */ }

    // Buscar usuario
    const { data: u, error: uError } = await supabaseAdmin
      .from('usuarios')
      .select('id,correo,contrasena_hash,rol,activo,intentos_fallidos,bloqueado_hasta,primer_ingreso')
      .eq('correo', correo.toLowerCase().trim())
      .single()

    if (uError || !u) {
      return err('Correo o contraseña incorrectos', 401)
    }

    // Verificar activo
    if (!u.activo) {
      return err('Tu cuenta está inactiva. Contacta al administrador.', 403)
    }

    // Verificar bloqueo
    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      const mins = Math.ceil((new Date(u.bloqueado_hasta).getTime() - Date.now()) / 60000)
      return err(`Cuenta bloqueada por ${mins} minuto(s). Intenta más tarde.`, 423)
    }

    // Verificar contraseña
    let valida = false
    try {
      valida = await bcrypt.compare(contrasena, u.contrasena_hash)
    } catch {
      return err('Error al verificar contraseña. Contacta al administrador.', 500)
    }

    if (!valida) {
      // Registrar intento fallido
      const intentos = (u.intentos_fallidos ?? 0) + 1
      const upd: any = { intentos_fallidos: intentos }
      if (intentos >= maxInt) {
        upd.bloqueado_hasta   = new Date(Date.now() + minBloq * 60000).toISOString()
        upd.intentos_fallidos = 0
      }
      await supabaseAdmin.from('usuarios').update(upd).eq('id', u.id).catch(() => {})
      // Registrar en auditoría sin fallar si no existe la tabla
      await supabaseAdmin.from('auditoria').insert({
        usuario_id: u.id, accion: 'LOGIN_FAIL',
        tabla_afectada: 'usuarios', registro_id: u.id,
        ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
      }).catch(() => {})

      const restantes = maxInt - intentos
      if (restantes > 0) {
        return err(`Contraseña incorrecta. ${restantes} intento(s) restante(s).`, 401)
      }
      return err('Contraseña incorrecta. Cuenta bloqueada temporalmente.', 401)
    }

    // Login exitoso — limpiar intentos
    await supabaseAdmin.from('usuarios').update({
      intentos_fallidos: 0,
      bloqueado_hasta:   null,
      ultimo_acceso:     new Date().toISOString(),
    }).eq('id', u.id).catch(() => {})

    await supabaseAdmin.from('auditoria').insert({
      usuario_id: u.id, accion: 'LOGIN_OK',
      tabla_afectada: 'usuarios', registro_id: u.id,
      ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    }).catch(() => {})

    // Determinar redirección según rol
    const rol       = u.rol as RolUsuario
    const dashboard = DASHBOARD[rol] ?? '/dashboard'

    // Crear token JWT
    const token = await signToken({
      sub:    u.id,
      correo: u.correo,
      rol,
      activo: u.activo,
    })

    const response = ok({
      ok:           true,
      rol,
      redireccion:  dashboard,
      primer_ingreso: u.primer_ingreso ?? false,
    })

    setSession(response as NextResponse, token)
    return response

  } catch (error: any) {
    console.error('Login error:', error)
    return err('Error interno del servidor. Intenta de nuevo.', 500)
  }
}
