// src/app/api/areas/route.ts
// FIX: devuelve exactamente 5 áreas únicas y activas (sin duplicados)
import { supabaseAdmin } from '@/lib/supabase'
import { ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('areas')
    .select('id, codigo, nombre, descripcion, activo')
    .eq('activo', true)
    .order('nombre')

  if (error) return err(error.message, 500)

  // Eliminar duplicados por nombre — quedarse con el primero de cada nombre
  const seen = new Set<string>()
  const unicas = (data ?? []).filter((a: any) => {
    const key = a.nombre.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return ok(unicas)
}
