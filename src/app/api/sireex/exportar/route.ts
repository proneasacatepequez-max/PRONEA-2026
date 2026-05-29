// src/app/api/sireex/exportar/route.ts — NUEVA RUTA
// Genera Excel con todos los estudiantes de un grupo SIREEX
// Incluye nombre de sede de inscripción
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const grupoId = req.nextUrl.searchParams.get('grupo_id')
  if (!grupoId) return err('grupo_id requerido')

  // Datos del grupo
  const { data: grupo } = await supabaseAdmin
    .from('grupos_sireex')
    .select(`
      codigo, codigo_mineduc, ciclo_escolar,
      etapa:etapas(nombre),
      sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('id', grupoId)
    .single()

  if (!grupo) return err('Grupo no encontrado', 404)

  // Verificar que el técnico sea dueño del grupo (si el rol es técnico)
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    const { data: g } = await supabaseAdmin.from('grupos_sireex').select('tecnico_id').eq('id', grupoId).single()
    if (tec?.id !== g?.tecnico_id) return err('No tienes permiso para exportar este grupo', 403)
  }

  // Estudiantes del grupo con datos completos
  const { data: miembros } = await supabaseAdmin
    .from('estudiantes_grupo_sireex')
    .select(`
      estudiante:estudiantes(
        codigo_estudiante, codigo_sireex,
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, fecha_nacimiento, genero, telefono, correo
      ),
      inscripcion:inscripciones(
        version_libro, estado, ciclo_escolar,
        sede:sedes(nombre),
        etapa:etapas(nombre)
      )
    `)
    .eq('grupo_sireex_id', grupoId)
    .order('agregado_en')

  // Construir filas del Excel
  const filas = (miembros ?? []).map((m: any, idx: number) => {
    const e    = m.estudiante as any
    const insc = m.inscripcion as any
    return {
      'No.':               idx + 1,
      'Código Estudiante': e?.codigo_estudiante ?? '',
      'Código SIREEX':     e?.codigo_sireex     ?? '',
      'Primer Apellido':   e?.primer_apellido   ?? '',
      'Segundo Apellido':  e?.segundo_apellido  ?? '',
      'Primer Nombre':     e?.primer_nombre     ?? '',
      'Segundo Nombre':    e?.segundo_nombre    ?? '',
      'CUI':               e?.cui               ?? '',
      'Fecha Nacimiento':  e?.fecha_nacimiento  ?? '',
      'Género':            e?.genero            ?? '',
      'Teléfono':          e?.telefono          ?? '',
      'Correo':            e?.correo            ?? '',
      'Sede Inscripción':  (insc?.sede as any)?.nombre ?? '',
      'Etapa':             (insc?.etapa as any)?.nombre ?? '',
      'Versión Libro':     insc?.version_libro  ?? '',
      'Estado':            insc?.estado         ?? '',
    }
  })

  // Crear workbook
  const wb = XLSX.utils.book_new()

  // Hoja de estudiantes
  const ws = XLSX.utils.json_to_sheet(filas)
  ws['!cols'] = [
    { wch: 5 },  // No.
    { wch: 16 }, // Código Estudiante
    { wch: 14 }, // Código SIREEX
    { wch: 18 }, // Primer Apellido
    { wch: 18 }, // Segundo Apellido
    { wch: 16 }, // Primer Nombre
    { wch: 16 }, // Segundo Nombre
    { wch: 14 }, // CUI
    { wch: 14 }, // Fecha
    { wch: 10 }, // Género
    { wch: 12 }, // Teléfono
    { wch: 24 }, // Correo
    { wch: 28 }, // Sede
    { wch: 20 }, // Etapa
    { wch: 12 }, // Versión
    { wch: 12 }, // Estado
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

  // Hoja de info del grupo
  const infoData = [
    ['Código Grupo',    grupo.codigo],
    ['Código MINEDUC',  grupo.codigo_mineduc ?? 'No asignado'],
    ['Ciclo Escolar',   grupo.ciclo_escolar],
    ['Etapa',           (grupo.etapa as any)?.nombre ?? ''],
    ['Sede',            (grupo.sede as any)?.nombre  ?? ''],
    ['Técnico',         `${(grupo.tecnico as any)?.primer_nombre} ${(grupo.tecnico as any)?.primer_apellido}` ?? ''],
    ['Código Técnico',  (grupo.tecnico as any)?.codigo_tecnico ?? ''],
    ['Total estudiantes', filas.length],
    ['Generado el',     new Date().toLocaleString('es-GT')],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 20 }, { wch: 35 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Grupo')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="SIREEX-${grupo.codigo}.xlsx"`,
    },
  })
}
