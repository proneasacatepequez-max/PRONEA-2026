// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente browser (respeta RLS)
export const supabase = createClient(url, anon)

// Cliente servidor — SOLO en API routes, nunca en componentes 'use client'
export const supabaseAdmin = createClient(url, svc, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ────────────────────────────────────────────────────────────
// fetchAllRows
// PostgREST (Supabase) limita cada .select() a 1000 filas por
// defecto, incluso sin .limit(). Esta función pagina en bloques
// (range) hasta traer TODAS las filas, para usar en cualquier
// consulta que pueda superar las 1000 filas (inscripciones,
// enlaces, técnicos, etc. a nivel global o de un ciclo completo).
//
// Uso:
//   const data = await fetchAllRows<MiTipo>((from, to) =>
//     supabaseAdmin
//       .from('inscripciones')
//       .select('id, etapa_id')
//       .eq('ciclo_escolar', 2026)
//       .range(from, to)
//   )
// ────────────────────────────────────────────────────────────
export async function fetchAllRows<T = any>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1)
    if (error) throw error
    if (!data || data.length === 0) break

    allRows.push(...data)

    if (data.length < pageSize) break // última página
    from += pageSize
  }

  return allRows
}
