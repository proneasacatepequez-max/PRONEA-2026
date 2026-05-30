// src/app/api/escalas/pdf/route.ts — NUEVA RUTA
// Genera PDF de escala numérica con todos los datos por área
// Usa generación HTML→texto estructurado con formato de tabla
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'

const ptsATareas = (obt: number, max: number) =>
  max > 0 ? Math.round((obt / max) * 30 * 100) / 100 : 0
const ptsAExamen = (nota: number) =>
  Math.round((nota / 100) * 20 * 100) / 100

// Genera un HTML bien estructurado para imprimir como PDF desde el navegador
// El frontend abre este HTML en una nueva ventana y llama window.print()
export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p      = req.nextUrl.searchParams
  const inscId = p.get('inscripcion_id')
  const libroId = p.get('libro_id')

  if (!inscId) return err('inscripcion_id requerido')

  // Datos de la inscripción
  const { data: insc } = await supabaseAdmin.from('inscripciones')
    .select(`
      id, ciclo_escolar, version_libro,
      estudiante:estudiantes(
        primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        cui, codigo_estudiante, fecha_nacimiento, genero
      ),
      etapa:etapas(id, nombre, nivel),
      sede:sedes(nombre),
      tecnico:tecnicos(primer_nombre, primer_apellido, codigo_tecnico)
    `)
    .eq('id', inscId).single()
  if (!insc) return err('Inscripción no encontrada', 404)

  // Libros a incluir
  let librosQuery = supabaseAdmin.from('libros')
    .select('id, nombre, numero, version')
    .eq('etapa_id', (insc.etapa as any)?.id)
    .eq('version', insc.version_libro)
    .eq('activo', true)
    .order('numero')

  if (libroId) librosQuery = librosQuery.eq('id', libroId)
  const { data: libros } = await librosQuery

  // Info establecimiento para el encabezado
  const { data: info } = await supabaseAdmin
    .from('info_establecimiento').select('*').eq('id', 1).single()

  // Escala guardada
  const { data: escala } = await supabaseAdmin.from('escalas_calificacion')
    .select('numero_escala, generada_en, firmada')
    .eq('inscripcion_id', inscId)
    .order('generada_en', { ascending: false })
    .limit(1).single()

  const est = insc.estudiante as any
  const tec = insc.tecnico   as any

  // Construir datos por libro y área
  const datosLibros = await Promise.all((libros ?? []).map(async (libro: any) => {
    const { data: tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id, numero_tarea, nombre, paginas, puntos_max, area:areas(id, nombre, codigo)')
      .eq('libro_id', libro.id).eq('activo', true).order('numero_tarea')

    const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id, nota').eq('inscripcion_id', inscId)
    const notaMap = new Map((notasTareas ?? []).map((n: any) => [n.tarea_id, n.nota]))

    const { data: examenes } = await supabaseAdmin.from('examenes_catalogo')
      .select('id, nombre, area:areas(id, nombre, codigo)')
      .eq('libro_id', libro.id).eq('activo', true)

    const { data: notasEx } = await supabaseAdmin.from('notas_examenes')
      .select('examen_id, nota_original, puntos_obtenidos').eq('inscripcion_id', inscId)
    const exMap = new Map((notasEx ?? []).map((n: any) => [n.examen_id, n]))

    // Agrupar por área
    const areaIds = [...new Set([
      ...(tareas ?? []).map((t: any) => (t.area as any)?.id),
      ...(examenes ?? []).map((e: any) => (e.area as any)?.id),
    ].filter(Boolean))]

    const areas = areaIds.map(areaId => {
      const tareasArea   = (tareas ?? []).filter((t: any) => (t.area as any)?.id === areaId)
      const examenesArea = (examenes ?? []).filter((e: any) => (e.area as any)?.id === areaId)
      const areaNombre   = (tareasArea[0] ?? examenesArea[0])?.area?.nombre ?? '—'

      const puntosObt = tareasArea.reduce((a: number, t: any) => a + (notaMap.get(t.id) ?? 0), 0)
      const puntosMax = tareasArea.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
      const ptsTareas = ptsATareas(puntosObt, puntosMax)

      const examen    = examenesArea[0] ?? null
      const notaEx    = examen ? (exMap.get(examen.id)?.nota_original ?? null) : null
      const ptsExamen = notaEx !== null ? ptsAExamen(notaEx) : null
      const totalArea = ptsExamen !== null ? Math.round((ptsTareas + ptsExamen) * 100) / 100 : null

      return {
        nombre: areaNombre,
        tareas: tareasArea.map((t: any) => ({
          numero:     t.numero_tarea,
          paginas:    t.paginas,
          nombre:     t.nombre,
          puntos_max: t.puntos_max ?? 5,
          nota:       notaMap.get(t.id) ?? null,
        })),
        pts_tareas:  ptsTareas,
        pts_examen:  ptsExamen,
        nota_examen: notaEx,
        total_area:  totalArea,
        promovido:   totalArea !== null ? totalArea >= 30 : null,
      }
    })

    const totalLibro = areas.reduce((a, ar) => a + (ar.total_area ?? 0), 0)
    return { ...libro, areas, total_libro: Math.round(totalLibro * 100) / 100 }
  }))

  const totalEtapa    = datosLibros.reduce((a, l) => a + l.total_libro, 0)
  const promoEtapa    = datosLibros.every(l => l.areas.every((a: any) => a.promovido === true))
  const nombreEst     = `${est?.primer_nombre ?? ''} ${est?.segundo_nombre ?? ''} ${est?.primer_apellido ?? ''} ${est?.segundo_apellido ?? ''}`.replace(/\s+/g, ' ').trim()
  const fechaHoy      = new Date().toLocaleDateString('es-GT', { day:'2-digit', month:'long', year:'numeric' })

  // Generar HTML para impresión
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Escala Numérica — ${nombreEst}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #000; background: white; }
  .page { padding: 15mm 15mm 20mm; min-height: 100vh; }
  .header { text-align: center; border-bottom: 2px solid #1e40af; padding-bottom: 8px; margin-bottom: 10px; }
  .header h1 { font-size: 14px; color: #1e40af; font-weight: bold; }
  .header h2 { font-size: 11px; color: #374151; margin-top: 2px; }
  .header p  { font-size: 9px; color: #6b7280; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; background: #f8fafc; padding: 8px; border-radius: 4px; border: 1px solid #e2e8f0; }
  .info-item label { font-size: 8px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; display: block; }
  .info-item span  { font-size: 10px; font-weight: bold; color: #1f2937; }
  .libro-section { margin-bottom: 12px; page-break-inside: avoid; }
  .libro-title { background: #1e40af; color: white; padding: 4px 8px; font-size: 11px; font-weight: bold; border-radius: 3px 3px 0 0; }
  .area-title { background: #dbeafe; color: #1e40af; padding: 3px 8px; font-size: 9.5px; font-weight: bold; border-left: 3px solid #1e40af; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; margin-top: 3px; }
  th { background: #f1f5f9; font-size: 8.5px; padding: 3px 5px; text-align: left; border: 1px solid #cbd5e1; }
  td { font-size: 9px; padding: 3px 5px; border: 1px solid #e2e8f0; }
  td.nota { text-align: center; font-weight: bold; }
  td.nota.ok   { color: #16a34a; }
  td.nota.bad  { color: #dc2626; }
  td.nota.none { color: #9ca3af; }
  .subtotal { background: #f8fafc; }
  .subtotal td { font-weight: bold; font-size: 9.5px; }
  .total-libro { background: #eff6ff; border-top: 2px solid #1e40af; margin-top: 4px; }
  .total-libro td { font-weight: bold; font-size: 10px; padding: 4px 8px; }
  .resumen { margin-top: 12px; border: 2px solid #1e40af; border-radius: 4px; overflow: hidden; }
  .resumen-title { background: #1e40af; color: white; padding: 5px 10px; font-size: 11px; font-weight: bold; }
  .resumen-table th { background: #1e40af; color: white; }
  .promovido   { color: #16a34a; font-weight: bold; }
  .no-promovido { color: #dc2626; font-weight: bold; }
  .pendiente   { color: #d97706; }
  .firmas { margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .firma-box { border-top: 1px solid #374151; padding-top: 4px; text-align: center; font-size: 8.5px; }
  .numero-escala { font-size: 8px; color: #6b7280; text-align: right; margin-bottom: 5px; }
  @media print {
    body { font-size: 9px; }
    .page { padding: 10mm; }
    .no-print { display: none; }
    .libro-section { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Botón imprimir solo visible en pantalla -->
  <div class="no-print" style="text-align:right; margin-bottom:10px;">
    <button onclick="window.print()" style="background:#1e40af;color:white;border:none;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;">
      🖨️ Imprimir / Guardar PDF
    </button>
    <button onclick="window.close()" style="background:#6b7280;color:white;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:bold;margin-left:8px;">
      ✕ Cerrar
    </button>
  </div>

  ${escala ? `<div class="numero-escala">Escala N°: ${escala.numero_escala} · Generada: ${new Date(escala.generada_en).toLocaleDateString('es-GT')}</div>` : ''}

  <!-- ENCABEZADO -->
  <div class="header">
    <h1>${info?.nombre_completo ?? 'PRONEA Sacatepéquez'}</h1>
    <h2>ESCALA DE CALIFICACIONES — Ciclo Escolar ${insc.ciclo_escolar}</h2>
    <p>Dirección General de Educación Extraescolar — DIGEEX — MINEDUC</p>
  </div>

  <!-- INFO ESTUDIANTE -->
  <div class="info-grid">
    <div class="info-item"><label>Nombre completo</label><span>${nombreEst}</span></div>
    <div class="info-item"><label>Código estudiante</label><span>${est?.codigo_estudiante ?? '—'}</span></div>
    <div class="info-item"><label>CUI</label><span>${est?.cui ?? 'Pendiente'}</span></div>
    <div class="info-item"><label>Etapa</label><span>${(insc.etapa as any)?.nombre ?? '—'}</span></div>
    <div class="info-item"><label>Sede</label><span>${(insc.sede as any)?.nombre ?? '—'}</span></div>
    <div class="info-item"><label>Versión libro</label><span>${insc.version_libro === 'nuevo' ? 'Libro Nuevo' : 'Libro Viejo'}</span></div>
    <div class="info-item"><label>Técnico</label><span>${tec?.primer_nombre ?? ''} ${tec?.primer_apellido ?? ''}</span></div>
    <div class="info-item"><label>Fecha de emisión</label><span>${fechaHoy}</span></div>
  </div>

  <!-- LIBROS Y ÁREAS -->
  ${datosLibros.map(libro => `
  <div class="libro-section">
    <div class="libro-title">${libro.version === 'nuevo' ? '📗' : '📙'} ${libro.nombre}</div>

    ${libro.areas.map((area: any) => `
    <div class="area-title">📌 ${area.nombre}</div>
    <table>
      <thead>
        <tr>
          <th style="width:30px">#</th>
          <th style="width:50px">Páginas</th>
          <th>Descripción de la tarea</th>
          <th style="width:40px;text-align:center">Máx.</th>
          <th style="width:45px;text-align:center">Nota</th>
        </tr>
      </thead>
      <tbody>
        ${area.tareas.map((t: any) => `
        <tr>
          <td>${t.numero}</td>
          <td>${t.paginas ?? '—'}</td>
          <td>${t.nombre}</td>
          <td style="text-align:center">${t.puntos_max}</td>
          <td class="nota ${t.nota === null ? 'none' : t.nota >= t.puntos_max * 0.6 ? 'ok' : 'bad'}">
            ${t.nota !== null ? t.nota : '—'}
          </td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr class="subtotal">
          <td colspan="3" style="text-align:right">Puntos de tareas (sobre 30):</td>
          <td></td>
          <td class="nota ${area.pts_tareas >= 18 ? 'ok' : 'bad'}">${area.pts_tareas}</td>
        </tr>
        <tr class="subtotal">
          <td colspan="3" style="text-align:right">Examen — nota original: ${area.nota_examen !== null ? area.nota_examen + '%' : 'Pendiente'} → sobre 20 pts:</td>
          <td></td>
          <td class="nota ${area.pts_examen !== null ? (area.pts_examen >= 12 ? 'ok' : 'bad') : 'none'}">${area.pts_examen !== null ? area.pts_examen : '—'}</td>
        </tr>
        <tr style="background:#dbeafe;border-top:2px solid #1e40af;">
          <td colspan="3" style="text-align:right;font-weight:bold">TOTAL ÁREA ${area.nombre.toUpperCase()}:</td>
          <td style="text-align:center;font-size:8px;font-weight:bold">/ 50</td>
          <td class="nota ${area.total_area === null ? 'none' : area.total_area >= 30 ? 'ok' : 'bad'}" style="font-size:12px">
            ${area.total_area !== null ? area.total_area : '—'}
            ${area.promovido === true ? ' ✓' : area.promovido === false ? ' ✗' : ''}
          </td>
        </tr>
      </tfoot>
    </table>`).join('')}

    <table class="total-libro" style="margin-top:6px">
      <tr>
        <td style="text-align:right">TOTAL ${libro.nombre.toUpperCase()}:</td>
        <td style="text-align:center;width:40px;font-size:8px">/ ${libro.areas.length * 50}</td>
        <td style="text-align:center;width:45px;font-size:13px;color:${libro.total_libro >= libro.areas.length * 30 ? '#16a34a' : '#dc2626'}">${libro.total_libro}</td>
      </tr>
    </table>
  </div>`).join('')}

  <!-- RESUMEN FINAL -->
  <div class="resumen">
    <div class="resumen-title">📋 RESUMEN FINAL DE LA ETAPA</div>
    <table class="resumen-table">
      <thead>
        <tr>
          <th>Área</th>
          ${datosLibros.map(l => `<th style="text-align:center">Tareas L${l.numero}<br><small>/ 30</small></th><th style="text-align:center">Exam. L${l.numero}<br><small>/ 20</small></th><th style="text-align:center">Total L${l.numero}<br><small>/ 50</small></th>`).join('')}
          <th style="text-align:center">GRAN TOTAL<br><small>/ 100 c/libro</small></th>
          <th style="text-align:center">Estado</th>
        </tr>
      </thead>
      <tbody>
        ${(() => {
          const allAreas = [...new Set(datosLibros.flatMap(l => l.areas.map((a: any) => a.nombre)))]
          return allAreas.map(areaNombre => {
            const filaLibros = datosLibros.map(l => {
              const ar = l.areas.find((a: any) => a.nombre === areaNombre)
              return ar ?? { pts_tareas: null, pts_examen: null, total_area: null }
            })
            const grandTotal = filaLibros.every(fl => fl.total_area !== null)
              ? Math.round(filaLibros.reduce((a, fl) => a + (fl.total_area ?? 0), 0) * 100) / 100
              : null
            const promo = grandTotal !== null ? grandTotal >= 60 : null
            return `<tr>
              <td style="font-weight:bold">${areaNombre}</td>
              ${filaLibros.map(fl => `
                <td style="text-align:center;color:${fl.pts_tareas !== null ? (fl.pts_tareas >= 18 ? '#16a34a' : '#dc2626') : '#9ca3af'}">${fl.pts_tareas ?? '—'}</td>
                <td style="text-align:center;color:${fl.pts_examen !== null ? (fl.pts_examen >= 12 ? '#16a34a' : '#dc2626') : '#9ca3af'}">${fl.pts_examen ?? '—'}</td>
                <td style="text-align:center;font-weight:bold;color:${fl.total_area !== null ? (fl.total_area >= 30 ? '#16a34a' : '#dc2626') : '#9ca3af'}">${fl.total_area ?? '—'}</td>
              `).join('')}
              <td style="text-align:center;font-size:13px;font-weight:bold;color:${grandTotal !== null ? (grandTotal >= 60 ? '#16a34a' : '#dc2626') : '#9ca3af'}">${grandTotal ?? '—'}</td>
              <td style="text-align:center" class="${promo === true ? 'promovido' : promo === false ? 'no-promovido' : 'pendiente'}">
                ${promo === true ? '✅ Promovido' : promo === false ? '❌ No promovido' : '⏳ Pendiente'}
              </td>
            </tr>`
          }).join('')
        })()}
      </tbody>
      <tfoot>
        <tr style="background:#1e40af;color:white;font-weight:bold">
          <td>TOTALES</td>
          ${datosLibros.map(l => {
            const ptsTareasTotal = l.areas.reduce((a: number, ar: any) => a + ar.pts_tareas, 0).toFixed(1)
            const ptsExTotal = l.areas.every((ar: any) => ar.pts_examen !== null)
              ? l.areas.reduce((a: number, ar: any) => a + (ar.pts_examen ?? 0), 0).toFixed(1) : '—'
            return `<td style="text-align:center">${ptsTareasTotal}</td><td style="text-align:center">${ptsExTotal}</td><td style="text-align:center">${l.total_libro}</td>`
          }).join('')}
          <td style="text-align:center;font-size:14px">${Math.round(totalEtapa * 100) / 100}</td>
          <td style="text-align:center">${promoEtapa ? '✅ PROMOVIDO/A' : '❌ NO PROMOVIDO/A'}</td>
        </tr>
      </tfoot>
    </table>
  </div>

  <!-- FIRMAS -->
  <div class="firmas" style="margin-top:25px">
    <div class="firma-box">
      <p style="margin-bottom:20px">&nbsp;</p>
      <strong>${tec?.primer_nombre ?? ''} ${tec?.primer_apellido ?? ''}</strong><br>
      Técnico — Código ${tec?.codigo_tecnico ?? '—'}
    </div>
    <div class="firma-box">
      <p style="margin-bottom:20px">&nbsp;</p>
      <strong>${info?.director_nombre ?? 'Director'}</strong><br>
      ${info?.director_titulo ?? 'Director(a) PRONEA'}
    </div>
  </div>

  <div style="text-align:center;margin-top:15px;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:5px">
    Documento generado el ${fechaHoy} · ${info?.nombre_completo ?? 'PRONEA Sacatepéquez'} · Sistema PRONEA v4.0
  </div>

</div>
<script>
  // Auto-imprimir al cargar si viene con ?print=1
  if (new URLSearchParams(window.location.search).get('print') === '1') {
    window.addEventListener('load', () => setTimeout(() => window.print(), 800))
  }
</script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
