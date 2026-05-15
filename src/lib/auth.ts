// src/lib/auth.ts
// CORREGIDO para Next.js 15: cookies() ahora es async y requiere await
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SessionPayload, RolUsuario } from '@/types'

const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? 'fallback-secret-change-me')
export const COOKIE = 'pronea_session'

export async function signToken(p: Omit<SessionPayload, 'iat' | 'exp'>) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(t: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(t, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

// CORREGIDO: cookies() requiere await en Next.js 15
export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  try {
    let token: string | undefined
    if (req) {
      // En API routes: leer de la request directamente
      token = req.cookies.get(COOKIE)?.value
    } else {
      // En Server Components: await cookies()
      const cookieStore = await cookies()
      token = cookieStore.get(COOKIE)?.value
    }
    if (!token) return null
    return await verifyToken(token)
  } catch {
    return null
  }
}

// CORREGIDO: setSession ahora crea una nueva NextResponse con las cookies
export function setSession(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 24 * 7, // 7 días
    path:     '/',
  })
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, '', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   0,
    path:     '/',
  })
}

export const DASHBOARD: Record<RolUsuario, string> = {
  administrador:         '/dashboard/admin',
  coordinador_digeex:    '/dashboard/coordinador',
  director:              '/dashboard/director',
  tecnico:               '/dashboard/tecnico',
  enlace_institucional:  '/dashboard/enlace',
  estudiante:            '/dashboard/estudiante',
}

export const ok  = (d: unknown, s = 200) => NextResponse.json(d, { status: s })
export const err = (m: string,  s = 400) => NextResponse.json({ error: m }, { status: s })
