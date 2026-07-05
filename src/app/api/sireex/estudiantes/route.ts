// src/app/api/sireex/estudiantes/route.ts
// FIX: usa inscripcion_grupo_sireex (tabla con datos reales) en lugar de
// estudiantes_grupo_sireex (eliminada — era duplicada y sin uso real)
// Diferencia clave: inscripcion_grupo_sireex tiene UNIQUE en inscripcion_id,
// así que una inscripción solo puede estar en UN grupo a la vez (correcto).
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const grupoId      = req.nextUrl.searchParams.get('grupo_id')
  const disponibles  = req.nextUrl.searchParams.get('disponibles') === '1'
  const buscar       = req.nextUrl.searchParams.get('buscar') ?? ''

  if (!grupoId) return err('grupo_id requerido')

  const { data: grupo } = await supabaseAdmin
    .from('grupos_sireex')
    .select('etapa_id, ciclo_escolar, tecnico_id')
    .eq('id', grupoId)
    .single()

  if (!grupo) return err('Grupo no encontrado', 404)

  if (disponibles) {
    // Inscripciones de la misma etapa/ciclo que NO están en ningún grupo SIREEX
    const { data: yaAsignadas } = await supabaseAdmin
      .from('inscripcion_grupo_sireex')
      .select('inscripcion_id')

    const idsYaAsignadas = (yaAsignadas ?? []).map((r: any) => r.inscripcion_id)

    let qDisp = supabaseAdmin.from('inscripciones')
      .select(`
        id, version_libro, ciclo_escolar,
        estudiante:estudiantes(
          id, codigo_estudiante, primer_nombre, segundo_nombre,
          primer_apellido, segundo_apellido, cui, telefono, genero, fecha_nacimiento
        ),
        sede:sedes(id, nombre)
      `)
      .eq('etapa_id', grupo.etapa_id)
      .eq('ciclo_escolar', grupo.ciclo_escolar)
      .eq('estado', 'en_curso')

    const { data: disponiblesData } = await qDisp
    let filtrados = (disponiblesData ?? []).filter((i: any) => !idsYaAsignadas.includes(i.id))

    if (buscar) {
      const b = buscar.toLowerCase()
      filtrados = filtrados.filter((i: any) => {
        const e = i.estudiante as any
        return `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante} ${e?.cui}`.toLowerCase().includes(b)
      })
    }

    return ok({ disponibles: filtrados, total: filtrados.length })
  }

  // Miembros del grupo con sus notas
  const { data: miembros, error } = await supabaseAdmin
    .from('inscripcion_grupo_sireex')
    .select(`
      id, asignado_en,
      inscripcion:inscripciones(
        id, version_libro, ciclo_escolar,
        etapa:etapas(id, nombre),
        sede:sedes(id, nombre),
        estudiante:estudiantes(
          id, codigo_estudiante, codigo_sireex,
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          cui, telefono, genero, fecha_nacimiento
        )
      )
    `)
    .eq('grupo_sireex_id', grupoId)
    .order('asignado_en')

  if (error) return err(error.message, 500)

  const { data: areas } = await supabaseAdmin
    .from('areas').select('id, nombre, codigo').eq('activo', true).order('nombre')

  const conNotas = await Promise.all((miembros ?? []).map(async (m: any) => {
    const insc   = m.inscripcion as any
    const inscId = insc?.id
    const notasArea: Record<string, any> = {}

    if (inscId && insc?.etapa?.id) {
      // CORREGIDO: los libros del estudiante son SOLO los 2 (numero 1 y 2)
      // de SU etapa y SU versión (nuevo/viejo) — antes se mezclaban tareas
      // de todas las etapas y todos los libros del sistema.
      const { data: librosEst } = await supabaseAdmin
        .from('libros')
        .select('id, numero')
        .eq('etapa_id', insc.etapa.id)
        .eq('version', insc.version_libro ?? 'nuevo')
        .eq('activo', true)

      const libroIds = (librosEst ?? []).map((l: any) => l.id)

      for (const area of (areas ?? [])) {
        let totalArea = 0
        let algunLibroCompleto = false
        let algunLibroConDatos = false

        for (const libroId of libroIds) {
          const { data: tareas } = await supabaseAdmin
            .from('tareas_catalogo').select('id, puntos_max')
            .eq('area_id', area.id).eq('libro_id', libroId).eq('activo', true)

          const tareaIds = (tareas ?? []).map((t: any) => t.id)
          let ptsTareas = 0
          const ptsMax  = (tareas ?? []).reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)

          if (tareaIds.length > 0) {
            const { data: notas } = await supabaseAdmin
              .from('notas_tareas').select('nota')
              .eq('inscripcion_id', inscId).in('tarea_id', tareaIds)
            ptsTareas = (notas ?? []).reduce((a: number, n: any) => a + (n.nota ?? 0), 0)
            if ((notas ?? []).length > 0) algunLibroConDatos = true
          }

          const ptsTareasEscala = ptsMax > 0 ? Math.round((ptsTareas / ptsMax) * 30 * 10) / 10 : 0

          const { data: exArea } = await supabaseAdmin
            .from('examenes_catalogo').select('id')
            .eq('area_id', area.id).eq('libro_id', libroId).eq('activo', true)
            .maybeSingle()

          let ptsExamen = 0
          if (exArea) {
            const { data: nEx } = await supabaseAdmin
              .from('notas_examenes').select('nota_original')
              .eq('inscripcion_id', inscId).eq('examen_id', exArea.id).maybeSingle()
            if (nEx?.nota_original !== null && nEx?.nota_original !== undefined) {
              ptsExamen = Math.round((nEx.nota_original / 100) * 20 * 10) / 10
              algunLibroCompleto = true
            }
          }

          totalArea += ptsTareasEscala + ptsExamen
        }

        totalArea = Math.round(totalArea * 10) / 10

        notasArea[area.codigo ?? area.nombre] = {
          nombre: area.nombre,
          total: algunLibroConDatos || algunLibroCompleto ? totalArea : null,
          // Aprobado sobre el total de 100 (libro 1 + libro 2), umbral 60%
          promovido: (algunLibroConDatos || algunLibroCompleto) ? totalArea >= 60 : null,
        }
      }
    }

    return {
      id: m.id,
      estudiante: insc?.estudiante,
      inscripcion: insc,
      notas_por_area: notasArea,
    }
  }))

  return ok({ miembros: conNotas, areas: areas ?? [], total: conNotas.length })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const { grupo_sireex_id, inscripcion_ids } = b

  if (!grupo_sireex_id) return err('grupo_sireex_id requerido')

  const ids = inscripcion_ids ?? []
  if (ids.length === 0) return err('Al menos un estudiante requerido')

  // FIX: inscripcion_grupo_sireex tiene UNIQUE en inscripcion_id —
  // si la inscripción ya pertenece a OTRO grupo, hay que avisar, no fallar silenciosamente
  const { data: conflictos } = await supabaseAdmin
    .from('inscripcion_grupo_sireex')
    .select('inscripcion_id, grupo_sireex_id')
    .in('inscripcion_id', ids)

  const idsConflicto = (conflictos ?? []).map((c: any) => c.inscripcion_id)
  const idsLibres     = ids.filter((id: string) => !idsConflicto.includes(id))

  let agregados = 0
  if (idsLibres.length > 0) {
    const registros = idsLibres.map((inscId: string) => ({
      inscripcion_id: inscId,
      grupo_sireex_id,
      asignado_por: s.sub,
    }))

    const { data, error } = await supabaseAdmin
      .from('inscripcion_grupo_sireex')
      .insert(registros)
      .select('id')

    if (error) return err(error.message, 500)
    agregados = (data ?? []).length
  }

  return ok({
    ok: true,
    agregados,
    omitidos: idsConflicto.length,
    mensaje: idsConflicto.length > 0
      ? `${agregados} agregado(s). ${idsConflicto.length} ya pertenecían a otro grupo y fueron omitidos.`
      : `${agregados} estudiante(s) agregados correctamente.`,
  }, 201)
}

export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('inscripcion_grupo_sireex')
    .delete()
    .eq('id', id)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
