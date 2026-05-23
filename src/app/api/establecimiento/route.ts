// src/app/api/establecimiento/route.ts
// FIX: tabla real es info_establecimiento (no "establecimiento")
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

function fixDrive(url?: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`
  return url
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('info_establecimiento')  // ← nombre real en Supabase
    .select('*').single()
  if (error && error.code !== 'PGRST116') return err(error.message, 500)
  if (!data) return ok({})
  return ok({
    ...data,
    logo_url:                fixDrive(data.logo_url),
    logo_mineduc_url:        fixDrive(data.logo_mineduc_url),
    logo_digeex_url:         fixDrive(data.logo_digeex_url),
    logo_establecimiento_url: fixDrive(data.logo_establecimiento_url),
  })
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  const payload = {
    ...b,
    logo_url:                fixDrive(b.logo_url),
    logo_mineduc_url:        fixDrive(b.logo_mineduc_url),
    logo_digeex_url:         fixDrive(b.logo_digeex_url),
    logo_establecimiento_url: fixDrive(b.logo_establecimiento_url),
    actualizado_en:          new Date().toISOString(),
    actualizado_por:         s.sub,
  }
  // La tabla tiene id=1 siempre (CHECK id=1)
  const { data: existe } = await supabaseAdmin
    .from('info_establecimiento').select('id').single()
  const { error } = existe
    ? await supabaseAdmin.from('info_establecimiento').update(payload).eq('id', 1)
    : await supabaseAdmin.from('info_establecimiento').insert({ ...payload, id: 1 })
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
