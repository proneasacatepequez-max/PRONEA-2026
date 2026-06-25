// src/app/api/dashboard/tecnico/route.ts
// FIX #5: Mostrar estudiantes correctamente en dashboard técnico
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

    if (!session || session.rol !== 'tecnico') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener técnico
    const { data: tecnico, error: tecnicoError } = await supabase
      .from('tecnicos')
      .select('id')
      .eq('usuario_id', session.id)
      .single()

    if (tecnicoError || !tecnico) {
      return NextResponse.json(
        { error: 'Técnico no encontrado' },
        { status: 404 }
      )
    }

    const ciclo = 2026

    // ✅ CORREGIDO: Contar estudiantes asignados a este técnico usando count correcto
    const { count: totalEstudiantes, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (inscripcionesError) {
      console.error('Error contando estudiantes:', inscripcionesError)
    }

    // Contar escalas asignadas
    const { count: totalEscalasAsignadas, error: escalasError } = await supabase
      .from('escala_asignaciones')
      .select('*', { count: 'exact', head: true })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)

    if (escalasError) {
      console.error('Error contando escalas:', escalasError)
    }

    // Contar notas ingresadas
    const { count: totalNotasIngresadas, error: notasError } = await supabase
      .from('notas_tareas')
      .select('*', { count: 'exact', head: true })
      .eq('registrado_por', session.id)

    if (notasError) {
      console.error('Error contando notas:', notasError)
    }

    // Log para debugging
    console.log(`Dashboard Técnico - ID: ${tecnico.id}`)
    console.log(`  Estudiantes: ${totalEstudiantes || 0}`)
    console.log(`  Escalas: ${totalEscalasAsignadas || 0}`)
    console.log(`  Notas: ${totalNotasIngresadas || 0}`)

    return NextResponse.json({
      ok: true,
      tecnico: {
        id: tecnico.id,
      },
      estadisticas: {
        totalEstudiantes: totalEstudiantes || 0,
        totalEscalasAsignadas: totalEscalasAsignadas || 0,
        totalNotasIngresadas: totalNotasIngresadas || 0,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Técnico error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
