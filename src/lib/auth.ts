// src/lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { SessionPayload, RolUsuario } from '@/types'

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
export const COOKIE = 'pronea_session'

export async function signToken(p: Omit<SessionPayload,'iat'|'exp'>) {
  return new SignJWT({ ...p }).setProtectedHeader({ alg:'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret)
}
export async function verifyToken(t: string): Promise<SessionPayload|null> {
  try { const { payload } = await jwtVerify(t, secret); return payload as unknown as SessionPayload }
  catch { return null }
}
export async function getSession(req?: NextRequest): Promise<SessionPayload|null> {
  try {
    const t = req ? req.cookies.get(COOKIE)?.value : cookies().get(COOKIE)?.value
    return t ? verifyToken(t) : null
  } catch { return null }
}
export function setSession(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'lax', maxAge:60*60*24*7, path:'/' })
}
export function clearSession(res: NextResponse) { res.cookies.delete(COOKIE) }

export const DASHBOARD: Record<RolUsuario,string> = {
  administrador:'/dashboard/admin', coordinador_digeex:'/dashboard/coordinador',
  director:'/dashboard/director', tecnico:'/dashboard/tecnico',
  enlace_institucional:'/dashboard/enlace', estudiante:'/dashboard/estudiante',
}
export const ok  = (d: unknown, s=200)  => NextResponse.json(d, { status:s })
export const err = (m: string, s=400) => NextResponse.json({ error:m }, { status:s })
