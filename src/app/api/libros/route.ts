// src/app/api/libros/route.ts
// FIX: el selector "Libro 1/2" en director/escalas mostraba "Todos" en vez
// de listar los libros reales porque el filtro por etapa_id+version no
// llegaba bien formado desde el frontend (comparaba string vs number)
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p          = req.nextUrl.searchParams
  const etapaId    = p.get('etapa_id')
  const version    = p.get('version')      // 'nuevo' | 'viejo'

  let q = supabaseAdmin.from('libros')
    .select(`
      id, etapa_id, nombre, numero, descripcion, version, activo,
      etapa:etapas(id, nombre, codigo)
    `)
    .eq('activo', true)
    .order('numero')

  if (etapaId) q = q.eq('etapa_id', parseInt(etapaId))
  if (version) q = q.eq('version', version)

  const { data, error } = await q
  if (error) return err(error.message, 500)

  // BLINDAJE: si existen libros duplicados para la misma combinación
  // etapa+numero+version (bug de datos), nos quedamos con uno solo por
  // grupo — el que tenga más tareas activas en el catálogo — para que
  // el frontend nunca muestre un "Libro 1" vacío cuando existe otro con datos.
  const libros = data ?? []
  const grupos = new Map<string, any[]>()
  for (const l of libros) {
    const key = `${l.etapa_id}-${l.numero}-${l.version}`
    if (!grupos.has(key)) grupos.set(key, [])
    grupos.get(key)!.push(l)
  }

  const resultado: any[] = []
  for (const grupo of grupos.values()) {
    if (grupo.length === 1) { resultado.push(grupo[0]); continue }
    // Hay duplicados: contar tareas activas de cada uno y quedarnos con el mejor
    const conteos = await Promise.all(grupo.map(async (l: any) => {
      const { count } = await supabaseAdmin.from('tareas_catalogo')
        .select('*', { count: 'exact', head: true })
        .eq('libro_id', l.id).eq('activo', true)
      return { libro: l, total: count ?? 0 }
    }))
    conteos.sort((a, b) => b.total - a.total)
    resultado.push(conteos[0].libro)
  }
  resultado.sort((a, b) => a.numero - b.numero)

  return ok(resultado)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.etapa_id) return err('etapa_id requerido')
  if (!b.numero)   return err('numero requerido')
  if (!b.version)  return err('version requerida (nuevo/viejo)')

  const { data, error } = await supabaseAdmin.from('libros').insert({
    etapa_id:    parseInt(String(b.etapa_id)),
    nombre:      b.nombre ?? `Libro ${b.numero}`,
    numero:      parseInt(String(b.numero)),
    version:     b.version,
    descripcion: b.descripcion ?? null,
    activo:      true,
  }).select('id, nombre, numero, version').single()

  if (error) {
    if (error.code === '23505') {
      return err(`Ya existe el Libro ${b.numero} (${b.version}) para esta etapa`, 409)
    }
    return err(error.message, 500)
  }
  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.nombre      !== undefined) upd.nombre      = b.nombre
  if (b.numero      !== undefined) upd.numero      = parseInt(String(b.numero))
  if (b.version     !== undefined) upd.version     = b.version
  if (b.descripcion !== undefined) upd.descripcion = b.descripcion
  if (b.activo      !== undefined) upd.activo      = Boolean(b.activo)

  const { error } = await supabaseAdmin.from('libros').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'administrador') return err('Solo administrador', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin.from('libros').update({ activo: false }).eq('id', id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}


