// src/app/api/diagnostico/route.ts
// CORRECCIÓN: ruta bloqueada en producción — no expone variables de entorno
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'No disponible en producción' }, { status: 404 })
  }
  // Solo en desarrollo
  return NextResponse.json({
    env: process.env.NODE_ENV,
    supabase_url_ok: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    jwt_secret_ok:   !!process.env.JWT_SECRET && (process.env.JWT_SECRET?.length ?? 0) >= 32,
  })
}
