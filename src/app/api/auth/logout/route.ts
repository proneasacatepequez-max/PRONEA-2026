// src/app/api/auth/logout/route.ts
import { NextResponse } from 'next/server'
import { clearSession } from '@/lib/auth'
export async function POST() {
  const res = NextResponse.json({ ok:true })
  clearSession(res); return res
}
