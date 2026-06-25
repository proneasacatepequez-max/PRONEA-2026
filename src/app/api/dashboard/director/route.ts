// src/app/api/dashboard/director/route.ts
// FIX CRÍTICO #2: Mostrar estadísticas correctas del director
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.rol !== 'director') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener director para sede_id
    const { data: director, error: directorError } = await supabase
      .from('directores')
      .select('id, sede_id')
      .eq('usuario_id', session.id)
      .single()

    if (directorError || !director) {
      return NextResponse.json(
        { error: 'Director no encontrado' },
        { status: 404 }
      )
    }

    const ciclo = 2026

    // FIX: Contar técnicos de la sede
    const { data: tecnicos, error: tecnicosError } = await supabase
      .from('tecnico_sedes')
      .select('tecnico_id', { count: 'exact' })
      .eq('sede_id', director.sede_id)

    const totalTecnicos = tecnicos?.length || 0

    // FIX: Contar estudiantes inscritos en la sede
    const { data: inscripciones, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('id', { count: 'exact' })
      .eq('sede_id', director.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    const totalEstudiantes = inscripciones?.length || 0

    // Contar sedes (normalmente 1 para director)
    const totalSedes = 1

    // Contar etapas activas
    const { data: etapas, error: etapasError } = await supabase
      .from('etapas')
      .select('id', { count: 'exact' })

    const totalEtapas = etapas?.length || 0

    // Contar escalas pendientes
    const { data: escalasPendientes } = await supabase
      .from('escala_asignaciones')
      .select('id', { count: 'exact' })
      .eq('estado', 'pendiente')
      .eq('ciclo_escolar', ciclo)

    const totalEscalasPendientes = escalasPendientes?.length || 0

    // Log para debugging
    console.log(`Dashboard Director - Sede: ${director.sede_id}`)
    console.log(`  Técnicos: ${totalTecnicos}`)
    console.log(`  Estudiantes: ${totalEstudiantes}`)
    console.log(`  Escalas pendientes: ${totalEscalasPendientes}`)

    return NextResponse.json({
      ok: true,
      director: {
        id: director.id,
        sede_id: director.sede_id,
      },
      estadisticas: {
        totalTecnicos,
        totalEstudiantes,
        totalSedes,
        totalEtapas,
        totalEscalasPendientes,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Director error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
