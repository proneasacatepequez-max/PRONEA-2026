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

    // FIX: Contar estudiantes asignados a este técnico
    const { data: inscripciones, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('id', { count: 'exact' })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    const totalEstudiantes = inscripciones?.length || 0

    // Contar escalas asignadas
    const { data: escalas } = await supabase
      .from('escala_asignaciones')
      .select('id', { count: 'exact' })
      .eq('tecnico_id', tecnico.id)
      .eq('ciclo_escolar', ciclo)

    const totalEscalasAsignadas = escalas?.length || 0

    // Contar notas ingresadas
    const { data: notas } = await supabase
      .from('notas_tareas')
      .select('id', { count: 'exact' })
      .eq('registrado_por', session.id)

    const totalNotasIngresadas = notas?.length || 0

    // Log para debugging
    console.log(`Dashboard Técnico - ID: ${tecnico.id}`)
    console.log(`  Estudiantes: ${totalEstudiantes}`)
    console.log(`  Escalas: ${totalEscalasAsignadas}`)
    console.log(`  Notas: ${totalNotasIngresadas}`)

    return NextResponse.json({
      ok: true,
      tecnico: {
        id: tecnico.id,
      },
      estadisticas: {
        totalEstudiantes,
        totalEscalasAsignadas,
        totalNotasIngresadas,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Técnico error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
