// src/app/api/sireex/estudiantes/route.ts — NUEVA RUTA
// Lista y agrega estudiantes a un grupo SIREEX
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const grupoId = req.nextUrl.searchParams.get('grupo_id')
  if (!grupoId) return err('grupo_id requerido')

  const { data, error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .select(`
      id, agregado_en,
      estudiante:estudiantes(
        id, codigo_estudiante, codigo_sireex,
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, cui
      ),
      inscripcion:inscripciones(
        id, version_libro, estado,
        sede:sedes(id, nombre)
      )
    `)
    .eq('grupo_sireex_id', grupoId)
    .order('agregado_en')

  if (error) return err(error.message, 500)
  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)

  const { grupo_sireex_id, inscripcion_id } = await req.json().catch(() => ({}))
  if (!grupo_sireex_id || !inscripcion_id) return err('grupo_sireex_id e inscripcion_id requeridos')

  // Verificar que la inscripción no esté ya en el grupo
  const { data: existe } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .select('id')
    .eq('grupo_sireex_id', grupo_sireex_id)
    .eq('inscripcion_id', inscripcion_id)
    .maybeSingle()

  if (existe) return err('Este estudiante ya está en el grupo', 409)

  // Obtener estudiante_id desde inscripción
  const { data: insc } = await supabaseAdmin
    .from('inscripciones')
    .select('estudiante_id')
    .eq('id', inscripcion_id)
    .single()
  if (!insc) return err('Inscripción no encontrada', 404)

  const { data, error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .insert({
      grupo_sireex_id,
      inscripcion_id,
      estudiante_id: insc.estudiante_id,
      agregado_por:  s.sub,
    })
    .select('id')
    .single()

  if (error) return err(error.message, 500)

  await supabaseAdmin.from('grupos_sireex_historial').insert({
    grupo_sireex_id,
    accion:       'ESTUDIANTE_AGREGADO',
    inscripcion_id,
    usuario_id:   s.sub,
    detalle:      `Inscripción ${inscripcion_id} agregada al grupo`,
  }).catch(() => {})

  return ok(data, 201)
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .delete()
    .eq('id', parseInt(id))

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
