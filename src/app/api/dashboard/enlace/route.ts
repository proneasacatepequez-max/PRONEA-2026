// src/app/api/dashboard/enlace/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req) // ← CORREGIDO: pasar req

    if (!session || session.rol !== 'enlace_institucional') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

    // Obtener enlace usando session.sub (no session.id)
    const { data: enlace, error: enlaceError } = await supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id, sede_id, primer_nombre, primer_apellido, cargo,
        sede:sedes!enlaces_institucionales_sede_id_fkey(id, nombre),
        tecnico:tecnicos!enlaces_institucionales_tecnico_id_fkey(
          id, primer_nombre, primer_apellido, codigo_tecnico
        )
      `)
      .eq('usuario_id', session.sub) // ← CORREGIDO: session.sub
      .single()

    if (enlaceError || !enlace) {
      return NextResponse.json({ error: 'Enlace no encontrado' }, { status: 404 })
    }

    // Total estudiantes en su sede
    const { count: totalEstudiantes } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', enlace.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    // Total inscripciones cualquier estado
    const { count: totalTodos } = await supabaseAdmin
      .from('inscripciones')
      .select('*', { count: 'exact', head: true })
      .eq('sede_id', enlace.sede_id)
      .eq('ciclo_escolar', ciclo)

    // Notas ingresadas por el enlace
    const { count: totalNotas } = await supabaseAdmin
      .from('notas_tareas')
      .select('*', { count: 'exact', head: true })
      .eq('registrado_por', session.sub)

    // Permisos/autorizaciones activas
    const { count: totalPermisos } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('*', { count: 'exact', head: true })
      .eq('enlace_id', enlace.id)
      .eq('activo', true)

    // Distribución por etapa
    const { data: porEtapaData } = await supabaseAdmin
      .from('inscripciones')
      .select('etapa:etapas(nombre)')
      .eq('sede_id', enlace.sede_id)
      .eq('ciclo_escolar', ciclo)
      .eq('estado', 'en_curso')

    const porEtapa: Record<string, number> = {}
    ;(porEtapaData ?? []).forEach((i: any) => {
      const nombre = i.etapa?.nombre ?? '—'
      porEtapa[nombre] = (porEtapa[nombre] ?? 0) + 1
    })

    return NextResponse.json({
      ok: true,
      enlace: {
        id:              enlace.id,
        sede_id:         enlace.sede_id,
        primer_nombre:   (enlace as any).primer_nombre,
        primer_apellido: (enlace as any).primer_apellido,
        cargo:           (enlace as any).cargo,
        sede:            (enlace as any).sede,
        tecnico:         (enlace as any).tecnico,
      },
      estadisticas: {
        totalEstudiantes: totalEstudiantes ?? 0,
        totalTodos:       totalTodos       ?? 0,
        totalNotas:       totalNotas       ?? 0,
        totalPermisos:    totalPermisos    ?? 0,
      },
      porEtapa,
      ciclo,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
