// src/app/api/constancias/[id]/imprimir/route.ts
// Mismo patrón que boleta/pdf: devuelve HTML imprimible (Camino A — sin
// generar un archivo real ni subirlo a Storage). El navegador del técnico
// hace "Guardar como PDF" desde el diálogo de impresión.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { obtenerLogosConstanciaHTML as obtenerLogosHeaderHTML } from '@/lib/logosConstancias'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await getSession(req)
  if (!s) return new NextResponse('No autorizado', { status: 401 })

  const { data: c, error } = await supabaseAdmin
    .from('constancias_inscripcion')
    .select('numero_constancia, estado, texto_generado, inscripcion_id')
    .eq('id', id).single()

  if (error || !c) return new NextResponse('Constancia no encontrada', { status: 404 })

  // El director es validador GLOBAL — puede ver cualquier constancia.
  // El técnico solo las de sus propias inscripciones.
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', c.inscripcion_id).maybeSingle()
    if (!tec?.id || insc?.tecnico_id !== tec.id) return new NextResponse('Sin permiso', { status: 403 })
  }

  const logosHTML = await obtenerLogosHeaderHTML()

  // Normalizar textos viejos que tengan <b>...</b> literal guardado
  const textoNormalizado = c.texto_generado
    .replace(/<b>/g, '@@')
    .replace(/<\/b>/g, '@@')

  // El texto viene con saltos de línea planos — los convertimos a <br>
  // respetando los párrafos (doble salto = párrafo nuevo).
  //   • 1er párrafo (lugar y fecha)              → alineado a la derecha,
  //     con un espacio grande debajo antes de "A QUIEN CORRESPONDA".
  //   • último párrafo (nombre/cargo/dependencia) → centrado, en negrita,
  //     con un espacio grande ARRIBA (~1 pulgada) para dejar lugar a la
  //     firma física manuscrita.
  //   • el resto                                  → justificado, espaciado normal.
  const parrafos = textoNormalizado.split('\n\n')
  const cuerpoHTML = parrafos
    .map((parrafo: string, i: number) => {
      const esFecha = i === 0
      const esFirma = i === parrafos.length - 1
      let estilo = 'text-align:justify;margin:0 0 18px 0;'
      if (esFecha) estilo = 'text-align:right;margin:0 0 48px 0;'
      if (esFirma) estilo = 'text-align:center;font-weight:bold;margin:1in 0 0 0;'

      // 1) Escapar HTML básico (por seguridad, por si alguien mete < >)
      // 2) Convertir marcadores @@texto@@ a <b>texto</b>
      // 3) Saltos de línea simples a <br/>
      const safe = parrafo
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
      const conNegrilla = safe.replace(/@@([^@]+)@@/g, '<b>$1</b>')
      const conSaltos = conNegrilla.replace(/\n/g, '<br/>')
      return `<p style="${estilo}">${conSaltos}</p>`
    })
    .join('\n')

  const badgeClase = c.estado.replace(/_/g, '-') // pendiente_validacion → pendiente-validacion

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Constancia ${c.numero_constancia}</title>
<style>
  @page { size: letter; margin: 1in; }
  @media print {
    .no-print { display: none !important; }
    body { margin: 0 !important; padding: 0 !important; max-width: none !important; }
  }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 800px; margin: 30px auto; padding: 0 20px; line-height: 1.5; }
  .barra { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .badge { display:inline-block; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:bold; }
  .b-pendiente-validacion { background:#fef3c7; color:#92400e; }
  .b-validado             { background:#dbeafe; color:#1e40af; }
  .b-rechazado            { background:#fee2e2; color:#991b1b; }
  .b-exportado            { background:#dcfce7; color:#166534; }
  .b-anulado              { background:#f3f4f6; color:#6b7280; }
  .b-borrador             { background:#f3f4f6; color:#6b7280; }
  .btn-print { background:#1e3a8a; color:white; border:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer; }
  .folio { font-size:11px; color:#9ca3af; text-align:right; margin-top:6px; }
</style>
</head>
<body>
  <div class="no-print barra">
    <span class="badge b-${badgeClase}">${c.estado.toUpperCase().replace(/_/g, ' ')}</span>
    <button class="btn-print" onclick="marcarYimprimir()">🖨️ Imprimir / Guardar PDF</button>
  </div>

  ${logosHTML}

  ${cuerpoHTML}

  <div class="folio no-print">Constancia No. ${c.numero_constancia}</div>

<script>
  async function marcarYimprimir() {
    ${c.estado === 'validado' ? `
    try {
      await fetch('/api/constancias/${id}', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'marcar_exportado' }),
      })
    } catch (e) {}
    ` : ''}
    window.print()
  }
</script>
</body>
</html>`

  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
