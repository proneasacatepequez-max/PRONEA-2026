// src/app/api/establecimiento/route.ts
// FIX: Convierte URLs de Google Drive al formato de visualización directa
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

function fixDriveUrl(url?: string | null): string | null {
  if (!url) return null
  const m1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (m1) return `https://drive.google.com/uc?export=view&id=${m1[1]}`
  const m2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (m2) return `https://drive.google.com/uc?export=view&id=${m2[1]}`
  if (url.includes('uc?export=view') || url.includes('uc?id=')) return url
  return url
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from('establecimiento').select('*').single()
  if (error && error.code !== 'PGRST116') return err(error.message, 500)
  if (!data) return ok({})
  return ok({
    ...data,
    logo_url:                fixDriveUrl(data.logo_url),
    logo_mineduc_url:        fixDriveUrl(data.logo_mineduc_url),
    logo_digeex_url:         fixDriveUrl(data.logo_digeex_url),
    logo_establecimiento_url: fixDriveUrl(data.logo_establecimiento_url),
  })
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  const payload = {
    ...b,
    logo_url:                fixDriveUrl(b.logo_url),
    logo_mineduc_url:        fixDriveUrl(b.logo_mineduc_url),
    logo_digeex_url:         fixDriveUrl(b.logo_digeex_url),
    logo_establecimiento_url: fixDriveUrl(b.logo_establecimiento_url),
    actualizado_en: new Date().toISOString(),
  }
  const { data: existe } = await supabaseAdmin.from('establecimiento').select('id').single()
  let error
  if (existe) {
    const r = await supabaseAdmin.from('establecimiento').update(payload).eq('id', existe.id)
    error = r.error
  } else {
    const r = await supabaseAdmin.from('establecimiento').insert(payload)
    error = r.error
  }
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
