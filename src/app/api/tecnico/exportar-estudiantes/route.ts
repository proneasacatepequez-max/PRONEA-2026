// src/app/api/tecnico/exportar-estudiantes/route.ts
// FIX: enlace ahora usa sede_id directo (tras unificación sede/institución)
// FIX: manejo de errores que evita "Error al exportar" genérico sin detalle
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director', 'enlace_institucional'].includes(s.rol))
    return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  try {
    const selectExport = `
        id, ciclo_escolar, version_libro, estado, fecha_inscripcion, tiene_ajuste_discapacidad,
        estudiante:estudiantes(
          codigo_estudiante, codigo_sireex,
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellido_casada,
          cui, cui_pendiente, fecha_nacimiento, genero,
          telefono, telefono_alternativo, correo, direccion,
          municipio:municipios(nombre),
          discapacidad:tipos_discapacidad(nombre)
        ),
        etapa:etapas(nombre, nivel),
        sede:sedes(nombre),
        tecnico:tecnicos!inscripciones_tecnico_id_fkey(primer_nombre, primer_apellido, codigo_tecnico)
      `

    // Sin filtro adicional por defecto (administrador ve todo el ciclo)
    let filtroRol: (query: any) => any = (query) => query

    // ── Filtros por rol ────────────────────────────────────────────────────
    if (s.rol === 'tecnico') {
      const { data: tec } = await supabaseAdmin.from('tecnicos')
        .select('id').eq('usuario_id', s.sub).single()
      if (!tec) return err('Tu perfil de técnico no está configurado', 404)

      // CORREGIDO: mismo filtro que /api/inscripciones — ver sedes asignadas
      const { data: tecSedes } = await supabaseAdmin
        .from('tecnico_sedes')
        .select('sede_id')
        .eq('tecnico_id', tec.id)
        .eq('activo', true)

      const sedeIds = (tecSedes ?? []).map((ts: any) => ts.sede_id)

      filtroRol = sedeIds.length > 0
        ? (query) => query.or(`tecnico_id.eq.${tec.id},sede_id.in.(${sedeIds.join(',')})`)
        : (query) => query.eq('tecnico_id', tec.id)
    }

    if (s.rol === 'director') {
      const { data: dir } = await supabaseAdmin
        .from('directores').select('sede_id, departamento_id').eq('usuario_id', s.sub).maybeSingle()
      if (dir?.departamento_id) {
        const { data: sedesDepto } = await supabaseAdmin
          .from('sedes').select('id').eq('departamento_id', dir.departamento_id)
        const sedeIds = (sedesDepto ?? []).map((sd: any) => sd.id)
        if (sedeIds.length > 0) filtroRol = (query) => query.in('sede_id', sedeIds)
      } else if (dir?.sede_id) {
        filtroRol = (query) => query.eq('sede_id', dir!.sede_id)
      }
    }

    if (s.rol === 'enlace_institucional') {
      const { data: enl } = await supabaseAdmin
        .from('enlaces_institucionales').select('sede_id').eq('usuario_id', s.sub).single()

      if (!enl) return err('Perfil de enlace no encontrado', 404)
      if (!enl.sede_id) {
        // Sin sede asignada — devolver Excel vacío con mensaje claro en lugar de error
        const wbVacio = XLSX.utils.book_new()
        const wsVacio = XLSX.utils.aoa_to_sheet([
          ['Tu cuenta de enlace no tiene una sede/institución asignada.'],
          ['Pide al administrador que la configure desde Gestión de Usuarios.'],
        ])
        XLSX.utils.book_append_sheet(wbVacio, wsVacio, 'Sin datos')
        const buf = XLSX.write(wbVacio, { type: 'buffer', bookType: 'xlsx' })
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Sin-Sede-Asignada.xlsx"',
          },
        })
      }
      const sedeIdEnl = enl.sede_id
      filtroRol = (query) => query.eq('sede_id', sedeIdEnl)
    }

    // Paginado con fetchAllRows: PostgREST limita a 1000 filas por consulta.
    // Para técnico/enlace individual difícilmente se llega a 1000, pero
    // administrador ve todo el ciclo (~1800/año) sin filtro adicional.
    const data = await fetchAllRows<any>((from, to) => {
      let qq = supabaseAdmin.from('inscripciones')
        .select(selectExport)
        .eq('ciclo_escolar', ciclo)
        .eq('estado', 'en_curso')
        .order('fecha_inscripcion', { ascending: false })

      qq = filtroRol(qq)
      return qq.range(from, to) as any
    })

    const filas = (data ?? []).map((i: any, idx: number) => {
      const e  = i.estudiante as any
      const fn = e?.fecha_nacimiento
      return {
        'No.':              idx + 1,
        'Código MINEDUC':   e?.codigo_estudiante   ?? '',
        'Código SIREEX':    e?.codigo_sireex        ?? '',
        'Primer Apellido':  e?.primer_apellido      ?? '',
        'Segundo Apellido': e?.segundo_apellido     ?? '',
        'Apellido Casada':  e?.apellido_casada      ?? '',
        'Primer Nombre':    e?.primer_nombre        ?? '',
        'Segundo Nombre':   e?.segundo_nombre       ?? '',
        'CUI':              e?.cui ?? (e?.cui_pendiente ? 'PENDIENTE' : ''),
        'Fecha Nacimiento': fn ?? '',
        'Edad':             fn ? String(new Date().getFullYear() - new Date(fn).getFullYear()) : '',
        'Género':           e?.genero               ?? '',
        'Teléfono':         e?.telefono             ?? '',
        'Tel. Alternativo': e?.telefono_alternativo ?? '',
        'Correo':           e?.correo               ?? '',
        'Dirección':        e?.direccion            ?? '',
        'Municipio':    (e?.municipio   as any)?.nombre ?? '',
        'Discapacidad': (e?.discapacidad as any)?.nombre ?? 'Ninguna',
        'Etapa':        (i.etapa   as any)?.nombre ?? '',
        'Nivel':        (i.etapa   as any)?.nivel  ?? '',
        'Versión Libro':    i.version_libro         ?? '',
        'Sede':         (i.sede    as any)?.nombre  ?? '',
        'Técnico':      `${(i.tecnico as any)?.primer_nombre ?? ''} ${(i.tecnico as any)?.primer_apellido ?? ''}`.trim(),
        'Código Técnico': (i.tecnico as any)?.codigo_tecnico ?? '',
        'Estado':           i.estado                ?? '',
        'Con Ajuste':       i.tiene_ajuste_discapacidad ? 'Sí' : 'No',
        'Fecha Inscripción': i.fecha_inscripcion   ?? '',
      }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = [
      {wch:5},{wch:16},{wch:14},{wch:18},{wch:18},{wch:16},{wch:16},{wch:16},
      {wch:14},{wch:14},{wch:6},{wch:10},{wch:12},{wch:12},{wch:26},{wch:28},
      {wch:20},{wch:18},{wch:22},{wch:14},{wch:12},{wch:28},{wch:26},{wch:14},
      {wch:12},{wch:8},{wch:14},
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

    const infoData = [
      ['PRONEA — Listado de Estudiantes'],
      ['Ciclo escolar', ciclo],
      ['Total estudiantes', filas.length],
      ['Generado el', new Date().toLocaleString('es-GT')],
    ]
    const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
    wsInfo['!cols'] = [{wch:20},{wch:35}]
    XLSX.utils.book_append_sheet(wb, wsInfo, 'Resumen')

    const buffer = XLSX.write(wb, { type:'buffer', bookType:'xlsx' })
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Estudiantes-${ciclo}.xlsx"`,
      },
    })
  } catch (e: any) {
    // Capturar cualquier error inesperado (ej. librería xlsx) con mensaje claro
    return err('Error inesperado al generar el Excel: ' + (e?.message ?? 'desconocido'), 500)
  }
}


