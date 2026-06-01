// src/app/api/configuracion/route.ts
// CORRECCIÓN:
// 1. GET devuelve array (no objeto) para que la página de configuración pueda iterarlo
// 2. PATCH agregado como alias de PUT (la página usa PATCH)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .select('parametro, valor, descripcion, actualizado_en')
    .order('parametro')

  if (error) return err(error.message, 500)

  // Devolver array directo para que la página pueda hacer .map()
  return ok(data ?? [])
}

async function guardarParametro(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { parametro, valor } = await req.json().catch(() => ({}))
  if (!parametro || valor === undefined) return err('parametro y valor requeridos')

  // Intentar update primero, si no existe hacer insert
  const { error: eUp } = await supabaseAdmin
    .from('configuracion')
    .update({
      valor:          String(valor),
      actualizado_en: new Date().toISOString(),
      actualizado_por: s.sub,
    })
    .eq('parametro', parametro)

  if (eUp) {
    // Si no existe, insertar
    const { error: eIns } = await supabaseAdmin
      .from('configuracion')
      .insert({ parametro, valor: String(valor), actualizado_por: s.sub })
    if (eIns) return err(eIns.message, 500)
  }

  return ok({ ok: true })
}

export const PUT   = guardarParametro
export const PATCH = guardarParametro
