// src/app/api/tecnico/exportar-estudiantes/route.ts — NUEVA RUTA
// Genera Excel con todos los estudiantes del técnico (propios + de sus enlaces)
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const ciclo = parseInt(req.nextUrl.searchParams.get('ciclo') ?? '2026')

  // Obtener tecnico_id
  const { data: tec } = await supabaseAdmin.from('tecnicos')
    .select('id, primer_nombre, primer_apellido, codigo_tecnico')
    .eq('usuario_id', s.sub).single()
  if (!tec && s.rol === 'tecnico') return err('Perfil de técnico no encontrado', 404)

  // Obtener todas las inscripciones del técnico (propias + de sus enlaces)
  let q = supabaseAdmin.from('inscripciones')
    .select(`
      id, version_libro, estado, fecha_inscripcion, ciclo_escolar,
      estudiante:estudiantes(
        codigo_estudiante, codigo_sireex,
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        apellido_casada, cui, cui_pendiente, fecha_nacimiento, genero,
        telefono, telefono_alternativo, correo,
        municipio:municipios(nombre),
        discapacidad:tipos_discapacidad(nombre)
      ),
      etapa:etapas(nombre, nivel),
      sede:sedes(nombre)
    `)
    .eq('ciclo_escolar', ciclo)
    .eq('estado', 'en_curso')
    .order('fecha_inscripcion')

  if (tec) {
    // Inscripciones directas
    const { data: enlacesVinculados } = await supabaseAdmin
      .from('tecnico_enlaces')
      .select('enlace_id').eq('tecnico_id', tec.id).eq('activo', true)

    if (enlacesVinculados && enlacesVinculados.length > 0) {
      const enlaceIds = enlacesVinculados.map((e: any) => e.enlace_id)
      const { data: enlacesInfo } = await supabaseAdmin
        .from('enlaces_institucionales').select('usuario_id').in('id', enlaceIds)
      const enlaceUsuIds = (enlacesInfo ?? []).map((e: any) => e.usuario_id)
      q = q.or(`tecnico_id.eq.${tec.id},creado_por.in.(${enlaceUsuIds.join(',')})`)
    } else {
      q = q.eq('tecnico_id', tec.id)
    }
  }

  const { data: inscripciones, error } = await q
  if (error) return err(error.message, 500)

  // Construir filas
  const filas = (inscripciones ?? []).map((i: any, idx: number) => {
    const e  = i.estudiante as any
    const fn = e?.fecha_nacimiento
    const edad = fn ? new Date().getFullYear() - new Date(fn).getFullYear() : ''
    return {
      'No.':                idx + 1,
      'Código Estudiante':  e?.codigo_estudiante ?? '',
      'Código SIREEX':      e?.codigo_sireex     ?? '',
      'Primer Apellido':    e?.primer_apellido   ?? '',
      'Segundo Apellido':   e?.segundo_apellido  ?? '',
      'Apellido Casada':    e?.apellido_casada   ?? '',
      'Primer Nombre':      e?.primer_nombre     ?? '',
      'Segundo Nombre':     e?.segundo_nombre    ?? '',
      'CUI':                e?.cui               ?? (e?.cui_pendiente ? 'PENDIENTE' : ''),
      'Fecha Nacimiento':   fn ?? '',
      'Edad':               edad,
      'Género':             e?.genero            ?? '',
      'Teléfono':           e?.telefono          ?? '',
      'Teléfono Alt.':      e?.telefono_alternativo ?? '',
      'Correo':             e?.correo            ?? '',
      'Municipio':          (e?.municipio as any)?.nombre ?? '',
      'Discapacidad':       (e?.discapacidad as any)?.nombre ?? 'Ninguna',
      'Etapa':              (i.etapa as any)?.nombre  ?? '',
      'Nivel':              (i.etapa as any)?.nivel   ?? '',
      'Versión Libro':      i.version_libro      ?? '',
      'Sede':               (i.sede as any)?.nombre   ?? '',
      'Estado':             i.estado             ?? '',
      'Fecha Inscripción':  i.fecha_inscripcion  ?? '',
    }
  })

  // Crear workbook
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws['!cols'] = [
    { wch: 5 },  // No.
    { wch: 16 }, // Código
    { wch: 14 }, // SIREEX
    { wch: 18 }, // P. Apellido
    { wch: 18 }, // S. Apellido
    { wch: 16 }, // Ap. Casada
    { wch: 16 }, // P. Nombre
    { wch: 16 }, // S. Nombre
    { wch: 14 }, // CUI
    { wch: 14 }, // Nacimiento
    { wch: 6  }, // Edad
    { wch: 10 }, // Género
    { wch: 12 }, // Teléfono
    { wch: 12 }, // Tel. Alt
    { wch: 26 }, // Correo
    { wch: 20 }, // Municipio
    { wch: 18 }, // Discapacidad
    { wch: 22 }, // Etapa
    { wch: 14 }, // Nivel
    { wch: 12 }, // Versión
    { wch: 28 }, // Sede
    { wch: 12 }, // Estado
    { wch: 14 }, // Fecha insc.
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

  // Hoja de resumen
  const resumen: any[][] = [
    ['PRONEA — Listado de Estudiantes'],
    [],
    ['Técnico',         tec ? `${tec.primer_nombre} ${tec.primer_apellido}` : 'Admin'],
    ['Código técnico',  tec?.codigo_tecnico ?? '—'],
    ['Ciclo escolar',   ciclo],
    ['Total estudiantes', filas.length],
    ['Generado el',     new Date().toLocaleString('es-GT')],
  ]
  const wsResumen = XLSX.utils.aoa_to_sheet(resumen)
  wsResumen['!cols'] = [{ wch: 20 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Estudiantes-${tec?.codigo_tecnico ?? 'admin'}-${ciclo}.xlsx"`,
    },
  })
}
