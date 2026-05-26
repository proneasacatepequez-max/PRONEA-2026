// src/app/api/escalas/route.ts
// FIX: autorización para modificar escalas + exportar
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const p = req.nextUrl.searchParams
  const inscId = p.get('inscripcion_id')
  if (!inscId) return err('inscripcion_id requerido')

  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`id,ciclo_escolar,version_libro,
      estudiante:estudiantes(primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,cui,codigo_estudiante),
      etapa:etapas(id,nombre,nivel), sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre,primer_apellido,codigo_tecnico)`)
    .eq('id', inscId).single()
  if (!insc) return err('Inscripción no encontrada', 404)

  const { data: libros } = await supabaseAdmin.from('libros')
    .select('id,nombre,numero,version,total_tareas')
    .eq('etapa_id', (insc.etapa as any)?.id ?? 0)
    .eq('version', insc.version_libro).order('numero')

  const resLibros = await Promise.all((libros ?? []).map(async (libro: any) => {
    const { data: tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id,numero_tarea,nombre,puntos_max,area:areas(codigo,nombre)')
      .eq('libro_id', libro.id).eq('activo', true).order('numero_tarea')

    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id,nota').eq('inscripcion_id', inscId)
    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    const tareasConNota = (tareas ?? []).map((t: any) => ({ ...t, nota: notaMap.get(t.id) ?? null }))
    const ingresadas = tareasConNota.filter(t => t.nota !== null)
    const puntosObt  = ingresadas.reduce((a, t) => a + t.nota, 0)
    const puntosMax  = libro.total_tareas * 5
    const zona = puntosMax > 0 ? (puntosObt / puntosMax * 40) : 0

    const { data: examenes } = await supabaseAdmin.from('examenes_catalogo')
      .select('id,nombre,puntos_max,area:areas(codigo,nombre)')
      .eq('libro_id', libro.id).eq('activo', true)
    const { data: notasEx } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id,nota_original').eq('inscripcion_id', inscId)
    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n.nota_original]))
    const examenConNota = (examenes ?? []).map((e: any) => ({ ...e, nota_original: exMap.get(e.id) ?? null }))
    const exIngresados = examenConNota.filter(e => e.nota_original !== null)
    const promEx = exIngresados.length > 0 ? exIngresados.reduce((a, e) => a + e.nota_original, 0) / exIngresados.length : null
    const notaExFinal = promEx !== null ? (promEx / 100 * 60) : null
    const notaFinal   = notaExFinal !== null ? (zona + notaExFinal) : null

    // Estado de la escala (si fue generada/bloqueada)
    const { data: escala } = await supabaseAdmin.from('escalas_calificacion')
      .select('id,numero_escala,firmada,bloqueada,aprobada_director,aprobada_admin,generada_en')
      .eq('inscripcion_id', inscId).eq('libro_id', libro.id).maybeSingle()

    return {
      ...libro,
      tareas: tareasConNota, examenes: examenConNota,
      zona: zona.toFixed(2),
      promedio_examen: promEx?.toFixed(1) ?? null,
      nota_examen_final: notaExFinal?.toFixed(2) ?? null,
      nota_final: notaFinal?.toFixed(2) ?? null,
      tareas_ingresadas: ingresadas.length,
      escala: escala ?? null,
    }
  }))

  return ok({ inscripcion: insc, libros: resLibros })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.inscripcion_id || !b.libro_id) return err('inscripcion_id y libro_id requeridos')

  // Si ya existe y está bloqueada, solo admin/director pueden sobreescribir
  const { data: existe } = await supabaseAdmin.from('escalas_calificacion')
    .select('id,numero_escala,bloqueada,generada_por')
    .eq('inscripcion_id', b.inscripcion_id).eq('libro_id', b.libro_id).maybeSingle()

  if (existe) {
    // Verificar si está bloqueada
    if (existe.bloqueada && s.rol === 'tecnico') {
      // Verificar si es el mismo técnico que la creó
      const tecnicoId = await getTecnicoId(s.sub)
      if (existe.generada_por !== s.sub) {
        return err('Esta escala está bloqueada. Solicita autorización al director.', 403)
      }
    }
    return ok({ ok: true, id: existe.id, numero_escala: existe.numero_escala, ya_existia: true })
  }

  const { count } = await supabaseAdmin.from('escalas_calificacion').select('*', { count: 'exact', head: true })
  const numEscala = `ESC-2026-${String((count ?? 0) + 1).padStart(5, '0')}`

  const { data, error } = await supabaseAdmin.from('escalas_calificacion').insert({
    inscripcion_id: b.inscripcion_id,
    libro_id:       b.libro_id,
    numero_escala:  numEscala,
    generada_por:   s.sub,
    tipo_escala:    b.tipo_escala ?? 'libro',
    firmada:        false,
    bloqueada:      false,
  }).select('id,numero_escala').single()

  if (error) return err(error.message, 500)
  return ok({ ok: true, id: data.id, numero_escala: data.numero_escala }, 201)
}

// Director/Admin bloquea o desbloquea escala
export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director'].includes(s.rol)) return err('Sin permiso', 403)
  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  const upd: any = {}
  if (b.bloqueada !== undefined) {
    upd.bloqueada     = b.bloqueada
    upd.bloqueada_por = b.bloqueada ? s.sub : null
    upd.bloqueada_en  = b.bloqueada ? new Date().toISOString() : null
  }
  if (b.aprobada_director !== undefined) upd.aprobada_director = b.aprobada_director
  if (b.aprobada_admin    !== undefined) upd.aprobada_admin    = b.aprobada_admin

  const { error } = await supabaseAdmin.from('escalas_calificacion').update(upd).eq('id', b.id)
  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
