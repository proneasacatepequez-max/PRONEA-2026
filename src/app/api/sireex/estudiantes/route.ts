// src/app/api/sireex/estudiantes/route.ts — NUEVA RUTA
// Gestiona estudiantes dentro de un grupo SIREEX
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

// GET: estudiantes del grupo O estudiantes disponibles para agregar
export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const grupoId   = req.nextUrl.searchParams.get('grupo_id')
  const disponibles = req.nextUrl.searchParams.get('disponibles') === '1'
  const buscar    = req.nextUrl.searchParams.get('buscar') ?? ''

  if (!grupoId) return err('grupo_id requerido')

  // Obtener datos del grupo para filtrar por etapa
  const { data: grupo } = await supabaseAdmin
    .from('grupos_sireex')
    .select('etapa_id, ciclo_escolar, tecnico_id')
    .eq('id', grupoId)
    .single()

  if (!grupo) return err('Grupo no encontrado', 404)

  if (disponibles) {
    // Estudiantes disponibles = inscritos en la misma etapa del grupo
    // y NO están ya en este grupo
    const { data: yaEnGrupo } = await supabaseAdmin
      .from('estudiantes_grupo_sireex')
      .select('estudiante_id')
      .eq('grupo_sireex_id', grupoId)

    const idsYaEnGrupo = (yaEnGrupo ?? []).map((e: any) => e.estudiante_id)

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
    let filtrados = (disponiblesData ?? []).filter((i: any) =>
      !idsYaEnGrupo.includes((i.estudiante as any)?.id)
    )

    // Filtrar por búsqueda
    if (buscar) {
      const b = buscar.toLowerCase()
      filtrados = filtrados.filter((i: any) => {
        const e = i.estudiante as any
        return `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante} ${e?.cui}`.toLowerCase().includes(b)
      })
    }

    return ok({ disponibles: filtrados, total: filtrados.length })
  }

  // Estudiantes ya en el grupo con notas
  const { data: miembros, error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .select(`
      id, agregado_en,
      estudiante:estudiantes(
        id, codigo_estudiante, codigo_sireex,
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, telefono, genero, fecha_nacimiento
      ),
      inscripcion:inscripciones(
        id, version_libro, ciclo_escolar,
        etapa:etapas(id, nombre),
        sede:sedes(id, nombre)
      )
    `)
    .eq('grupo_sireex_id', grupoId)
    .order('agregado_en')

  if (error) return err(error.message, 500)

  // Para cada miembro, obtener resumen de notas por área
  const { data: areas } = await supabaseAdmin
    .from('areas').select('id, nombre, codigo').eq('activo', true).order('nombre')

  const conNotas = await Promise.all((miembros ?? []).map(async (m: any) => {
    const inscId = (m.inscripcion as any)?.id
    const notasArea: Record<string, any> = {}

    if (inscId) {
      for (const area of (areas ?? [])) {
        const { data: tareas } = await supabaseAdmin
          .from('tareas_catalogo').select('id, puntos_max')
          .eq('area_id', area.id).eq('activo', true)

        const tareaIds = (tareas ?? []).map((t: any) => t.id)
        let ptsTareas = 0, ptsMax = 0

        if (tareaIds.length > 0) {
          const { data: notas } = await supabaseAdmin
            .from('notas_tareas').select('nota')
            .eq('inscripcion_id', inscId)
            .in('tarea_id', tareaIds)

          ptsMax    = (tareas ?? []).reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
          ptsTareas = (notas ?? []).reduce((a: number, n: any) => a + (n.nota ?? 0), 0)
        }

        const ptsTareasEscala = ptsMax > 0 ? Math.round((ptsTareas / ptsMax) * 30 * 10) / 10 : 0

        const { data: exArea } = await supabaseAdmin
          .from('examenes_catalogo').select('id')
          .eq('area_id', area.id).eq('activo', true).limit(1).single()

        let ptsExamen: number | null = null
        if (exArea) {
          const { data: nEx } = await supabaseAdmin
            .from('notas_examenes').select('nota_original')
            .eq('inscripcion_id', inscId).eq('examen_id', exArea.id).single()
          if (nEx?.nota_original !== null && nEx?.nota_original !== undefined) {
            ptsExamen = Math.round((nEx.nota_original / 100) * 20 * 10) / 10
          }
        }

        const totalArea = ptsExamen !== null
          ? Math.round((ptsTareasEscala + ptsExamen) * 10) / 10
          : null

        notasArea[area.codigo ?? area.nombre] = {
          nombre:    area.nombre,
          tareas:    ptsTareasEscala,
          examen:    ptsExamen,
          total:     totalArea,
          promovido: totalArea !== null ? totalArea >= 30 : null,
        }
      }
    }

    return { ...m, notas_por_area: notasArea }
  }))

  return ok({ miembros: conNotas, areas: areas ?? [], total: conNotas.length })
}

// POST: agregar estudiante(s) al grupo
export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))
  const { grupo_sireex_id, inscripcion_ids, estudiante_ids } = b

  if (!grupo_sireex_id) return err('grupo_sireex_id requerido')

  const ids = inscripcion_ids ?? []
  if (ids.length === 0) return err('Al menos un estudiante requerido')

  // Obtener datos de las inscripciones
  const { data: inscripciones } = await supabaseAdmin
    .from('inscripciones')
    .select('id, estudiante_id')
    .in('id', ids)

  const registros = (inscripciones ?? []).map((i: any) => ({
    grupo_sireex_id,
    inscripcion_id: i.id,
    estudiante_id:  i.estudiante_id,
    agregado_por:   s.sub,
  }))

  const { data, error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .insert(registros)
    .select('id')

  if (error) return err(error.message, 500)
  return ok({ ok: true, agregados: (data ?? []).length }, 201)
}

// DELETE: remover estudiante del grupo
export async function DELETE(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return err('id requerido')

  const { error } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .delete()
    .eq('id', id)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
