// src/app/api/mis-documentos/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  if (s.rol !== 'estudiante') return err('Solo estudiantes', 403)

  const { data: est } = await supabaseAdmin.from('estudiantes')
    .select('id').eq('usuario_id', s.sub).single()
  if (!est) return err('Estudiante no encontrado', 404)

  const { data, error } = await supabaseAdmin.from('documentos_estudiante')
    .select('id,estado,url_google_drive,creado_en,tipo_documento:tipos_documento(nombre)')
    .eq('estudiante_id', est.id).order('creado_en', { ascending: false })

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}
