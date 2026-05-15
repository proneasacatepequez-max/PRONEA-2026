// src/app/api/auth/login/route.ts
// CORRECCIÓN DEFINITIVA: NextResponse se crea primero, luego se añaden cookies
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, DASHBOARD, COOKIE } from '@/lib/auth'
import type { RolUsuario } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json().catch(() => ({}))
    const correo     = (body?.correo     ?? '').toLowerCase().trim()
    const contrasena =  body?.contrasena ?? ''

    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 })
    }

    // Configuración de intentos (con fallback)
    let maxInt  = 5
    let minBloq = 15
    try {
      const { data: cfgs } = await supabaseAdmin
        .from('configuracion')
        .select('parametro,valor')
        .in('parametro', ['INTENTOS_LOGIN', 'MINUTOS_BLOQUEO_LOGIN'])
      if (cfgs?.length) {
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
      .eq('correo', correo)
      .single()

    if (uError || !u) {
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
    }

    if (!u.activo) {
      return NextResponse.json({ error: 'Tu cuenta está inactiva. Contacta al administrador.' }, { status: 403 })
    }

    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      const mins = Math.ceil((new Date(u.bloqueado_hasta).getTime() - Date.now()) / 60000)
      return NextResponse.json({ error: `Cuenta bloqueada por ${mins} minuto(s). Intenta más tarde.` }, { status: 423 })
    }

    // Verificar contraseña
    let valida = false
    try {
      valida = await bcrypt.compare(contrasena, u.contrasena_hash)
    } catch (bcryptErr: any) {
      console.error('bcrypt error:', bcryptErr.message)
      return NextResponse.json({ error: 'Error al verificar contraseña' }, { status: 500 })
    }

    if (!valida) {
      const intentos = (u.intentos_fallidos ?? 0) + 1
      const upd: any = { intentos_fallidos: intentos }
      if (intentos >= maxInt) {
        upd.bloqueado_hasta   = new Date(Date.now() + minBloq * 60000).toISOString()
        upd.intentos_fallidos = 0
      }
      await supabaseAdmin.from('usuarios').update(upd).eq('id', u.id).catch(() => {})
      await supabaseAdmin.from('auditoria').insert({
        usuario_id: u.id, accion: 'LOGIN_FAIL',
        tabla_afectada: 'usuarios', registro_id: u.id,
        ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
      }).catch(() => {}) // No fallar si auditoria no existe

      const restantes = maxInt - intentos
      return NextResponse.json({
        error: restantes > 0
          ? `Contraseña incorrecta. ${restantes} intento(s) restante(s).`
          : 'Contraseña incorrecta. Cuenta bloqueada temporalmente.'
      }, { status: 401 })
    }

    // Login exitoso
    await supabaseAdmin.from('usuarios').update({
      intentos_fallidos: 0,
      bloqueado_hasta:   null,
      ultimo_acceso:     new Date().toISOString(),
    }).eq('id', u.id).catch(() => {})

    await supabaseAdmin.from('auditoria').insert({
      usuario_id: u.id, accion: 'LOGIN_OK',
      tabla_afectada: 'usuarios', registro_id: u.id,
      ip_address: req.headers.get('x-forwarded-for') ?? 'unknown',
    }).catch(() => {}) // No fallar si auditoria no existe

    const rol       = u.rol as RolUsuario
    const dashboard = DASHBOARD[rol] ?? '/dashboard'

    // Crear token
    const token = await signToken({
      sub:    u.id,
      correo: u.correo,
      rol,
      activo: u.activo,
    })

    // CORRECCIÓN CLAVE: crear NextResponse y añadir cookie ANTES de retornar
    const response = NextResponse.json({
      ok:             true,
      rol,
      redireccion:    dashboard,
      primer_ingreso: u.primer_ingreso ?? false,
    }, { status: 200 })

    // Establecer cookie de sesión directamente en la response
    response.cookies.set(COOKIE, token, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    })

    return response

  } catch (error: any) {
    console.error('Login unhandled error:', error?.message, error?.stack?.substring(0, 200))
    return NextResponse.json({
      error: 'Error interno del servidor. Detalles: ' + (error?.message ?? 'desconocido')
    }, { status: 500 })
  }
}
