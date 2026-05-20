// src/app/api/auth/login/route.ts
// FIX CRÍTICO: .catch() no funciona en Supabase — usar try/catch
// FIX: Redirección correcta para todos los roles
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, COOKIE } from '@/lib/auth'
import type { RolUsuario } from '@/types'

const DASH: Record<string, string> = {
  administrador:        '/dashboard/admin',
  tecnico:              '/dashboard/tecnico',
  director:             '/dashboard/director',
  coordinador_digeex:   '/dashboard/coordinador',
  enlace_institucional: '/dashboard/enlace',
  estudiante:           '/dashboard/estudiante',
}

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json().catch(() => ({}))
    const correo     = (body?.correo     ?? '').toLowerCase().trim()
    const contrasena =  body?.contrasena ?? ''

    if (!correo || !contrasena)
      return NextResponse.json({ error: 'Correo y contraseña requeridos' }, { status: 400 })

    let maxInt = 5, minBloq = 15
    try {
      const { data: cfgs } = await supabaseAdmin
        .from('configuracion').select('parametro,valor')
        .in('parametro', ['INTENTOS_LOGIN','MINUTOS_BLOQUEO_LOGIN'])
      cfgs?.forEach((c: any) => {
        if (c.parametro === 'INTENTOS_LOGIN')        maxInt  = parseInt(c.valor)
        if (c.parametro === 'MINUTOS_BLOQUEO_LOGIN') minBloq = parseInt(c.valor)
      })
    } catch { }

    const { data: u, error: uErr } = await supabaseAdmin
      .from('usuarios')
      .select('id,correo,contrasena_hash,rol,activo,intentos_fallidos,bloqueado_hasta,primer_ingreso')
      .eq('correo', correo).single()

    if (uErr || !u)
      return NextResponse.json({ error: 'Correo o contraseña incorrectos' }, { status: 401 })
    if (!u.activo)
      return NextResponse.json({ error: 'Cuenta inactiva. Contacta al administrador.' }, { status: 403 })
    if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
      const mins = Math.ceil((new Date(u.bloqueado_hasta).getTime() - Date.now()) / 60000)
      return NextResponse.json({ error: `Cuenta bloqueada por ${mins} min.` }, { status: 423 })
    }

    let valida = false
    try { valida = await bcrypt.compare(contrasena, u.contrasena_hash) }
    catch (e: any) { return NextResponse.json({ error: 'Error bcrypt: ' + e.message }, { status: 500 }) }

    if (!valida) {
      const intentos = (u.intentos_fallidos ?? 0) + 1
      const upd: any = { intentos_fallidos: intentos }
      if (intentos >= maxInt) {
        upd.bloqueado_hasta = new Date(Date.now() + minBloq * 60000).toISOString()
        upd.intentos_fallidos = 0
      }
      try { await supabaseAdmin.from('usuarios').update(upd).eq('id', u.id) } catch { }
      try { await supabaseAdmin.from('auditoria').insert({ usuario_id: u.id, accion: 'LOGIN_FAIL', tabla_afectada: 'usuarios', registro_id: u.id, ip_address: req.headers.get('x-forwarded-for') ?? 'unknown' }) } catch { }
      const r = maxInt - intentos
      return NextResponse.json({ error: r > 0 ? `Contraseña incorrecta. ${r} intento(s) restante(s).` : 'Cuenta bloqueada.' }, { status: 401 })
    }

    try { await supabaseAdmin.from('usuarios').update({ intentos_fallidos: 0, bloqueado_hasta: null, ultimo_acceso: new Date().toISOString() }).eq('id', u.id) } catch { }
    try { await supabaseAdmin.from('auditoria').insert({ usuario_id: u.id, accion: 'LOGIN_OK', tabla_afectada: 'usuarios', registro_id: u.id, ip_address: req.headers.get('x-forwarded-for') ?? 'unknown' }) } catch { }

    const rol       = u.rol as RolUsuario
    const dashboard = DASH[rol] ?? '/dashboard/admin'
    const token     = await signToken({ sub: u.id, correo: u.correo, rol, activo: u.activo })

    const response = NextResponse.json({ ok: true, rol, redireccion: dashboard, primer_ingreso: u.primer_ingreso ?? false }, { status: 200 })
    response.cookies.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 60 * 60 * 24 * 7, path: '/' })
    return response

  } catch (e: any) {
    return NextResponse.json({ error: 'Error interno: ' + (e?.message ?? 'desconocido') }, { status: 500 })
  }
}
