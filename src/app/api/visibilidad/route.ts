// src/app/api/visibilidad/route.ts
// FIX: tabla real es visibilidad_institucion con institucion_id (no sede_id)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  // Leer todas las instituciones
  const { data: insts } = await supabaseAdmin
    .from('instituciones').select('id,nombre,tipo,activo').eq('activo', true).order('nombre')

  // Leer configuraciones de visibilidad
  const { data: configs } = await supabaseAdmin
    .from('visibilidad_institucion')  // ← nombre real
    .select('*').order('configurado_en', { ascending: false })

  const configMap = new Map(((configs ?? []) as any[]).map((c: any) => [c.institucion_id, c]))

  const resultado = ((insts ?? []) as any[]).map((inst: any) => ({
    id:                       configMap.get(inst.id)?.id ?? null,
    institucion_id:           inst.id,
    institucion:              { nombre: inst.nombre, tipo: inst.tipo, activo: inst.activo },
    visible_para_coordinador: configMap.get(inst.id)?.visible_para_coordinador ?? true,
    ocultar_enlace:           configMap.get(inst.id)?.ocultar_enlace            ?? false,
    razon_ocultamiento:       configMap.get(inst.id)?.razon_ocultamiento        ?? null,
  }))

  return ok(resultado)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)
  const b = await req.json().catch(() => ({}))
  const institucionId = b.institucion_id ?? b.sede_id
  if (!institucionId) return err('institucion_id requerido')

  const { error } = await supabaseAdmin.from('visibilidad_institucion').upsert({
    institucion_id:           institucionId,
    visible_para_coordinador: b.visible_para_coordinador ?? true,
    ocultar_enlace:           b.ocultar_enlace           ?? false,
    razon_ocultamiento:       b.razon_ocultamiento       ?? null,
    configurado_por:          s.sub,
    actualizado_en:           new Date().toISOString(),
  }, { onConflict: 'institucion_id' })

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
