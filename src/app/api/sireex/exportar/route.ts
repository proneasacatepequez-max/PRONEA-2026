// src/app/api/sireex/exportar/route.ts
// MEJORADO: incluye notas finales por área y estado de promoción
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
      etapa:etapas(id, nombre),
      sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('id', grupoId)
    .single()

  if (!grupo) return err('Grupo no encontrado', 404)

  // Verificar permisos
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).single()
    const { data: g }   = await supabaseAdmin.from('grupos_sireex').select('tecnico_id').eq('id', grupoId).single()
    if (tec?.id !== g?.tecnico_id) return err('Sin permiso para exportar este grupo', 403)
  }

  // Áreas activas del programa
  const { data: areas } = await supabaseAdmin
    .from('areas').select('id, nombre, codigo').eq('activo', true).order('nombre')

  // Estudiantes del grupo con datos completos
  const { data: miembros } = await supabaseAdmin
    .from('inscripcion_grupo_sireex')
    .select(`
      inscripcion:inscripciones(
        id, version_libro, estado, ciclo_escolar,
        sede:sedes(nombre),
        etapa:etapas(id, nombre),
        estudiante:estudiantes(
          id, codigo_estudiante, codigo_sireex,
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
          apellido_casada, cui, fecha_nacimiento, genero, telefono, correo
        )
      )
    `)
    .eq('grupo_sireex_id', grupoId)
    .order('asignado_en')

  // Para cada estudiante obtener resumen por área
  const filasConNotas = await Promise.all((miembros ?? []).map(async (m: any, idx: number) => {
    const insc = m.inscripcion as any
    const e    = insc?.estudiante as any

    const fila: Record<string, any> = {
      'No.':               idx + 1,
      'Código MINEDUC':    e?.codigo_estudiante ?? '',
      'Código SIREEX':     e?.codigo_sireex     ?? '',
      'Primer Apellido':   e?.primer_apellido   ?? '',
      'Segundo Apellido':  e?.segundo_apellido  ?? '',
      'Apellido Casada':   e?.apellido_casada   ?? '',
      'Primer Nombre':     e?.primer_nombre     ?? '',
      'Segundo Nombre':    e?.segundo_nombre    ?? '',
      'CUI':               e?.cui               ?? '',
      'Fecha Nacimiento':  e?.fecha_nacimiento  ?? '',
      'Género':            e?.genero            ?? '',
      'Teléfono':          e?.telefono          ?? '',
      'Etapa':             (insc?.etapa as any)?.nombre ?? '',
      'Versión Libro':     insc?.version_libro  ?? '',
      'Sede Inscripción':  (insc?.sede as any)?.nombre ?? '',
    }

    // Si hay inscripción, agregar notas por área
    if (insc?.id) {
      const { data: resumenEtapa } = await supabaseAdmin
        .from('resumen_etapa')
        .select('nota_final_etapa, promovido')
        .eq('inscripcion_id', insc.id)
        .single()

      // CORREGIDO: obtener los 2 libros reales del estudiante (su etapa+versión)
      const { data: librosEst } = await supabaseAdmin
        .from('libros')
        .select('id, numero')
        .eq('etapa_id', (insc.etapa as any)?.id)
        .eq('version', insc.version_libro ?? 'nuevo')
        .eq('activo', true)

      const libroIds = (librosEst ?? []).map((l: any) => l.id)
      const inscId   = insc.id

      for (const area of (areas ?? [])) {
        let totalArea = 0
        let tieneAlgunDato = false

        for (const libroId of libroIds) {
          const { data: tareas } = await supabaseAdmin
            .from('tareas_catalogo').select('id, puntos_max')
            .eq('area_id', area.id).eq('libro_id', libroId).eq('activo', true)

          const tareaIds = (tareas ?? []).map((t: any) => t.id)
          let ptsTareas = 0
          const ptsMax  = (tareas ?? []).reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)

          if (tareaIds.length > 0) {
            const { data: notasTareas } = await supabaseAdmin
              .from('notas_tareas').select('nota, tarea_id')
              .eq('inscripcion_id', inscId).in('tarea_id', tareaIds)
            const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))
            ptsTareas = tareaIds.reduce((a: number, id: string) => a + (Number(notaMap.get(id)) || 0), 0)
            if ((notasTareas ?? []).length > 0) tieneAlgunDato = true
          }

          const ptsTareasEscala = ptsMax > 0 ? Math.round((ptsTareas / ptsMax) * 30 * 10) / 10 : 0

          const { data: exArea } = await supabaseAdmin
            .from('examenes_catalogo').select('id')
            .eq('area_id', area.id).eq('libro_id', libroId).eq('activo', true)
            .maybeSingle()

          let ptsExamen = 0
          if (exArea) {
            const { data: notaEx } = await supabaseAdmin
              .from('notas_examenes').select('nota_original')
              .eq('inscripcion_id', inscId).eq('examen_id', exArea.id).maybeSingle()
            if (notaEx?.nota_original !== null && notaEx?.nota_original !== undefined) {
              ptsExamen = Math.round((notaEx.nota_original / 100) * 20 * 10) / 10
              tieneAlgunDato = true
            }
          }

          totalArea += ptsTareasEscala + ptsExamen
        }

        totalArea = Math.round(totalArea * 10) / 10

        const areaCodigo = area.codigo ?? area.nombre.substring(0, 4).toUpperCase()
        fila[`${areaCodigo} Total/100`] = tieneAlgunDato ? totalArea : ''
      }

      fila['NOTA FINAL']  = resumenEtapa?.nota_final_etapa ?? ''
      fila['PROMOVIDO']   = resumenEtapa?.promovido === true  ? 'SÍ'
                          : resumenEtapa?.promovido === false ? 'NO'
                          : 'PENDIENTE'
    } else {
      // Sin inscripción — celdas vacías para las notas
      for (const area of (areas ?? [])) {
        const c = area.codigo ?? area.nombre.substring(0, 4).toUpperCase()
        fila[`${c} Total/100`] = ''
      }
      fila['NOTA FINAL'] = ''
      fila['PROMOVIDO']  = ''
    }

    return fila
  }))

  // Crear workbook
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.json_to_sheet(filasConNotas)

  // Anchos de columna
  const baseWidths = [
    {wch:5},{wch:16},{wch:14},{wch:18},{wch:18},{wch:14},
    {wch:16},{wch:14},{wch:14},{wch:13},{wch:10},{wch:12},
    {wch:20},{wch:12},{wch:26},
  ]
  // Columnas de notas: 3 por área + 2 finales
  const notaWidths = (areas ?? []).flatMap(() => [{wch:12},{wch:12},{wch:12}])
  ws['!cols'] = [...baseWidths, ...notaWidths, {wch:12}, {wch:12}]

  XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes y Notas')

  // Hoja info
  const infoData = [
    ['PRONEA — Grupo SIREEX'],
    ['Código Grupo',     grupo.codigo],
    ['Código MINEDUC',   grupo.codigo_mineduc ?? 'No asignado'],
    ['Ciclo Escolar',    grupo.ciclo_escolar],
    ['Etapa',            (grupo.etapa as any)?.nombre ?? ''],
    ['Sede',             (grupo.sede  as any)?.nombre ?? ''],
    ['Técnico',          `${(grupo.tecnico as any)?.primer_nombre ?? ''} ${(grupo.tecnico as any)?.primer_apellido ?? ''}`.trim()],
    ['Código Técnico',   (grupo.tecnico as any)?.codigo_tecnico ?? ''],
    ['Total estudiantes', filasConNotas.length],
    ['Áreas evaluadas',  (areas ?? []).map((a: any) => a.nombre).join(', ')],
    ['Generado el',      new Date().toLocaleString('es-GT')],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{wch:20},{wch:40}]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info Grupo')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="SIREEX-${grupo.codigo}-notas.xlsx"`,
    },
  })
}
