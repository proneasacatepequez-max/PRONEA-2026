// src/app/api/areas/route.ts
// CORREGIDO: si viene etapa_id, filtra por etapa_areas para devolver
// solo las áreas que corresponden a esa etapa.
// Bachillerato usa "Productividad y Desarrollo" en vez de "Ciencias Sociales/Naturales"
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const etapa_id = req.nextUrl.searchParams.get('etapa_id')

  // Si viene etapa_id → filtrar por tabla etapa_areas
  if (etapa_id) {
    const { data: ea, error: eaErr } = await supabaseAdmin
      .from('etapa_areas')
      .select('area:areas(id, codigo, nombre, descripcion, activo)')
      .eq('etapa_id', parseInt(etapa_id))

    if (!eaErr && ea && ea.length > 0) {
      const areas = (ea as any[])
        .map((row: any) => row.area)
        .filter((a: any) => a?.activo !== false)
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre))

      // Deduplicar por id
      const seen = new Set<number>()
      const unicas = areas.filter((a: any) => {
        if (seen.has(a.id)) return false
        seen.add(a.id)
        return true
      })

      return ok(unicas)
    }
    // Si no hay etapa_areas configurada, caer al fallback de todas las áreas
  }

  // Sin etapa_id → devolver todas las áreas activas (deduplicadas)
  const { data, error } = await supabaseAdmin
    .from('areas')
    .select('id, codigo, nombre, descripcion, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return err(error.message, 500)

  const seen = new Set<string>()
  const unicas = (data ?? []).filter((a: any) => {
    const key = a.nombre.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return ok(unicas)
}
