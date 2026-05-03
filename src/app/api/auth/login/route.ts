// src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { signToken, setSession, DASHBOARD, ok, err } from '@/lib/auth'
import type { RolUsuario } from '@/types'

type UsuarioLogin = {
  id: string
  correo: string
  contrasena_hash: string
  rol: RolUsuario
  activo: boolean
  intentos_fallidos: number | null
  bloqueado_hasta: string | null
  primer_ingreso: boolean
}

export async function POST(req: NextRequest) {
  const { correo, contrasena } = await req.json()

  if (!correo || !contrasena) {
    return err('Correo y contraseña requeridos')
  }

  const { data: cfgs } = await supabaseAdmin
    .from('configuracion')
    .select('parametro,valor')
    .in('parametro', ['INTENTOS_LOGIN', 'MINUTOS_BLOQUEO_LOGIN'])

  const maxInt = parseInt(
    cfgs?.find((c: any) => c.parametro === 'INTENTOS_LOGIN')?.valor ?? '3'
  )

  const minBloq = parseInt(
    cfgs?.find((c: any) => c.parametro === 'MINUTOS_BLOQUEO_LOGIN')?.valor ?? '15'
  )

  const { data } = await supabaseAdmin
    .from('usuarios')
    .select(
      'id,correo,contrasena_hash,rol,activo,intentos_fallidos,bloqueado_hasta,primer_ingreso'
    )
    .eq('correo', correo.toLowerCase().trim())
    .single()

  const u = data as UsuarioLogin | null

  if (!u) {
    return err('Credenciales incorrectas', 401)
  }

  if (!u.activo) {
    return err('Usuario inactivo. Contacta al administrador.', 403)
  }

  if (u.bloqueado_hasta && new Date(u.bloqueado_hasta) > new Date()) {
    const mins = Math.ceil(
      (new Date(u.bloqueado_hasta).getTime() - Date.now()) / 60000
    )

    return err(
      `Cuenta bloqueada. Intenta en ${mins} minuto(s).`,
      423
    )
  }

  const valida = await bcrypt.compare(
    contrasena,
    u.contrasena_hash
  )

  if (!valida) {
    const intentos = (u.intentos_fallidos ?? 0) + 1

    const upd: {
      intentos_fallidos: number
      bloqueado_hasta?: string
    } = {
      intentos_fallidos: intentos
    }

    if (intentos >= maxInt) {
      upd.bloqueado_hasta = new Date(
        Date.now() + minBloq * 60000
      ).toISOString()

      upd.intentos_fallidos = 0
    }

    await supabaseAdmin
      .from('usuarios')
      .update(upd)
      .eq('id', u.id)

    await supabaseAdmin
      .from('auditoria')
      .insert({
        usuario_id: u.id,
        accion: 'LOGIN_FAIL',
        tabla_afectada: 'usuarios',
        registro_id: u.id,
        ip_address:
          req.headers.get('x-forwarded-for') ?? 'unknown',
      })

    return err('Credenciales incorrectas', 401)
  }

  await supabaseAdmin
    .from('usuarios')
    .update({
      intentos_fallidos: 0,
      bloqueado_hasta: null,
      ultimo_acceso: new Date().toISOString(),
    })
    .eq('id', u.id)

  await supabaseAdmin
    .from('auditoria')
    .insert({
      usuario_id: u.id,
      accion: 'LOGIN_OK',
      tabla_afectada: 'usuarios',
      registro_id: u.id,
      ip_address:
        req.headers.get('x-forwarded-for') ?? 'unknown',
    })

  const token = await signToken({
    sub: u.id,
    correo: u.correo,
    rol: u.rol,
    activo: u.activo,
  })

  const res = ok({
    ok: true,
    rol: u.rol,
    redireccion: DASHBOARD[u.rol as RolUsuario],
    primer_ingreso: u.primer_ingreso,
  })

  setSession(res as NextResponse, token)

  return res
}
