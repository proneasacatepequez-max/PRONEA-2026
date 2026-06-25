// src/app/api/dashboard/enlace/route.ts
// FIX CRÍTICO #3: Mostrar estadísticas correctas del enlace
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

    if (!session || session.rol !== 'enlace_institucional') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Obtener enlace para sede_id
    const { data: enlace, error: enlaceError } = await supabase
      .from('enlaces_institucionales')
      .select('id, sede_id')
      .eq('usuario_id', session.id)
      .single()

    if (enlaceError || !enlace) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      )
    }

    const ciclo = 2026

    // FIX: Contar estudiantes inscritos en su sede
    const { data: inscripciones, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('id', { count: 'exact' })
      .eq('sede_id', enlace.sede_id)
      .eq('ciclo_escolar', ciclo)

    const totalEstudiantes = inscripciones?.length || 0

    // Contar notas ingresadas por este enlace
    const { data: notasIngresadas } = await supabase
      .from('notas_tareas')
      .select('id', { count: 'exact' })
      .eq('registrado_por', session.id)

    const totalNotasIngresadas = notasIngresadas?.length || 0

    // Contar autorizaciones activas del enlace
    const { data: autorizaciones } = await supabase
      .from('autorizaciones_director')
      .select('permiso', { count: 'exact' })
      .eq('enlace_id', enlace.id)
      .eq('activo', true)

    const permisosCantidad = autorizaciones?.length || 0

    // Log para debugging
    console.log(`Dashboard Enlace - Sede: ${enlace.sede_id}`)
    console.log(`  Estudiantes: ${totalEstudiantes}`)
    console.log(`  Notas ingresadas: ${totalNotasIngresadas}`)
    console.log(`  Permisos activos: ${permisosCantidad}`)

    return NextResponse.json({
      ok: true,
      enlace: {
        id: enlace.id,
        sede_id: enlace.sede_id,
      },
      estadisticas: {
        totalEstudiantes,
        totalNotasIngresadas,
        permisosCantidad,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Enlace error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
