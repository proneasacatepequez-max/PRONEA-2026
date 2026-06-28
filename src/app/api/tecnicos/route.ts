// src/app/api/tecnicos/route.ts
// Perfil del técnico + sus inscripciones/estudiantes
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams

  // Obtener perfil del técnico por usuario_id (para el dashboard del técnico)
  if (p.get('mi_perfil') === '1') {
    const { data, error } = await supabaseAdmin
      .from('tecnicos')
      .select(`
        id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, codigo_tecnico, telefono, especialidad, activo, departamento_id,
        departamento:departamentos(id, nombre)
      `)
      .eq('usuario_id', s.sub)
      .single()
    if (error) return err('Técnico no encontrado', 404)
    return ok(data)
  }

  // Lista de técnicos (admin/director)
  if (!['administrador', 'director', 'coordinador_digeex'].includes(s.rol)) {
    return err('Sin permiso', 403)
  }

  const { data, error } = await supabaseAdmin
    .from('tecnicos')
    .select(`
      id, primer_nombre, primer_apellido, codigo_tecnico, telefono, activo,
      usuario:usuarios(correo, ultimo_acceso)
    `)
    .eq('activo', true)
    .order('primer_apellido')

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
