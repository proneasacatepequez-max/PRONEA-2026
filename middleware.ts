// middleware.ts
// CORRECCIÓN: usa JWT_SECRET sin fallback inseguro (igual que src/lib/auth.ts)
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

function getSecret() {
  const key = process.env.JWT_SECRET
  if (!key || key.length < 32) {
    // En producción esto detiene el middleware — intencional
    throw new Error('JWT_SECRET no configurado o demasiado corto')
  }
  return new TextEncoder().encode(key)
}

const COOKIE = 'pronea_session'

const DASH: Record<string, string> = {
  administrador:        '/dashboard/admin',
  tecnico:              '/dashboard/tecnico',
  director:             '/dashboard/director',
  coordinador_digeex:   '/dashboard/coordinador',
  enlace_institucional: '/dashboard/enlace',
  estudiante:           '/dashboard/estudiante',
}

const PUBLICAS = [
  '/login', '/api/auth/login', '/api/auth/logout',
  '/api/public', '/api/diagnostico', '/_next', '/favicon',
  '/images', '/icons',
]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas y assets
  if (PUBLICAS.some(p => pathname.startsWith(p))) return NextResponse.next()
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2|webp)$/)) return NextResponse.next()

  // Rutas de API — la API valida su propia sesión
  if (pathname.startsWith('/api/')) return NextResponse.next()

  let secret: Uint8Array
  try {
    secret = getSecret()
  } catch {
    // JWT_SECRET no configurado — redirigir al login con error
    if (pathname !== '/login') return NextResponse.redirect(new URL('/login?error=config', req.url))
    return NextResponse.next()
  }

  const token = req.cookies.get(COOKIE)?.value

  // Raíz → redirigir según sesión
  if (pathname === '/') {
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret)
        return NextResponse.redirect(new URL(DASH[payload.rol as string] ?? '/login', req.url))
      } catch { /* token inválido */ }
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rutas del dashboard — verificar sesión
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    try {
      const { payload } = await jwtVerify(token, secret)
      const rol  = payload.rol as string
      const base = DASH[rol] ?? '/dashboard/admin'

      if (pathname === '/dashboard') return NextResponse.redirect(new URL(base, req.url))

      // Verificar acceso: el rol solo puede entrar a su propio dashboard
      // Admin puede entrar a cualquier dashboard (para soporte)
      const esAdmin   = rol === 'administrador'
      const permitido = pathname.startsWith(base) || esAdmin

      if (!permitido) return NextResponse.redirect(new URL(base, req.url))

      return NextResponse.next()
    } catch {
      // Token inválido o expirado → limpiar y login
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      const res = NextResponse.redirect(url)
      res.cookies.delete(COOKIE)
      return res
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard/:path*', '/login', '/api/:path*'],
}
