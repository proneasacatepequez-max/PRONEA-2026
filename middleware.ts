// middleware.ts
import { NextRequest, NextResponse } from 'next/server'
import { getSession, DASHBOARD } from '@/lib/auth'

const PUBLIC = ['/login','/api/auth/login','/api/public','/_next','/favicon']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next()

  const session = await getSession(req)
  if (!session) {
    const u = new URL('/login', req.url)
    u.searchParams.set('redirect', pathname)
    return NextResponse.redirect(u)
  }
  if (pathname === '/dashboard') return NextResponse.redirect(new URL(DASHBOARD[session.rol], req.url))

  // Impedir acceso a dashboards de otro rol
  const miDash = DASHBOARD[session.rol]
  if (pathname.startsWith('/dashboard/') && !pathname.startsWith(miDash)) {
    return NextResponse.redirect(new URL(miDash, req.url))
  }
  return NextResponse.next()
}
export const config = { matcher: ['/dashboard/:path*','/api/((?!auth/login|public).*)'] }
