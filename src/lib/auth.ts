// src/lib/auth.ts
// CORRECCIÓN: JWT_SECRET obligatorio — sin fallback inseguro
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SessionPayload, RolUsuario } from '@/types'

function getSecret() {
  const key = process.env.JWT_SECRET
  if (!key || key.length < 32) {
    // En producción esto detiene el servidor en startup — intencional
    throw new Error('JWT_SECRET no definido o demasiado corto (mínimo 32 caracteres). Configúralo en Vercel → Settings → Environment Variables.')
  }
  return new TextEncoder().encode(key)
}

export const COOKIE = 'pronea_session'

export async function signToken(p: Omit<SessionPayload, 'iat' | 'exp'>) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret())
}

export async function verifyToken(t: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(t, getSecret())
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    const token = req
      ? req.cookies.get(COOKIE)?.value
      : (await cookies()).get(COOKIE)?.value
    return token ? await verifyToken(token) : null
  } catch {
    return null
  }
}

export function setSession(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === 'production',
    sameSite:  'lax',
    maxAge:    60 * 60 * 24 * 7,
    path:      '/',
  })
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' })
}

export const DASHBOARD: Record<RolUsuario, string> = {
  administrador:        '/dashboard/admin',
  tecnico:              '/dashboard/tecnico',
  director:             '/dashboard/director',
  coordinador_digeex:   '/dashboard/coordinador',
  enlace_institucional: '/dashboard/enlace',
  estudiante:           '/dashboard/estudiante',
}

export const ok  = (d: unknown, s = 200) => NextResponse.json(d, { status: s })
export const err = (m: string,  s = 400) => NextResponse.json({ error: m }, { status: s })
