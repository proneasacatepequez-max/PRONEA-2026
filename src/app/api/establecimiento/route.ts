// src/app/api/establecimiento/route.ts — NUEVA RUTA
// Maneja datos del establecimiento SEPARADO del perfil del administrador
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('info_establecimiento')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) return err(error.message, 500)
  return ok(data ?? {})
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))

  const campos = [
    'nombre_completo','nombre_corto','departamento','municipio','direccion',
    'telefono','whatsapp','correo','facebook','sitio_web','horario_atencion',
    'director_nombre','director_titulo',
  ]

  const upd: any = {}
  for (const campo of campos) {
    if (b[campo] !== undefined) upd[campo] = b[campo] || null
  }

  upd.actualizado_en  = new Date().toISOString()
  upd.actualizado_por = s.sub

  const { error } = await supabaseAdmin
    .from('info_establecimiento')
    .update(upd)
    .eq('id', 1)

  if (error) return err(error.message, 500)
  return ok({ ok: true, mensaje: 'Establecimiento actualizado' })
}
