// src/app/api/mis-enlaces/route.ts
// Enlaces institucionales de la sede del director
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (!['director', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  let q = supabaseAdmin.from('enlaces_institucionales')
    .select('id,primer_nombre,primer_apellido,cargo,telefono,activo,institucion:instituciones(nombre)')
    .eq('activo', true).order('primer_apellido')

  if (s.rol === 'director') {
    // Obtener institución del director via su sede
    const { data: dir } = await supabaseAdmin.from('directores')
      .select('sede_id').eq('usuario_id', s.sub).single()
    if (dir?.sede_id) {
      const { data: sede } = await supabaseAdmin.from('sedes')
        .select('institucion_id').eq('id', dir.sede_id).single()
      if (sede?.institucion_id) q = q.eq('institucion_id', sede.institucion_id)
    }
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
