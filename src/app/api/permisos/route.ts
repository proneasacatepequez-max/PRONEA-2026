// src/app/api/permisos/route.ts
// Devuelve los permisos activos para el usuario actual
// El enlace usa esta ruta para saber si puede ingresar notas o inscribir
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  // Permisos globales del sistema
  const { data: globales } = await supabaseAdmin
    .from('permisos_globales')
    .select('permiso, descripcion, activo')
    .order('permiso')

  // Si es enlace, también verificar sus autorizaciones específicas del director
  if (s.rol === 'enlace_institucional') {
    const { data: enlace } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('id')
      .eq('usuario_id', s.sub)
      .single()

    if (!enlace) return ok([])

    const { data: autorizaciones } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('permiso, activo, fecha_inicio, fecha_fin')
      .eq('enlace_id', enlace.id)
      .eq('activo', true)

    // Combinar: un permiso está activo si el permiso global está activo
    // Y el enlace tiene una autorización activa del director
    const permisosEnlace = (globales ?? []).map((pg: any) => {
      const authEspecifica = (autorizaciones ?? []).find((a: any) => a.permiso === pg.permiso)
      return {
        permiso:     pg.permiso,
        descripcion: pg.descripcion,
        // Activo solo si el global está activo Y el enlace tiene autorización específica
        activo:      pg.activo && !!authEspecifica,
        tiene_auth:  !!authEspecifica,
      }
    })

    return ok(permisosEnlace)
  }

  // Para otros roles, devolver los permisos globales directamente
  return ok(globales ?? [])
}
