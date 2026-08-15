// src/app/api/boleta/pdf/route.ts
// Genera la Boleta de Calificaciones (formato DIGEEX/PRONEA):
// por cada área → Módulo 1 (tareas Libro 1, /30) + Evaluación 1 (examen Libro 1, /20)
//               + Módulo 2 (tareas Libro 2, /30) + Evaluación 2 (examen Libro 2, /20) = Total /100
// Misma escala y fórmulas que /api/notas/calcular, pero de solo lectura
// (no recalcula/guarda resumen_libro — solo lee tareas/exámenes/notas y arma el PDF).
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'

// Mismas fórmulas que notas/calcular: tareas → 30 pts, examen → 20 pts = 50 pts por área por libro
const ptsATareas = (obt: number, max: number) =>
  max > 0 ? Math.round((obt / max) * 30 * 100) / 100 : null

const ptsAExamen = (nota: number | null) =>
  nota !== null ? Math.round((nota / 100) * 20 * 100) / 100 : null

// Orden curricular estándar (no alfabético) — cualquier área no listada cae al final, alfabética
const ORDEN_AREAS = [
  'Matemática',
  'Comunicación y Lenguaje',
  'Ciencias Naturales',
  'Ciencias Sociales',
  'Productividad y Desarrollo',
  'Productividad/Gestión de Proyectos/Emprendimiento',
]

function ordenArea(nombre: string) {
  const idx = ORDEN_AREAS.indexOf(nombre)
  return idx === -1 ? 999 : idx
}

