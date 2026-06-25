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

    // ✅ CORREGIDO: Contar estudiantes inscritos en su sede usando count correcto
    const { count: totalEstudiantes, error: inscripcionesError } = await supabase
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', enlace.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    if (inscripcionesError) {
      console.error('Error contando estudiantes:', inscripcionesError)
    }

    // Contar notas ingresadas por este enlace
    const { count: totalNotasIngresadas, error: notasError } = await supabase
      .from('notas_tareas')
      .select('*', { count: 'exact', head: true })
      .eq('registrado_por', session.id)

    if (notasError) {
      console.error('Error contando notas:', notasError)
    }

    // Contar autorizaciones activas del enlace
    const { count: permisosCantidad, error: autorizacionesError } = await supabase
      .from('autorizaciones_director')
      .select('*', { count: 'exact', head: true })
      .eq('enlace_id', enlace.id)
      .eq('activo', true)

    if (autorizacionesError) {
      console.error('Error contando autorizaciones:', autorizacionesError)
    }

    // Log para debugging
    console.log(`Dashboard Enlace - Sede: ${enlace.sede_id}`)
    console.log(`  Estudiantes: ${totalEstudiantes || 0}`)
    console.log(`  Notas ingresadas: ${totalNotasIngresadas || 0}`)
    console.log(`  Permisos activos: ${permisosCantidad || 0}`)

    return NextResponse.json({
      ok: true,
      enlace: {
        id: enlace.id,
        sede_id: enlace.sede_id,
      },
      estadisticas: {
        totalEstudiantes: totalEstudiantes || 0,
        totalNotasIngresadas: totalNotasIngresadas || 0,
        permisosCantidad: permisosCantidad || 0,
      },
      ciclo,
    })
  } catch (err: any) {
    console.error('Dashboard Enlace error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
