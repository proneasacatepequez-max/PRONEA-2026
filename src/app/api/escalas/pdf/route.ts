// src/app/api/escalas/pdf/route.ts
// Genera PDF de escala numérica con formato PRONEA/DIGEEX
// Formato según imagen compartida: encabezado MINEDUC, tabla con criterios 5-4-3-2-1
// Columnas: Proyecto/Lección | Descripción de actividad | Página | Tarea No. | Criterio (5,4,3,2,1) | Total
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, err } from '@/lib/auth'

// Generamos el PDF con HTML+CSS convertido a buffer usando la API de jsPDF via buffer
// Como no tenemos puppeteer, usamos una solución HTML que se puede abrir/imprimir
export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p           = req.nextUrl.searchParams
  const inscId      = p.get('inscripcion_id')
  const libroId     = p.get('libro_id')
  const areaId      = p.get('area_id')  // opcional: filtrar por área específica

  if (!inscId || !libroId) return err('inscripcion_id y libro_id son requeridos')

  // Datos de la inscripción
  const { data: insc } = await supabaseAdmin.from('inscripciones').select(`
    id, version_libro, ciclo_escolar,
    estudiante:estudiantes(
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      cui, fecha_nacimiento,
      municipio:municipios(nombre)
    ),
    etapa:etapas(id, nombre, codigo, nivel),
    sede:sedes(nombre),
    tecnico:tecnicos(primer_nombre, primer_apellido)
  `).eq('id', inscId).single()

  if (!insc) return err('Inscripción no encontrada', 404)

  const { data: libro } = await supabaseAdmin.from('libros')
    .select('id, nombre, numero').eq('id', libroId).single()

  // Áreas y tareas
  let qAreas = supabaseAdmin.from('areas').select('id, nombre, codigo').eq('activo', true).order('nombre')
  const { data: areas } = await qAreas

  const { data: tareasTodas } = await supabaseAdmin.from('tareas_catalogo')
    .select('id, numero_tarea, nombre, paginas, proyecto, leccion, puntos_max, area_id, activo')
    .eq('libro_id', libroId).eq('activo', true).order('numero_tarea')

  // Notas existentes
  const { data: notasTareas } = await supabaseAdmin.from('notas_tareas')
    .select('tarea_id, nota').eq('inscripcion_id', inscId)

  const notaMap: Record<string, number> = {}
  for (const n of (notasTareas ?? [])) notaMap[n.tarea_id] = n.nota

  const est = insc.estudiante as any
  const tec = insc.tecnico   as any
  const eta = insc.etapa     as any
  const esBach = eta?.codigo?.startsWith('BA') ?? false
  const campoProyecto = esBach ? 'Proyecto' : 'Lección'

  const { data: estab } = await supabaseAdmin
    .from('info_establecimiento').select('nombre_completo, director_nombre, director_titulo').eq('id', 1).single()

  const programaNombre = estab?.nombre_completo ?? 'Programa Nacional de Educación Alternativa PRONEA'

  const fecha = new Date().toLocaleDateString('es-GT', { year: 'numeric', month: 'long', day: 'numeric' })
  const hoy   = new Date().toLocaleDateString('es-GT')

  // Filtrar áreas que tienen tareas en este libro
  const areasConTareas = (areas ?? []).filter((a: any) => {
    if (areaId && String(a.id) !== areaId) return false
    return (tareasTodas ?? []).some((t: any) => t.area_id === a.id)
  })

  // Generar HTML del PDF (se retorna como HTML para imprimir/guardar PDF desde el navegador)
  const tablasPorArea = areasConTareas.map((area: any) => {
    const tareasArea = (tareasTodas ?? []).filter((t: any) => t.area_id === area.id)
      .sort((a: any, b: any) => a.numero_tarea - b.numero_tarea)

    const filas = tareasArea.map((t: any) => {
      const nota      = notaMap[t.id] ?? null
      const criterio  = nota !== null ? Math.round(nota) : null

      return `<tr>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;background:#d4e8c2;">${esBach ? (t.proyecto ?? '') : (t.leccion ?? '')}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;">${t.nombre}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${t.paginas ?? ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${t.numero_tarea}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${criterio === 5 ? 'x' : ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${criterio === 4 ? 'x' : ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${criterio === 3 ? 'x' : ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${criterio === 2 ? 'x' : ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;">${criterio === 1 ? 'x' : ''}</td>
        <td style="font-size:7pt;padding:2px 4px;border:1px solid #ccc;text-align:center;font-weight:bold;color:${nota !== null ? (nota >= 3 ? '#165016' : '#cc0000') : '#aaa'};">${nota ?? ''}</td>
      </tr>`
    }).join('')

    const totalPts  = tareasArea.reduce((a: number, t: any) => a + (notaMap[t.id] ?? 0), 0)
    const maxPts    = tareasArea.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
    const zona      = maxPts > 0 ? Math.round((totalPts / maxPts) * 30 * 10) / 10 : 0

    return `
      <div style="page-break-inside:avoid;margin-bottom:10px;">
        <table style="width:100%;border-collapse:collapse;font-family:Arial,sans-serif;">
          <!-- Encabezado MINEDUC (igual al de la imagen) -->
          <tr>
            <td colspan="10" style="text-align:center;font-size:7pt;padding:2px;">
              Ministerio de Educación<br>
              Dirección General de Educación Extraescolar DIGEEX<br>
              ${programaNombre}<br>
              <strong>${eta?.nombre ?? ''} en Ciencias y Letras con especialidad en Productividad y Emprendimiento</strong>
            </td>
          </tr>
          <!-- Fila: Nombre | Fecha -->
          <tr>
            <td colspan="4" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px 6px;">Nombre</td>
            <td colspan="4" style="border:1px solid #ccc;font-size:8pt;padding:3px 6px;">${est?.primer_nombre ?? ''} ${est?.primer_apellido ?? ''} ${est?.segundo_apellido ?? ''}</td>
            <td style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Fecha</td>
            <td style="border:1px solid #ccc;font-size:8pt;padding:3px;">${hoy}</td>
          </tr>
          <!-- Fila: Técnico | Etapa Finalizado -->
          <tr>
            <td colspan="2" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px 6px;">Técnico PRONEA</td>
            <td colspan="4" style="border:1px solid #ccc;font-size:8pt;padding:3px 6px;">${tec?.primer_nombre ?? ''} ${tec?.primer_apellido ?? ''}</td>
            <td colspan="2" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Etapa Finalizado</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${eta?.nombre ?? ''}</td>
          </tr>
          <!-- Fila: Municipio | Código | CUI -->
          <tr>
            <td colspan="2" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Municipio de Inscripción</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${(insc.sede as any)?.nombre ?? ''}</td>
            <td style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Código de estudiante</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">—</td>
            <td style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">DPI CUI</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${est?.cui ?? ''}</td>
          </tr>
          <!-- Fila: Área | Módulo | Etapa en proceso -->
          <tr>
            <td colspan="2" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Área</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${area.nombre}</td>
            <td style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Módulo</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${libro?.numero ?? ''}</td>
            <td style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Etapa en proceso</td>
            <td colspan="2" style="border:1px solid #ccc;font-size:8pt;padding:3px;">${eta?.nombre ?? ''}</td>
          </tr>
          <!-- Fila: Criterios a calificar | Escala -->
          <tr>
            <td colspan="4" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Criterios a calificar</td>
            <td colspan="4" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:8pt;font-weight:bold;padding:3px;">Escala</td>
            <td colspan="2" style="border:2px solid #1a3a5c;background:#1a3a5c;color:#fff;font-size:7pt;text-align:center;padding:2px;">
              <div style="display:flex;justify-content:space-around;font-size:6pt;">
                <span>5%<br>100</span><span>4%<br>84</span><span>3%<br>63</span><span>2%<br>42</span><span>1%<br>21</span>
              </div>
            </td>
          </tr>
          <!-- Encabezados de la tabla de tareas -->
          <tr style="background:#1a3a5c;color:#fff;">
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:14%;">${campoProyecto}</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:34%;">Descripción de la actividad</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:8%;">Página</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:8%;">Tarea No.</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">5</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">4</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">3</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">2</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">1</th>
            <th style="border:1px solid #fff;font-size:8pt;padding:3px;width:6%;text-align:center;">Total</th>
          </tr>
          <!-- Filas de tareas -->
          ${filas}
          <!-- Fila de totales -->
          <tr style="background:#ffff00;">
            <td colspan="8" style="border:1px solid #ccc;padding:3px;"></td>
            <td style="border:1px solid #ccc;padding:3px;font-size:8pt;font-weight:bold;text-align:right;">Zona sobre 30</td>
            <td style="border:1px solid #ccc;padding:3px;font-size:10pt;font-weight:bold;text-align:center;background:#cc0000;color:#fff;">${zona}</td>
          </tr>
        </table>
        <!-- Firma -->
        <div style="margin-top:20px;text-align:center;font-size:8pt;font-family:Arial;">
          <div style="border-top:1px solid #000;width:200px;margin:0 auto;padding-top:4px;">
            ${tec?.primer_nombre ?? ''} ${tec?.primer_apellido ?? ''}<br>
            Técnico de PRONEA
          </div>
        </div>
        <div style="page-break-after:always;"></div>
      </div>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Escala Numérica — ${est?.primer_nombre} ${est?.primer_apellido}</title>
  <style>
    @media print {
      @page { size: letter; margin: 10mm; }
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { font-family: Arial, sans-serif; font-size: 9pt; margin: 10mm; }
    table { border-collapse: collapse; width: 100%; }
  </style>
</head>
<body>
  <div class="no-print" style="padding:8px;background:#f0f0f0;margin-bottom:12px;border-radius:6px;display:flex;gap:8px;align-items:center;">
    <strong>📄 Escala Numérica — ${est?.primer_nombre} ${est?.primer_apellido}</strong>
    <button onclick="window.print()" style="background:#1a3a5c;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">🖨️ Imprimir / Guardar PDF</button>
    <button onclick="window.close()" style="background:#aaa;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;font-size:12px;">✕ Cerrar</button>
  </div>
  ${tablasPorArea}
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="Escala-${est?.primer_apellido}-${libroId}.html"`,
    },
  })
}

