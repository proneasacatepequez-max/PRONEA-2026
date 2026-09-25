// src/app/api/constancias/[id]/imprimir/route.ts
// Mismo patrón que boleta/pdf: devuelve HTML imprimible (Camino A — sin
// generar un archivo real ni subirlo a Storage). El navegador del técnico
// hace "Guardar como PDF" desde el diálogo de impresión.
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession } from '@/lib/auth'
import { obtenerLogosHeaderHTML } from '@/lib/constancias'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await getSession(req)
  if (!s) return new NextResponse('No autorizado', { status: 401 })

  const { data: c, error } = await supabaseAdmin
    .from('constancias_inscripcion')
    .select('numero_constancia, estado, texto_generado, inscripcion_id')
    .eq('id', id).single()

  if (error || !c) return new NextResponse('Constancia no encontrada', { status: 404 })

  // Mismo resguardo de alcance que en GET /api/constancias
  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin.from('directores').select('sede_id').eq('usuario_id', s.sub).maybeSingle()
    const { data: insc } = await supabaseAdmin.from('inscripciones').select('sede_id').eq('id', c.inscripcion_id).maybeSingle()
    if (!dir?.sede_id || insc?.sede_id !== dir.sede_id) return new NextResponse('Sin permiso', { status: 403 })
  } else if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', c.inscripcion_id).maybeSingle()
    if (!tec?.id || insc?.tecnico_id !== tec.id) return new NextResponse('Sin permiso', { status: 403 })
  }

  const logosHTML = await obtenerLogosHeaderHTML()

  // El texto ya viene con saltos de línea planos — los convertimos a <br>
  // respetando los párrafos (doble salto = párrafo nuevo).
  const cuerpoHTML = c.texto_generado
    .split('\n\n')
    .map((parrafo: string) => `<p style="margin:0 0 18px 0;text-align:justify">${parrafo.replace(/\n/g, '<br/>')}</p>`)
    .join('\n')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Constancia ${c.numero_constancia}</title>
<style>
  @media print { .no-print { display: none !important; } @page { margin: 2cm; } }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1a1a1a; max-width: 800px; margin: 30px auto; padding: 0 20px; line-height: 1.5; }
  .barra { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
  .badge { display:inline-block; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:bold; }
  .b-pendiente { background:#fef3c7; color:#92400e; }
  .b-validado  { background:#dbeafe; color:#1e40af; }
  .b-rechazado { background:#fee2e2; color:#991b1b; }
  .b-exportado { background:#dcfce7; color:#166534; }
  .b-anulado   { background:#f3f4f6; color:#6b7280; }
  .btn-print { background:#1e3a8a; color:white; border:none; padding:10px 20px; border-radius:8px; font-size:14px; font-weight:bold; cursor:pointer; }
  .folio { font-size:11px; color:#9ca3af; text-align:right; margin-top:6px; }
</style>
</head>
<body>
  <div class="no-print barra">
    <span class="badge b-${c.estado}">${c.estado.toUpperCase().replace('_', ' ')}</span>
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