// Trae, para un libro dado, el desglose por área: { area_id, pts_tareas, pts_examen }
async function desgloseLibro(inscripcionId: string, libroId: string, omitidas: string[]) {
  const { data: tareasCatalogo } = await supabaseAdmin.from('tareas_catalogo')
    .select('id, puntos_max, area_id')
    .eq('libro_id', libroId).eq('activo', true)

  const tareasActivas = (tareasCatalogo ?? []).filter((t: any) => !omitidas.includes(t.id))

  const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
    .select('tarea_id, nota')
    .eq('inscripcion_id', inscripcionId)
    .in('tarea_id', tareasActivas.map((t: any) => t.id))
  const notaTareaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

  const { data: examenesCatalogo } = await supabaseAdmin.from('examenes_catalogo')
    .select('id, area_id')
    .eq('libro_id', libroId).eq('activo', true)

  const { data: notasExamenes } = await supabaseAdmin.from('notas_examenes')
    .select('examen_id, nota_original')
    .eq('inscripcion_id', inscripcionId)
    .in('examen_id', (examenesCatalogo ?? []).map((e: any) => e.id))
  const notaExMap = new Map((notasExamenes ?? []).map((n: any) => [n.examen_id, n.nota_original]))

  const areaIds = [...new Set([
    ...tareasActivas.map((t: any) => t.area_id),
    ...(examenesCatalogo ?? []).map((e: any) => e.area_id),
  ].filter(Boolean))]

  const porArea = new Map<number, { pts_tareas: number | null; pts_examen: number | null }>()

  for (const areaId of areaIds) {
    const tareasArea   = tareasActivas.filter((t: any) => t.area_id === areaId)
    const examenesArea = (examenesCatalogo ?? []).filter((e: any) => e.area_id === areaId)

    const hayTareasIngresadas = tareasArea.some((t: any) => notaTareaMap.has(t.id))
    const puntosObt = tareasArea.reduce((acc: number, t: any) => acc + (notaTareaMap.get(t.id) ?? 0), 0)
    const puntosMax = tareasArea.reduce((acc: number, t: any) => acc + (t.puntos_max ?? 5), 0)
    const ptsTareas = hayTareasIngresadas ? ptsATareas(puntosObt, puntosMax) : null

    const examen = examenesArea[0] ?? null
    const notaEx = examen ? (notaExMap.get(examen.id) ?? null) : null
    const ptsExamen = notaEx !== null && notaEx !== undefined ? ptsAExamen(notaEx) : null

    porArea.set(areaId, { pts_tareas: ptsTareas, pts_examen: ptsExamen })
  }

  return porArea
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const inscId = req.nextUrl.searchParams.get('inscripcion_id')
  if (!inscId) return err('inscripcion_id requerido')

  const { data: insc } = await supabaseAdmin.from('inscripciones').select(`
    id, etapa_id, version_libro, fecha_inscripcion, tiene_ajuste_discapacidad,
    estudiante:estudiantes(
      codigo_estudiante, codigo_sireex, primer_nombre, segundo_nombre,
      primer_apellido, segundo_apellido, cui, cui_pendiente
    ),
    etapa:etapas(id, nombre, codigo),
    sede:sedes(nombre),
    tecnico:tecnicos!inscripciones_tecnico_id_fkey(primer_nombre, primer_apellido)
  `).eq('id', inscId).single()

  if (!insc) return err('Inscripción no encontrada', 404)

  const est = insc.estudiante as any
  const tec = insc.tecnico   as any
  const eta = insc.etapa     as any

  // Tareas omitidas por ajuste de discapacidad (aplica a ambos libros)
  let omitidas: string[] = []
  if (insc.tiene_ajuste_discapacidad) {
    const { data: adj } = await supabaseAdmin.from('ajustes_discapacidad')
      .select('tareas_omitidas_ajuste(tarea_id)')
      .eq('inscripcion_id', inscId).eq('activo', true)
    adj?.forEach((a: any) => a.tareas_omitidas_ajuste?.forEach((t: any) => omitidas.push(t.tarea_id)))
  }

  // Resolver Libro 1 y Libro 2 de esta etapa+versión (mismo criterio que notas/calcular:
  // si hay duplicados, se usa el que tenga más tareas en el catálogo)
  const libros: Record<1 | 2, any> = { 1: null, 2: null }
  for (const num of [1, 2] as const) {
    const { data: candidatos } = await supabaseAdmin.from('libros')
      .select('id, nombre, numero')
      .eq('etapa_id', insc.etapa_id)
      .eq('numero', num)
      .eq('version', insc.version_libro)
      .eq('activo', true)

    if (!candidatos || candidatos.length === 0) continue
    let libro = candidatos[0]
    if (candidatos.length > 1) {
      const conteos = await Promise.all(candidatos.map(async (l: any) => {
        const { count } = await supabaseAdmin.from('tareas_catalogo')
          .select('*', { count: 'exact', head: true }).eq('libro_id', l.id).eq('activo', true)
        return { libro: l, total: count ?? 0 }
      }))
      conteos.sort((a, b) => b.total - a.total)
      libro = conteos[0].libro
    }
    libros[num] = libro
  }

  const desglose1 = libros[1] ? await desgloseLibro(inscId, libros[1].id, omitidas) : new Map()
  const desglose2 = libros[2] ? await desgloseLibro(inscId, libros[2].id, omitidas) : new Map()

  // Catálogo de áreas para mostrar nombre (unión de las que aparecen en libro 1 o libro 2)
  const areaIdsUnion = [...new Set([...desglose1.keys(), ...desglose2.keys()])]
  const { data: areasData } = areaIdsUnion.length > 0
    ? await supabaseAdmin.from('areas').select('id, nombre').in('id', areaIdsUnion)
    : { data: [] as any[] }
  const nombreArea = new Map((areasData ?? []).map((a: any) => [a.id, a.nombre]))

  const filas = areaIdsUnion
    .map((areaId) => {
      const d1 = desglose1.get(areaId) ?? { pts_tareas: null, pts_examen: null }
      const d2 = desglose2.get(areaId) ?? { pts_tareas: null, pts_examen: null }

      const valores = [d1.pts_tareas, d1.pts_examen, d2.pts_tareas, d2.pts_examen]
      const hayFaltantes = valores.some((v) => v === null)
      const total = valores.reduce((acc: number, v) => acc + (v ?? 0), 0)

      const estado = hayFaltantes ? 'EN PROCESO' : (total >= 60 ? 'PROMOVIDO' : 'NO PROMOVIDO')

      return {
        nombre: nombreArea.get(areaId) ?? `Área ${areaId}`,
        modulo1: d1.pts_tareas,
        eval1:   d1.pts_examen,
        modulo2: d2.pts_tareas,
        eval2:   d2.pts_examen,
        total:   Math.round(total * 100) / 100,
        estado,
      }
    })
    .sort((a, b) => ordenArea(a.nombre) - ordenArea(b.nombre) || a.nombre.localeCompare(b.nombre))

  const { data: estab } = await supabaseAdmin
    .from('info_establecimiento').select('nombre_completo').eq('id', 1).single()
  const programaNombre = estab?.nombre_completo ?? 'Programa Nacional de Educación Alternativa de Sacatepéquez'

  const fecha = insc.fecha_inscripcion
    ? new Date(insc.fecha_inscripcion).toLocaleDateString('es-GT')
    : '—'

  const nombreCompleto = [est?.primer_nombre, est?.segundo_nombre, est?.primer_apellido, est?.segundo_apellido]
    .filter(Boolean).join(' ')
  const nombreTecnico = `${tec?.primer_nombre ?? ''} ${tec?.primer_apellido ?? ''}`.trim()
  const dpiCui = est?.cui_pendiente ? 'Pendiente' : (est?.cui ?? '—')

  const fmt = (v: number | null) => (v === null ? '—' : v)

  const filasHtml = filas.map((f) => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;font-weight:bold;">${f.nombre}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;">${fmt(f.modulo1)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;">${fmt(f.eval1)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;">${fmt(f.modulo2)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;">${fmt(f.eval2)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;font-weight:bold;">${fmt(f.total)}</td>
      <td style="border:1px solid #ccc;padding:6px 8px;font-size:9pt;text-align:center;font-weight:bold;color:${
        f.estado === 'PROMOVIDO' ? '#165016' : f.estado === 'NO PROMOVIDO' ? '#cc0000' : '#8a6d00'
      };">${f.estado}</td>
    </tr>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Boleta de Calificaciones — ${nombreCompleto}</title>
  <style>
    @media print {
      @page { size: letter; margin: 12mm; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; font-size: 10pt; margin: 12mm; color:#111; }
    table { border-collapse: collapse; width: 100%; }
    .cab { text-align:center; }
    .cab h1 { font-size: 11pt; margin: 2px 0; }
    .cab p { font-size: 10pt; margin: 1px 0; }
    .datos-tabla td { border:1px solid #ccc; padding:6px 8px; font-size:9.5pt; }
    .datos-tabla .etq { background:#1a3a5c; color:#fff; font-weight:bold; }
    th.head { background:#1a3a5c; color:#fff; font-size:9pt; padding:6px 8px; border:1px solid #1a3a5c; }
  </style>
</head>
<body>
  <div class="no-print" style="padding:8px;background:#f0f0f0;margin-bottom:12px;border-radius:6px;display:flex;gap:8px;align-items:center;">
    <strong>🧾 Boleta de Calificaciones — ${nombreCompleto}</strong>
    <button onclick="window.print()" style="background:#1a3a5c;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Imprimir / Guardar PDF</button>
    <button onclick="window.close()" style="background:#aaa;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">✕ Cerrar</button>
  </div>

  <div class="cab">
    <h1>Ministerio de Educación</h1>
    <p>Dirección General de Educación Extraescolar DIGEEX</p>
    <p>${programaNombre}</p>
    <p><strong>${eta?.nombre ?? ''}</strong></p>
  </div>

  <table class="datos-tabla" style="margin-top:14px;">
    <tr>
      <td class="etq" style="width:16%;">Nombre del estudiante</td>
      <td style="width:22%;">${nombreCompleto}</td>
      <td class="etq" style="width:15%;">Código de Estudiante</td>
      <td style="width:14%;">${est?.codigo_estudiante ?? '—'}</td>
      <td class="etq" style="width:11%;">DPI/CUI</td>
      <td>${dpiCui}</td>
    </tr>
    <tr>
      <td class="etq">Municipio de Inscripción</td>
      <td colspan="3">${(insc.sede as any)?.nombre ?? '—'}</td>
      <td class="etq">Fecha</td>
      <td>${fecha}</td>
    </tr>
    <tr>
      <td class="etq">Técnico de PRONEA</td>
      <td colspan="3">${nombreTecnico}</td>
      <td class="etq">Código de SIREEX</td>
      <td>${est?.codigo_sireex ?? '—'}</td>
    </tr>
  </table>

  <table style="margin-top:14px;">
    <tr>
      <th class="head">Área</th>
      <th class="head">Módulo 1</th>
      <th class="head">Evaluación 1</th>
      <th class="head">Módulo 2</th>
      <th class="head">Evaluación 2</th>
      <th class="head">Total</th>
      <th class="head">Estado</th>
    </tr>
    ${filasHtml || '<tr><td colspan="7" style="border:1px solid #ccc;padding:10px;text-align:center;">Sin notas registradas todavía</td></tr>'}
  </table>

  <div style="margin-top:40px;text-align:center;font-size:9.5pt;">
    <div style="border-top:1px solid #000;width:240px;margin:0 auto;padding-top:4px;">
      ${nombreTecnico}<br>
      Técnico de PRONEA
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Boleta-${est?.primer_apellido ?? ''}-${inscId}.html"`,
    },
  })
}
