// src/app/api/recursos/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams
  const etapa_id = p.get('etapa_id')
  const area_id  = p.get('area_id')

  // Query simple sin JOINs complejos para evitar errores
  let q = supabaseAdmin
    .from('recursos_apoyo')
    .select(`
      id, titulo, descripcion, url, tipo_contenido,
      duracion_minutos, destacado, orden, es_publico, activo,
      etapa_id, area_id,
      categoria_id
    `)
    .eq('activo', true)
    .order('destacado', { ascending: false })
    .order('orden')

  // Estudiantes solo ven recursos públicos
  if (s.rol === 'estudiante') {
    q = q.eq('es_publico', true)
  }

  if (etapa_id) q = q.eq('etapa_id', parseInt(etapa_id))
  if (area_id)  q = q.eq('area_id',  parseInt(area_id))

  const { data, error } = await q

  if (error) {
    // Si la tabla no existe, devolver array vacío en lugar de error 500
    if (error.code === '42P01') return ok([])
    return err(error.message, 500)
  }

  return ok(data ?? [])
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['administrador', 'tecnico'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json()
  if (!b.titulo || !b.url) return err('titulo y url son requeridos')

  const { data, error } = await supabaseAdmin.from('recursos_apoyo').insert({
    titulo:         b.titulo.trim(),
    descripcion:    b.descripcion    ?? null,
    url:            b.url.trim(),
    tipo_contenido: b.tipo_contenido ?? 'link',
    etapa_id:       b.etapa_id       ?? null,
    area_id:        b.area_id        ?? null,
    es_publico:     b.es_publico     ?? false,
    destacado:      b.destacado      ?? false,
    orden:          b.orden          ?? 0,
    activo:         true,
    creado_por:     s.sub,
  }).select('id').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
