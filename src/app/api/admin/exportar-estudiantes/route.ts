// src/app/api/admin/exportar-estudiantes/route.ts — NUEVA RUTA
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director', 'coordinador_digeex'].includes(s.rol))
    return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  let q = supabaseAdmin.from('inscripciones')
    .select(`
      id, ciclo_escolar, version_libro, estado, fecha_inscripcion, tiene_ajuste_discapacidad,
      estudiante:estudiantes(
        codigo_estudiante, codigo_sireex,
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellido_casada,
        cui, fecha_nacimiento, genero, telefono, telefono_alternativo, correo, direccion,
        municipio:municipios(nombre),
        discapacidad:tipos_discapacidad(nombre)
      ),
      etapa:etapas(nombre, nivel),
      sede:sedes(nombre),
      tecnico:tecnicos!inscripciones_tecnico_id_fkey(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('ciclo_escolar', ciclo)
    .order('fecha_inscripcion', { ascending: false })

  // Director filtra por sedes de su sede
  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin.from('directores')
      .select('sede_id').eq('usuario_id', s.sub).single()
    if (dir?.sede_id) q = q.eq('sede_id', dir.sede_id)
  }

  const { data, error } = await q
  if (error) return err(error.message, 500)

  const filas = (data ?? []).map((i: any, idx: number) => {
    const e  = i.estudiante as any
    const fn = e?.fecha_nacimiento
    return {
      'No.':            idx + 1,
      'Código MINEDUC': e?.codigo_estudiante ?? '',
      'Código SIREEX':  e?.codigo_sireex     ?? '',
      'Primer Apellido':  e?.primer_apellido  ?? '',
      'Segundo Apellido': e?.segundo_apellido ?? '',
      'Apellido Casada':  e?.apellido_casada  ?? '',
      'Primer Nombre':    e?.primer_nombre    ?? '',
      'Segundo Nombre':   e?.segundo_nombre   ?? '',
      'CUI':              e?.cui              ?? '',
      'Fecha Nacimiento': fn ?? '',
      'Edad': fn ? new Date().getFullYear() - new Date(fn).getFullYear() : '',
      'Género':           e?.genero           ?? '',
      'Teléfono':         e?.telefono         ?? '',
      'Tel. Alternativo': e?.telefono_alternativo ?? '',
      'Correo':           e?.correo           ?? '',
      'Dirección':        e?.direccion        ?? '',
      'Municipio':    (e?.municipio as any)?.nombre       ?? '',
      'Discapacidad': (e?.discapacidad as any)?.nombre    ?? 'Ninguna',
      'Etapa':        (i.etapa as any)?.nombre             ?? '',
      'Nivel':        (i.etapa as any)?.nivel              ?? '',
      'Versión Libro':    i.version_libro                  ?? '',
      'Sede':         (i.sede as any)?.nombre              ?? '',
      'Técnico':      `${(i.tecnico as any)?.primer_nombre ?? ''} ${(i.tecnico as any)?.primer_apellido ?? ''}`.trim(),
      'Código Técnico': (i.tecnico as any)?.codigo_tecnico ?? '',
      'Estado':           i.estado                         ?? '',
      'Con Ajuste': i.tiene_ajuste_discapacidad ? 'Sí' : 'No',
      'Fecha Inscripción': i.fecha_inscripcion ?? '',
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

  const info = [
    ['PRONEA — Listado completo de estudiantes'],
    ['Ciclo escolar', ciclo],
    ['Total registros', filas.length],
    ['Generado el', new Date().toLocaleString('es-GT')],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(info)
  wsInfo['!cols'] = [{wch:20},{wch:35}]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Resumen')

  const buffer = XLSX.write(wb, { type:'buffer', bookType:'xlsx' })
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Estudiantes-${ciclo}.xlsx"`,
    },
  })
}
