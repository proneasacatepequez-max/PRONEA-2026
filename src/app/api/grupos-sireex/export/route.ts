// src/app/api/grupos-sireex/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req) // ← CORREGIDO: pasar req

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const ciclo = req.nextUrl.searchParams.get('ciclo') ?? '2026'

    // Filtrar grupos según rol
    let q = supabaseAdmin
      .from('grupos_sireex')
      .select(`
        id, codigo, nombre, estado, ciclo_escolar, fecha_apertura,
        tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico),
        etapa:etapas(nombre),
        sede:sedes(nombre),
        inscripcion_grupo_sireex(
          inscripcion:inscripciones(
            id, estado,
            estudiante:estudiantes(
              codigo_estudiante, primer_nombre, segundo_nombre,
              primer_apellido, segundo_apellido, cui, telefono, fecha_nacimiento
            ),
            etapa:etapas(nombre),
            tecnico:tecnicos!inscripciones_tecnico_id_fkey(primer_nombre, primer_apellido, codigo_tecnico)
          )
        )
      `)
      .eq('ciclo_escolar', parseInt(ciclo))
      .order('nombre', { ascending: true })

    // Filtrar por sede si es director o enlace
    if (session.rol === 'director') {
      const { data: dir } = await supabaseAdmin
        .from('directores').select('sede_id').eq('usuario_id', session.sub).single()
      if (dir?.sede_id) q = q.eq('sede_id', dir.sede_id)
    }

    if (session.rol === 'tecnico') {
      const { data: tec } = await supabaseAdmin
        .from('tecnicos').select('id').eq('usuario_id', session.sub).single()
      if (tec?.id) q = q.eq('tecnico_id', tec.id)
    }

    const { data: grupos, error: gruposError } = await q

    if (gruposError) {
      return NextResponse.json({ error: gruposError.message }, { status: 500 })
    }

    // Construir CSV
    let csv = 'GRUPOS SIREEX - PRONEA SACATEPÉQUEZ\n'
    csv += `Exportado: ${new Date().toLocaleDateString('es-GT')} · Ciclo ${ciclo}\n\n`

    if (!grupos || grupos.length === 0) {
      csv += 'Sin grupos SIREEX registrados'
      return new Response(csv, {
        headers: {
          'Content-Type':        'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="grupos-sireex.csv"',
        },
      })
    }

    csv += 'GRUPO,CÓDIGO,ESTADO,ETAPA,SEDE,TÉCNICO,ESTUDIANTE,CUI,TELÉFONO,FECHA_NAC,ESTADO_INSCRIPCIÓN\n'

    grupos.forEach((grupo: any) => {
      const inscripciones = grupo.inscripcion_grupo_sireex ?? []
      const tecNombre = grupo.tecnico
        ? `${grupo.tecnico.primer_nombre} ${grupo.tecnico.primer_apellido}`
        : '—'

      if (inscripciones.length === 0) {
        csv += `"${grupo.nombre}","${grupo.codigo}","${grupo.estado}","${grupo.etapa?.nombre ?? ''}","${grupo.sede?.nombre ?? ''}","${tecNombre}","SIN ESTUDIANTES","","","",""\n`
      } else {
        inscripciones.forEach((insc: any, idx: number) => {
          const est = insc.inscripcion?.estudiante
          const nombre = `${est?.primer_nombre ?? ''} ${est?.segundo_nombre ?? ''} ${est?.primer_apellido ?? ''} ${est?.segundo_apellido ?? ''}`.trim()
          const grupoInfo = idx === 0
            ? `"${grupo.nombre}","${grupo.codigo}","${grupo.estado}","${grupo.etapa?.nombre ?? ''}","${grupo.sede?.nombre ?? ''}","${tecNombre}"`
            : `"","","","","",""`
          csv += `${grupoInfo},"${nombre}","${est?.cui ?? ''}","${est?.telefono ?? ''}","${est?.fecha_nacimiento ?? ''}","${insc.inscripcion?.estado ?? ''}"\n`
        })
      }
    })

    // Resumen
    const totalEst = grupos.reduce((s: number, g: any) => s + (g.inscripcion_grupo_sireex?.length ?? 0), 0)
    csv += `\n\nRESUMEN\nTotal grupos,${grupos.length}\nTotal estudiantes,${totalEst}\n`

    return new Response(csv, {
      headers: {
        'Content-Type':        'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="grupos-sireex-${ciclo}-${Date.now()}.csv"`,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
