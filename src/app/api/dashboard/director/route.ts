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

    // ✅ CORREGIDO: Contar técnicos de la sede usando count correcto
    const { count: totalTecnicos, error: tecnicosError } = await supabase
      .from('tecnico_sedes')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('activo', true)

    if (tecnicosError) {
      console.error('Error contando técnicos:', tecnicosError)
    }

    // ✅ CORREGIDO: Contar estudiantes inscritos en la sede usando count correcto
    const { count: totalEstudiantes, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', director.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (inscripcionesError) {
      console.error('Error contando estudiantes:', inscripcionesError)
    }

    // Contar sedes (normalmente 1 para director)
    const totalSedes = 1

    // Contar etapas activas
    const { count: totalEtapas, error: etapasError } = await supabase
      .from('etapas')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true)

    if (etapasError) {
      console.error('Error contando etapas:', etapasError)
    }

    // Contar escalas pendientes
    const { count: totalEscalasPendientes, error: escalasError } = await supabase
      .from('escala_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'pendiente')
      .eq('ciclo_escolar', ciclo)

    if (escalasError) {
      console.error('Error contando escalas pendientes:', escalasError)
    }

    // Log para debugging
    console.log(`Dashboard Director - Sede: ${director.sede_id}`)
    console.log(`  Técnicos: ${totalTecnicos || 0}`)
    console.log(`  Estudiantes: ${totalEstudiantes || 0}`)
    console.log(`  Escalas pendientes: ${totalEscalasPendientes || 0}`)

    return NextResponse.json({
      ok: true,
      director: {
        id: director.id,
        sede_id: director.sede_id,
      },
      estadisticas: {
        totalTecnicos: totalTecnicos || 0,
        totalEstudiantes: totalEstudiantes || 0,
        totalSedes,
        totalEtapas: totalEtapas || 0,
        totalEscalasPendientes: totalEscalasPendientes || 0,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Director error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
