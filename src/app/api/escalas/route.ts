// src/app/api/escalas/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const inscId = req.nextUrl.searchParams.get('inscripcion_id')
  if (!inscId) return err('inscripcion_id requerido')

  // Obtener inscripción con todos los datos
  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`
      id, ciclo_escolar, version_libro,
      estudiante:estudiantes(primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,cui,codigo_estudiante),
      etapa:etapas(nombre,nivel),
      sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre,primer_apellido,codigo_tecnico)
    `)
    .eq('id', inscId).single()
  if (!insc) return err('Inscripción no encontrada', 404)

  // Obtener libros de la etapa
  const { data: libros } = await supabaseAdmin.from('libros')
    .select('id,nombre,numero,version,total_tareas')
    .eq('etapa_id', (insc.etapa as any)?.id ?? 0)
    .eq('version', insc.version_libro)
    .order('numero')

  // Para cada libro, calcular zona y notas
  const resLibros = await Promise.all((libros ?? []).map(async (libro: any) => {
    // Tareas con notas
    const { data: tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id,numero_tarea,nombre,puntos_max,area:areas(codigo,nombre)')
      .eq('libro_id', libro.id).eq('activo', true).order('numero_tarea')

    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id,nota').eq('inscripcion_id', inscId)

    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    const tareasConNota = (tareas ?? []).map((t: any) => ({
      ...t, nota: notaMap.get(t.id) ?? null
    }))

    const tareasIngresadas = tareasConNota.filter(t => t.nota !== null)
    const puntosObtenidos  = tareasIngresadas.reduce((a, t) => a + t.nota, 0)
    const puntosMaximos    = libro.total_tareas * 5
    const zona = puntosMaximos > 0 ? (puntosObtenidos / puntosMaximos * 40) : 0

    // Exámenes
    const { data: examenes } = await supabaseAdmin.from('examenes_catalogo')
      .select('id,nombre,puntos_max,area:areas(codigo,nombre)')
      .eq('libro_id', libro.id).eq('activo', true)

    const { data: notasEx } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id,nota_original').eq('inscripcion_id', inscId)

    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n.nota_original]))
    const exConNota = (examenes ?? []).map((ex: any) => ({
      ...ex, nota_original: exMap.get(ex.id) ?? null
    }))

    const exIngresados = exConNota.filter(e => e.nota_original !== null)
    const promedioExamen = exIngresados.length > 0
      ? exIngresados.reduce((a, e) => a + e.nota_original, 0) / exIngresados.length
      : null

    const notaExamenFinal = promedioExamen !== null ? (promedioExamen / 100 * 60) : null
    const notaFinal = notaExamenFinal !== null ? (zona + notaExamenFinal) : null

    return { ...libro, tareas: tareasConNota, examenes: exConNota, zona: zona.toFixed(2), promedio_examen: promedioExamen?.toFixed(1) ?? null, nota_examen_final: notaExamenFinal?.toFixed(2) ?? null, nota_final: notaFinal?.toFixed(2) ?? null, tareas_ingresadas: tareasIngresadas.length }
  }))

  return ok({ inscripcion: insc, libros: resLibros })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.inscripcion_id || !b.libro_id) return err('inscripcion_id y libro_id requeridos')

  // Verificar si ya existe
  const { data: existe } = await supabaseAdmin.from('escalas_calificacion')
    .select('id,numero_escala').eq('inscripcion_id', b.inscripcion_id).eq('libro_id', b.libro_id).maybeSingle()
  if (existe) return ok({ ok: true, id: existe.id, numero_escala: existe.numero_escala, ya_existia: true })

  // Generar número de escala
  const { count } = await supabaseAdmin.from('escalas_calificacion').select('*', { count: 'exact', head: true })
  const numEscala = `ESC-2026-${String((count ?? 0) + 1).padStart(5, '0')}`

  const { data, error } = await supabaseAdmin.from('escalas_calificacion').insert({
    inscripcion_id: b.inscripcion_id, libro_id: b.libro_id,
    numero_escala: numEscala, generada_por: s.sub,
    tipo_escala: b.tipo_escala ?? 'libro', firmada: false,
  }).select('id,numero_escala').single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, id: data.id, numero_escala: data.numero_escala }, 201)
}
