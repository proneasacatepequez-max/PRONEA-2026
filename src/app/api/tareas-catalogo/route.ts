// src/app/api/tareas-catalogo/route.ts
// FIX: agrega campo proyecto/lección, corrige verificación de permisos
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function puedeEditar(s: any): Promise<boolean> {
  if (s.rol === 'administrador') return true
  if (s.rol === 'tecnico') {
    const { data: pg } = await supabaseAdmin
      .from('permisos_globales')
      .select('activo')
      .eq('permiso', 'modificar_escalas_tecnico')
      .single()
    return pg?.activo === true
  }
  return false
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const libroId = req.nextUrl.searchParams.get('libro_id')
  const tipo    = req.nextUrl.searchParams.get('tipo') ?? 'tareas'
  const areaId  = req.nextUrl.searchParams.get('area_id')

  if (!libroId) return err('libro_id requerido')

  const resultado: any = {}

  if (tipo === 'tareas' || tipo === 'ambos') {
    let q = supabaseAdmin.from('tareas_catalogo')
      .select(`
        id, numero_tarea, nombre, descripcion, paginas,
        proyecto, leccion, puntos_max, activo,
        area:areas(id, nombre, codigo)
      `)
      .eq('libro_id', libroId)
      .eq('activo', true)
      .order('numero_tarea')

    if (areaId) q = q.eq('area_id', parseInt(areaId))

    const { data: tareas, error } = await q
    if (error) return err(error.message, 500)
    resultado.tareas = tareas ?? []
  }

  if (tipo === 'examenes' || tipo === 'ambos') {
    let q = supabaseAdmin.from('examenes_catalogo')
      .select(`id, nombre, puntos_max, activo, area:areas(id, nombre, codigo)`)
      .eq('libro_id', libroId)
      .eq('activo', true)
      .order('id')

    if (areaId) q = q.eq('area_id', parseInt(areaId))

    const { data: examenes, error } = await q
    if (error) return err(error.message, 500)
    resultado.examenes = examenes ?? []
  }

  return ok(resultado)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const puede = await puedeEditar(s)
  if (!puede) return err('No tienes permiso para modificar el catálogo de tareas', 403)

  const b = await req.json().catch(() => ({}))
  const { tipo = 'tarea', libro_id, area_id } = b

  if (!libro_id) return err('libro_id requerido')
  if (!area_id)  return err('area_id requerido')

  if (tipo === 'tarea') {
    if (!b.nombre?.trim()) return err('nombre requerido')

    const { data, error } = await supabaseAdmin
      .from('tareas_catalogo')
      .insert({
        libro_id,
        area_id:      parseInt(String(area_id)),
        numero_tarea: parseInt(String(b.numero_tarea ?? 1)),
        nombre:       b.nombre.trim(),
        descripcion:  b.descripcion?.trim()  || null,
        paginas:      b.paginas?.trim()      || null,
        proyecto:     b.proyecto?.trim()     || null,
        leccion:      b.leccion?.trim()      || null,
        puntos_max:   parseFloat(String(b.puntos_max ?? 5)),
        activo:       true,
        creado_por:   s.sub,
      })
      .select('id, numero_tarea, nombre, paginas, proyecto, leccion, puntos_max')
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  if (tipo === 'examen') {
    const { data, error } = await supabaseAdmin
      .from('examenes_catalogo')
      .insert({
        libro_id,
        area_id:    parseInt(String(area_id)),
        nombre:     b.nombre?.trim() || `Examen — ${b.area_nombre ?? ''}`.trim(),
        puntos_max: 20,
        activo:     true,
        creado_por: s.sub,
      })
      .select('id, nombre, puntos_max')
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  return err('tipo debe ser tarea o examen')
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const puede = await puedeEditar(s)
  if (!puede) return err('Sin permiso para editar el catálogo', 403)

  const b = await req.json().catch(() => ({}))
  const { id, tipo = 'tarea' } = b
  if (!id) return err('id requerido')

  if (tipo === 'tarea') {
    const upd: any = {}
    if (b.nombre       !== undefined) upd.nombre       = b.nombre.trim()
    if (b.descripcion  !== undefined) upd.descripcion  = b.descripcion?.trim() || null
    if (b.paginas      !== undefined) upd.paginas      = b.paginas?.trim()     || null
    if (b.proyecto     !== undefined) upd.proyecto     = b.proyecto?.trim()    || null
    if (b.leccion      !== undefined) upd.leccion      = b.leccion?.trim()     || null
    if (b.puntos_max   !== undefined) upd.puntos_max   = parseFloat(String(b.puntos_max))
    if (b.numero_tarea !== undefined) upd.numero_tarea = parseInt(String(b.numero_tarea))
    if (b.area_id      !== undefined) upd.area_id      = parseInt(String(b.area_id))
    if (b.activo       !== undefined) upd.activo       = Boolean(b.activo)

    const { error } = await supabaseAdmin.from('tareas_catalogo').update(upd).eq('id', id)
    if (error) return err(error.message, 500)
  }

  if (tipo === 'examen') {
    const upd: any = {}
    if (b.nombre     !== undefined) upd.nombre     = b.nombre.trim()
    if (b.puntos_max !== undefined) upd.puntos_max = parseFloat(String(b.puntos_max))
    if (b.area_id    !== undefined) upd.area_id    = parseInt(String(b.area_id))
    if (b.activo     !== undefined) upd.activo     = Boolean(b.activo)

    const { error } = await supabaseAdmin.from('examenes_catalogo').update(upd).eq('id', id)
    if (error) return err(error.message, 500)
  }

  return ok({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const puede = await puedeEditar(s)
  if (!puede) return err('Sin permiso para eliminar del catálogo', 403)

  const id   = req.nextUrl.searchParams.get('id')
  const tipo = req.nextUrl.searchParams.get('tipo') ?? 'tarea'
  if (!id) return err('id requerido')

  if (tipo === 'tarea') {
    const { count } = await supabaseAdmin
      .from('notas_tareas')
      .select('*', { count: 'exact', head: true })
      .eq('tarea_id', id)

    if ((count ?? 0) > 0) {
      await supabaseAdmin.from('tareas_catalogo')
        .update({ activo: false }).eq('id', id)
      return ok({ ok: true, accion: 'desactivada',
        mensaje: 'Tarea desactivada — tiene notas registradas' })
    }
    const { error } = await supabaseAdmin.from('tareas_catalogo').delete().eq('id', id)
    if (error) return err(error.message, 500)
  }

  if (tipo === 'examen') {
    const { count } = await supabaseAdmin
      .from('notas_examenes')
      .select('*', { count: 'exact', head: true })
      .eq('examen_id', id)

    if ((count ?? 0) > 0) {
      await supabaseAdmin.from('examenes_catalogo')
        .update({ activo: false }).eq('id', id)
      return ok({ ok: true, accion: 'desactivado',
        mensaje: 'Examen desactivado — tiene notas' })
    }
    const { error } = await supabaseAdmin.from('examenes_catalogo').delete().eq('id', id)
    if (error) return err(error.message, 500)
  }

  return ok({ ok: true, accion: 'eliminado' })
}
