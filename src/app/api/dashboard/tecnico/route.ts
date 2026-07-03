// src/app/api/dashboard/tecnico/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req) // ← CORREGIDO: pasar req

    if (!session || session.rol !== 'tecnico') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

    // Obtener técnico usando session.sub (no session.id)
    const { data: tecnico, error: tecnicoError } = await supabaseAdmin
      .from('tecnicos')
      .select('id, primer_nombre, primer_apellido, codigo_tecnico')
      .eq('usuario_id', session.sub) // ← CORREGIDO: session.sub
      .single()

    if (tecnicoError || !tecnico) {
      return NextResponse.json({ error: 'Técnico no encontrado' }, { status: 404 })
    }

    // CORREGIDO: obtener sedes del técnico para contar estudiantes correctamente
    const { data: tecSedes } = await supabaseAdmin
      .from('tecnico_sedes')
      .select('sede_id')
      .eq('tecnico_id', tecnico.id)
      .eq('activo', true)

    const sedeIds = (tecSedes ?? []).map((ts: any) => ts.sede_id)

    // Contar estudiantes activos — por sedes asignadas O por tecnico_id directo
    let qEstudiantes = supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (sedeIds.length > 0) {
      qEstudiantes = qEstudiantes.or(
        `tecnico_id.eq.${tecnico.id},sede_id.in.(${sedeIds.join(',')})`
      )
    } else {
      qEstudiantes = qEstudiantes.eq('tecnico_id', tecnico.id)
    }

    const { count: totalEstudiantes } = await qEstudiantes

    // Contar TODOS los estudiantes (cualquier estado) del ciclo
    let qTodos = supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('ciclo_escolar', ciclo)

    if (sedeIds.length > 0) {
      qTodos = qTodos.or(
        `tecnico_id.eq.${tecnico.id},sede_id.in.(${sedeIds.join(',')})`
      )
    } else {
      qTodos = qTodos.eq('tecnico_id', tecnico.id)
    }

    const { count: totalTodos } = await qTodos

    // Contar sedes del técnico
    const { count: totalSedes } = await supabaseAdmin
      .from('tecnico_sedes')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('activo', true)

    // Contar enlaces — en tecnico_enlaces (por ciclo) + asignados directamente
    const [{ count: enlacesPorCiclo }, { count: enlacesDirectos }] = await Promise.all([
      supabaseAdmin
        .from('tecnico_enlaces')
        .select('*', { count: 'exact', head: true })
        .eq('tecnico_id', tecnico.id)
        .eq('ciclo_escolar', ciclo)
        .eq('activo', true),
      supabaseAdmin
        .from('enlaces_institucionales')
        .select('*', { count: 'exact', head: true })
        .eq('tecnico_id', tecnico.id)
        .eq('activo', true),
    ])

    // Usar el mayor de los dos conteos (evitar duplicados)
    const totalEnlaces = Math.max(enlacesPorCiclo ?? 0, enlacesDirectos ?? 0)

    // Contar notas ingresadas por el técnico
    const { count: totalNotas } = await supabaseAdmin
      .from('notas_tareas')
      .select('*', { count: 'exact', head: true })
      .eq('registrado_por', session.sub)

    // Escalas asignadas
    const { count: totalEscalas } = await supabaseAdmin
      .from('escala_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)

    // Distribución por etapa — usando mismo filtro (sedes asignadas)
    let qEtapa = supabaseAdmin
      .from('inscripciones')
      .select('etapa:etapas(nombre)')
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (sedeIds.length > 0) {
      qEtapa = qEtapa.or(`tecnico_id.eq.${tecnico.id},sede_id.in.(${sedeIds.join(',')})`)
    } else {
      qEtapa = qEtapa.eq('tecnico_id', tecnico.id)
    }

    const { data: porEtapaData } = await qEtapa

    const porEtapa: Record<string, number> = {}
    ;(porEtapaData ?? []).forEach((i: any) => {
      const nombre = i.etapa?.nombre ?? '—'
      porEtapa[nombre] = (porEtapa[nombre] ?? 0) + 1
    })

    // Distribución por sede
    let qSede = supabaseAdmin
      .from('inscripciones')
      .select('sede:sedes(nombre)')
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (sedeIds.length > 0) {
      qSede = qSede.or(`tecnico_id.eq.${tecnico.id},sede_id.in.(${sedeIds.join(',')})`)
    } else {
      qSede = qSede.eq('tecnico_id', tecnico.id)
    }

    const { data: porSedeData } = await qSede

    const porSede: Record<string, number> = {}
    ;(porSedeData ?? []).forEach((i: any) => {
      const nombre = i.sede?.nombre ?? '—'
      porSede[nombre] = (porSede[nombre] ?? 0) + 1
    })

    return NextResponse.json({
      ok: true,
      tecnico: {
        id:             tecnico.id,
        primer_nombre:  tecnico.primer_nombre,
        primer_apellido:tecnico.primer_apellido,
        codigo_tecnico: tecnico.codigo_tecnico,
      },
      estadisticas: {
        totalEstudiantes:   totalEstudiantes  ?? 0,
        totalTodos:         totalTodos        ?? 0,
        totalSedes:         totalSedes        ?? 0,
        totalEnlaces:       totalEnlaces      ?? 0,
        totalNotas:         totalNotas        ?? 0,
        totalEscalas:       totalEscalas      ?? 0,
      },
      porEtapa,
      porSede,
      ciclo,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
