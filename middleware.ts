// middleware.ts
// FIX CRÍTICO: técnico no redirige al dashboard después del login
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret  = new TextEncoder().encode(process.env.JWT_SECRET ?? 'pronea-fallback-2026')
const COOKIE  = 'pronea_session'

const DASH: Record<string, string> = {
  administrador:        '/dashboard/admin',
  tecnico:              '/dashboard/tecnico',
  director:             '/dashboard/director',
  coordinador_digeex:   '/dashboard/coordinador',
  enlace_institucional: '/dashboard/enlace',
  estudiante:           '/dashboard/estudiante',
}

// Rutas públicas — no requieren sesión
const PUBLICAS = ['/login', '/api/auth/login', '/api/auth/logout',
                  '/api/public', '/api/diagnostico', '/_next', '/favicon']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Permitir rutas públicas
  if (PUBLICAS.some(p => pathname.startsWith(p))) return NextResponse.next()

  // Assets — siempre permitir
  if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)) return NextResponse.next()

  // Rutas de API — dejar pasar, la API valida su propia sesión
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // Raíz → redirigir según sesión
  if (pathname === '/') {
    const token = req.cookies.get(COOKIE)?.value
    if (token) {
      try {
        const { payload } = await jwtVerify(token, secret)
        const dest = DASH[payload.rol as string] ?? '/dashboard/admin'
        return NextResponse.redirect(new URL(dest, req.url))
      } catch { /* token inválido */ }
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rutas del dashboard — verificar sesión
  if (pathname.startsWith('/dashboard')) {
    const token = req.cookies.get(COOKIE)?.value

    if (!token) {
      // Sin cookie → al login
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('redirect', pathname)
      return NextResponse.redirect(url)
    }

    try {
      const { payload } = await jwtVerify(token, secret)
      const rol  = payload.rol as string
      const base = DASH[rol] ?? '/dashboard/admin'

      // Redirigir /dashboard → dashboard del rol
      if (pathname === '/dashboard') {
        return NextResponse.redirect(new URL(base, req.url))
      }

      // Verificar que el rol puede acceder a esa ruta
      const permitido = pathname.startsWith(base) ||
                        pathname.startsWith('/dashboard/admin') && rol === 'administrador'

      if (!permitido) {
        // No tiene acceso → su propio dashboard
        return NextResponse.redirect(new URL(base, req.url))
      }

      return NextResponse.next()
    } catch {
      // Token inválido → limpiar cookie y login
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
  matcher: ['/', '/dashboard/:path*', '/login'],
}
