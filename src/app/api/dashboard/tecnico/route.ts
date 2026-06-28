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

    // Contar estudiantes activos del técnico
    const { count: totalEstudiantes } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    // Contar TODOS los estudiantes (cualquier estado) del ciclo
    const { count: totalTodos } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)

    // Contar sedes del técnico
    const { count: totalSedes } = await supabaseAdmin
      .from('tecnico_sedes')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('activo', true)

    // Contar enlaces del técnico
    const { count: totalEnlaces } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('activo', true)

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

    // Distribución por etapa
    const { data: porEtapaData } = await supabaseAdmin
      .from('inscripciones')
      .select('etapa:etapas(nombre)')
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    const porEtapa: Record<string, number> = {}
    ;(porEtapaData ?? []).forEach((i: any) => {
      const nombre = i.etapa?.nombre ?? '—'
      porEtapa[nombre] = (porEtapa[nombre] ?? 0) + 1
    })

    // Distribución por sede
    const { data: porSedeData } = await supabaseAdmin
      .from('inscripciones')
      .select('sede:sedes(nombre)')
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

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
