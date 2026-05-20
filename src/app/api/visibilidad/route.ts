// src/app/api/visibilidad/route.ts
// FIX: Vincula automáticamente todas las sedes
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const { data: sedes } = await supabaseAdmin.from('sedes').select('id,nombre,activo').order('nombre')
  const { data: configs } = await supabaseAdmin.from('visibilidad_coordinador').select('*').then(r => r).catch(() => ({ data: [] }))
  const configMap = new Map(((configs as any[]) ?? []).map((c: any) => [c.sede_id ?? c.institucion_id, c]))
  const resultado = ((sedes ?? []) as any[]).map((sede: any) => ({
    id:                       configMap.get(sede.id)?.id ?? null,
    sede_id:                  sede.id,
    sede:                     { nombre: sede.nombre, activo: sede.activo },
    visible_para_coordinador: configMap.get(sede.id)?.visible_para_coordinador ?? true,
    ocultar_enlace:           configMap.get(sede.id)?.ocultar_enlace           ?? false,
    razon_ocultamiento:       configMap.get(sede.id)?.razon_ocultamiento       ?? null,
  }))
  return ok(resultado)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  const sedeId = b.sede_id ?? b.institucion_id
  if (!sedeId) return err('sede_id requerido')
  const { error } = await supabaseAdmin.from('visibilidad_coordinador').upsert({
    sede_id: sedeId,
    visible_para_coordinador: b.visible_para_coordinador ?? true,
    ocultar_enlace:           b.ocultar_enlace           ?? false,
    razon_ocultamiento:       b.razon_ocultamiento       ?? null,
  }, { onConflict: 'sede_id' })
  if (error) {
    const { error: e2 } = await supabaseAdmin.from('visibilidad_coordinador').upsert({
      institucion_id: sedeId,
      visible_para_coordinador: b.visible_para_coordinador ?? true,
      ocultar_enlace: b.ocultar_enlace ?? false,
    }, { onConflict: 'institucion_id' })
    if (e2) return err(e2.message, 500)
  }
  return ok({ ok: true })
}
