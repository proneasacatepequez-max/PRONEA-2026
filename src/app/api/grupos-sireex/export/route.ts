// src/app/api/grupos-sireex/export/route.ts
// FIX #9: Exportar Excel con información de estudiantes
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

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener grupos SIREEX con estudiantes
    const { data: grupos, error: gruposError } = await supabase
      .from('grupos_sireex')
      .select(`
        id, codigo, nombre, estado, ciclo_escolar, fecha_creacion,
        inscripcion_grupo_sireex(
          inscripcion:inscripciones(
            id, estado,
            estudiante:estudiantes(
              codigo_estudiante, primer_nombre, segundo_nombre,
              primer_apellido, segundo_apellido, cui, telefono, fecha_nacimiento
            ),
            etapa:etapas(nombre),
            tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
          )
        )
      `)
      .order('nombre', { ascending: true })

    if (gruposError) {
      return NextResponse.json({ error: gruposError.message }, { status: 500 })
    }

    // Construir CSV (Excel compatible)
    let csv = 'GRUPOS SIREEX - PRONEA SACATEPEQUEZ\n'
    csv += `Exportado: ${new Date().toLocaleDateString()}\n\n`

    if (!grupos || grupos.length === 0) {
      csv += 'Sin grupos SIREEX'
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="grupos-sireex.csv"',
        },
      })
    }

    // Headers principales
    csv += 'GRUPO,CODIGO,ESTADO,ESTUDIANTE,CUI,TELÉFONO,ETAPA,TÉCNICO,ESTADO_INSCRIPCION\n'

    // Datos
    grupos.forEach((grupo: any) => {
      const inscripciones = grupo.inscripcion_grupo_sireex || []

      if (inscripciones.length === 0) {
        // Grupo sin estudiantes
        csv += `"${grupo.nombre}","${grupo.codigo}","${grupo.estado}","SIN ESTUDIANTES","","","","",""\n`
      } else {
        // Una fila por estudiante
        inscripciones.forEach((insc: any, idx: number) => {
          const est = insc.inscripcion?.estudiante
          const nombreCompleto = `${est?.primer_nombre || ''} ${est?.segundo_nombre || ''} ${est?.primer_apellido || ''} ${est?.segundo_apellido || ''}`.trim()

          csv += `${idx === 0 ? `"${grupo.nombre}","${grupo.codigo}","${grupo.estado}"` : '"",'}"${nombreCompleto}","${est?.cui || ''}","${est?.telefono || ''}","${insc.inscripcion?.etapa?.nombre || ''}","${insc.inscripcion?.tecnico?.primer_nombre || ''} ${insc.inscripcion?.tecnico?.primer_apellido || ''}","${insc.inscripcion?.estado || ''}"\n`
        })
      }
    })

    // Agregar resumen
    csv += '\n\nRESUMEN\n'
    csv += `Total de grupos,${grupos.length}\n`

    const totalEstudiantes = grupos.reduce(
      (sum: number, g: any) => sum + (g.inscripcion_grupo_sireex?.length || 0),
      0
    )
    csv += `Total de estudiantes,${totalEstudiantes}\n`

    console.log(`✅ SIREEX exportado: ${grupos.length} grupos, ${totalEstudiantes} estudiantes`)

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="grupos-sireex-${new Date().getTime()}.csv"`,
      },
    })
  } catch (err: any) {
    console.error('Export error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
