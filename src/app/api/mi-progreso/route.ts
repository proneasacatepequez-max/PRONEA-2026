// src/app/api/mi-progreso/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || s.rol !== 'estudiante') return err('Solo estudiantes', 403)

  const { data: est } = await supabaseAdmin.from('estudiantes')
    .select('id,codigo_estudiante,primer_nombre,primer_apellido').eq('usuario_id', s.sub).single()
  if (!est) return err('Estudiante no encontrado', 404)

  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`id,ciclo_escolar,version_libro,estado,
      etapa:etapas(id,nombre), sede:sedes(nombre)`)
    .eq('estudiante_id', est.id).eq('estado', 'en_curso').eq('ciclo_escolar', 2026).single()

  const { data: re } = insc ? await supabaseAdmin.from('resumen_etapa')
    .select('nota_libro_1,nota_libro_2,nota_final_etapa,calificacion_cualitativa,promovido')
    .eq('inscripcion_id', insc.id).single() : { data: null }

  const libros: any[] = []
  if (insc) {
    for (const num of [1, 2]) {
      const { data: libro } = await supabaseAdmin.from('libros')
        .select('id,nombre,numero,version').eq('etapa_id', (insc.etapa as any).id)
        .eq('numero', num).eq('version', insc.version_libro).single()
      if (libro) {
        const { data: rl } = await supabaseAdmin.from('resumen_libro')
          .select('tareas_completadas,tareas_total,zona,nota_final,promovido')
          .eq('inscripcion_id', insc.id).eq('libro_id', libro.id).single()
        libros.push({ ...libro, resumen: rl ?? null })
      }
    }
  }

  return ok({ estudiante: est, inscripcion: insc, resumen_etapa: re, libros })
}
