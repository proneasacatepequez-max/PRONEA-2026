// src/app/api/tecnico/exportar-estudiantes/route.ts
// CORRECCIÓN: técnico y director usan esta ruta — director filtra por sede
// Admin usa /api/admin/exportar-estudiantes
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director', 'enlace_institucional'].includes(s.rol))
    return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  let q = supabaseAdmin.from('inscripciones')
    .select(`
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
      tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('ciclo_escolar', ciclo)
    .eq('estado', 'en_curso')
    .order('fecha_inscripcion', { ascending: false })

  // Filtrar según el rol
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos')
      .select('id').eq('usuario_id', s.sub).single()
    if (!tec) return err('Perfil de técnico no encontrado', 404)

    // Técnico ve sus propios + los de sus enlaces
    const { data: enlacesVinc } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id').eq('tecnico_id', tec.id).eq('activo', true)

    if (enlacesVinc && enlacesVinc.length > 0) {
      const enlaceIds = enlacesVinc.map((e: any) => e.enlace_id)
      const { data: enlacesInfo } = await supabaseAdmin
        .from('enlaces_institucionales').select('usuario_id').in('id', enlaceIds)
      const uids = (enlacesInfo ?? []).map((e: any) => e.usuario_id)
      if (uids.length > 0) {
        q = q.or(`tecnico_id.eq.${tec.id},creado_por.in.(${uids.join(',')})`)
      } else {
        q = q.eq('tecnico_id', tec.id)
      }
    } else {
      q = q.eq('tecnico_id', tec.id)
    }
  }

  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin
      .from('directores').select('sede_id').eq('usuario_id', s.sub).single()
    if (dir?.sede_id) q = q.eq('sede_id', dir.sede_id)
  }

  if (s.rol === 'enlace_institucional') {
    const { data: enl } = await supabaseAdmin
      .from('enlaces_institucionales').select('institucion_id').eq('usuario_id', s.sub).single()
    if (!enl?.institucion_id) return new NextResponse(
      XLSX.write(XLSX.utils.book_new(), { type: 'buffer', bookType: 'xlsx' }),
      { status: 200, headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="Estudiantes.xlsx"' } }
    )
    const { data: sedesInst } = await supabaseAdmin
      .from('sedes').select('id').eq('institucion_id', enl.institucion_id)
    const ids = (sedesInst ?? []).map((s: any) => s.id)
    if (ids.length > 0) q = q.in('sede_id', ids)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)

  // Construir filas
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

  // Hoja resumen
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
}
