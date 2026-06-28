// src/app/api/dashboard/director/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req) // ← CORREGIDO: pasar req

    if (!session || session.rol !== 'director') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

    // Obtener director usando session.sub (no session.id)
    const { data: director, error: directorError } = await supabaseAdmin
      .from('directores')
      .select(`
        id, sede_id, primer_nombre, primer_apellido,
        sede:sedes!directores_sede_id_fkey(id, nombre, municipio:municipios(nombre))
      `)
      .eq('usuario_id', session.sub) // ← CORREGIDO: session.sub
      .single()

    if (directorError || !director) {
      return NextResponse.json({ error: 'Director no encontrado' }, { status: 404 })
    }

    // Contar técnicos en la sede
    const { count: totalTecnicos } = await supabaseAdmin
      .from('tecnico_sedes')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('activo', true)

    // Contar enlaces en la sede
    const { count: totalEnlaces } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('activo', true)

    // Estudiantes activos en la sede
    const { count: totalEstudiantes } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    // Total inscripciones (cualquier estado)
    const { count: totalTodos } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('ciclo_escolar', ciclo)

    // Escalas pendientes
    const { count: totalEscalasPendientes } = await supabaseAdmin
      .from('escala_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .eq('ciclo_escolar', ciclo)

    // Autorizaciones activas del director
    const { count: totalAutorizaciones } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('*', { count: 'exact', head: true })
      .eq('director_id', director.id)
      .eq('activo', true)

    // Distribución por etapa
    const { data: porEtapaData } = await supabaseAdmin
      .from('inscripciones')
      .select('etapa:etapas(nombre)')
      .eq('sede_id', director.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    const porEtapa: Record<string, number> = {}
    ;(porEtapaData ?? []).forEach((i: any) => {
      const nombre = i.etapa?.nombre ?? '—'
      porEtapa[nombre] = (porEtapa[nombre] ?? 0) + 1
    })

    return NextResponse.json({
      ok: true,
      director: {
        id:              director.id,
        sede_id:         director.sede_id,
        primer_nombre:   (director as any).primer_nombre,
        primer_apellido: (director as any).primer_apellido,
        sede:            (director as any).sede,
      },
      estadisticas: {
        totalTecnicos:         totalTecnicos         ?? 0,
        totalEnlaces:          totalEnlaces          ?? 0,
        totalEstudiantes:      totalEstudiantes      ?? 0,
        totalTodos:            totalTodos            ?? 0,
        totalEscalasPendientes:totalEscalasPendientes?? 0,
        totalAutorizaciones:   totalAutorizaciones   ?? 0,
      },
      porEtapa,
      ciclo,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
