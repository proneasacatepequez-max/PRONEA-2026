// src/app/api/notas/calcular/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
import { cargarConfig, calcZona, calcLibro, calcEtapa, cualitativa } from '@/lib/permisos'

export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const { inscripcion_id, numero_libro } = await req.json()
  if(!inscripcion_id) return err('inscripcion_id requerido')

  const cfg = await cargarConfig()
  const { data:insc } = await supabaseAdmin.from('inscripciones')
    .select('id,etapa_id,version_libro,tiene_ajuste_discapacidad').eq('id',inscripcion_id).single()
  if(!insc) return err('Inscripción no encontrada',404)

  const nums = numero_libro ? [parseInt(numero_libro)] : [1,2]
  const resultados = []

  for(const num of nums) {
    const { data:libro } = await supabaseAdmin.from('libros').select('id,nombre,numero,version')
      .eq('etapa_id',insc.etapa_id).eq('numero',num).eq('version',insc.version_libro).eq('activo',true).single()
    if(!libro) continue

    const { data:tc } = await supabaseAdmin.from('tareas_catalogo').select('id,puntos_max').eq('libro_id',libro.id).eq('activo',true)

    let omitidas: string[] = []
    if(insc.tiene_ajuste_discapacidad) {
      const { data:adj } = await supabaseAdmin.from('ajustes_discapacidad')
        .select('tareas_omitidas_ajuste(tarea_id)').eq('inscripcion_id',inscripcion_id).eq('activo',true)
      adj?.forEach((a:any)=>a.tareas_omitidas_ajuste?.forEach((t:any)=>omitidas.push(t.tarea_id)))
    }

    const activas = (tc??[]).filter((t:any)=>!omitidas.includes(t.id))
    const maxPts = activas.reduce((s:number,t:any)=>s+(t.puntos_max??5),0)
    const { data:nt } = await supabaseAdmin.from('notas_tareas')
      .select('nota').eq('inscripcion_id',inscripcion_id).in('tarea_id',activas.map((t:any)=>t.id))
    const pts = (nt??[]).reduce((s:number,n:any)=>s+(n.nota??0),0)
    const zona = calcZona(pts,maxPts)

    const { data:ec } = await supabaseAdmin.from('examenes_catalogo').select('id').eq('libro_id',libro.id).eq('activo',true)
    const { data:ne } = await supabaseAdmin.from('notas_examenes')
      .select('nota_original').eq('inscripcion_id',inscripcion_id).in('examen_id',(ec??[]).map((e:any)=>e.id))
    const promExamen = (ne??[]).length>0 ? (ne??[]).reduce((s:number,n:any)=>s+(n.nota_original??0),0)/(ne??[]).length : 0

    const notaFinal = calcLibro(zona,promExamen,cfg)
    const promovido = notaFinal >= cfg.notaMinima

    await supabaseAdmin.from('resumen_libro').upsert({
      inscripcion_id, libro_id:libro.id,
      tareas_completadas:(nt??[]).length, tareas_total:activas.length,
      puntos_tareas:pts, puntos_tareas_max:maxPts, zona,
      promedio_examen:promExamen, nota_examen_final:promExamen*cfg.pctExamenes/100,
      nota_final:notaFinal, calificacion_cualitativa:cualitativa(notaFinal),
      promovido, tiene_ajuste:omitidas.length>0,
      estado:promovido?'listo_validar':'en_progreso', actualizado_en:new Date().toISOString(),
    },{ onConflict:'inscripcion_id,libro_id' })

    resultados.push({ libro_id:libro.id, numero:num, nota_final:notaFinal, promovido })
  }

  // Recalcular etapa
  const { data:rls } = await supabaseAdmin.from('resumen_libro')
    .select('nota_final,libro:libros(numero)').eq('inscripcion_id',inscripcion_id)
  const r1 = (rls??[]).find((r:any)=>r.libro?.numero===1)
  const r2 = (rls??[]).find((r:any)=>r.libro?.numero===2)
  if(r1||r2) {
    const notaEtapa = calcEtapa(r1?.nota_final??null,r2?.nota_final??null,cfg)
    await supabaseAdmin.from('resumen_etapa').upsert({
      inscripcion_id, nota_libro_1:r1?.nota_final??null, nota_libro_2:r2?.nota_final??null,
      nota_final_etapa:notaEtapa, calificacion_cualitativa:notaEtapa?cualitativa(notaEtapa):null,
      promovido:notaEtapa!==null?notaEtapa>=cfg.notaMinima:null, actualizado_en:new Date().toISOString(),
    },{ onConflict:'inscripcion_id' })
  }
  return ok({ ok:true, resultados })
}
