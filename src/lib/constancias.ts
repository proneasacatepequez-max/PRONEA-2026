// src/lib/constancias.ts
import { supabaseAdmin } from './supabase'

// ── Formateo de la etapa a lenguaje formal ──────────────────────────────
// El campo real (etapas.nombre) es corto ("1a. Etapa Básico"), pero el
// texto oficial de la constancia usa una forma más larga y formal
// ("la Primera Etapa del Ciclo de Educación Básica"). Este mapeo es un
// mejor esfuerzo basado en los nombres de etapa vistos hasta ahora —
// revísalo si agregas una etapa con un nombre que no calce aquí.
const ORDINALES: Record<string, string> = {
  '1a': 'Primera', '2a': 'Segunda', '3a': 'Tercera',
  '1ro': 'Primer', '2do': 'Segundo', '3ro': 'Tercer', '4to': 'Cuarto', '5to': 'Quinto',
}

export function formatearEtapaParaTexto(nombreEtapa: string): string {
  if (!nombreEtapa) return ''
  const m = nombreEtapa.match(/^(\d+(?:a|ro|do|to))\.?\s+Etapa\s+(.+)$/i)
  if (!m) return `la ${nombreEtapa}`

  const [, prefijo, resto] = m
  const ordinal = ORDINALES[prefijo.toLowerCase()] ?? prefijo
  const restoLower = resto.trim().toLowerCase()

  let cicloTexto = `del Ciclo de Educación ${resto.trim()}`
  if (restoLower.includes('bach')) cicloTexto = 'del Ciclo de Educación Diversificada'

  return `la ${ordinal} Etapa ${cicloTexto}`
}

// ── Texto completo de la constancia ─────────────────────────────────────
export function generarTextoConstancia(datos: {
  fechaActual: string          // ya formateada, ej. "23 de Septiembre de 2026"
  nombreCompleto: string
  cui: string | null
  codigoEstudiante: string
  nombreEtapaFormateado: string
  codigoGrupoSireex: string | null
  cicloEscolar: number
  fechaInscripcion: string     // formateada dd/mm/aaaa
  modalidad: string
  municipio: string
  nombreFirmante: string
  cargoFirmante: string
  dependenciaFirmante: string | null
}): string {
  const grupo = datos.codigoGrupoSireex
    ? `${datos.codigoGrupoSireex}-${datos.cicloEscolar}`
    : `(sin grupo SIREEX asignado)`

  return `Antigua Guatemala, ${datos.fechaActual}

A QUIEN CORRESPONDA

De manera atenta hago de su conocimiento que el(la) ${datos.nombreCompleto.toUpperCase()} con Documento de Identificación CUI/DPI No. ${datos.cui ?? 'PENDIENTE'}, con código de estudiante ${datos.codigoEstudiante}.

Actualmente se encuentra inscrito en el Sistema de Información y Registro Extraescolar – SIREEX- en ${datos.nombreEtapaFormateado}, en el grupo ${grupo} dentro de la formación educativa que maneja el Programa Nacional de Educación Alternativa - PRONEA, desde la fecha ${datos.fechaInscripcion}. Así mismo se manifiesta que está llevando su proceso educativo en la modalidad a ${datos.modalidad} en ${datos.municipio}.

Y para los usos legales que al interesado convenga, se extiende y firma la presente en el municipio de ${datos.municipio}.


${datos.nombreFirmante}
${datos.cargoFirmante}${datos.dependenciaFirmante ? '\n' + datos.dependenciaFirmante : ''}`
}

// ── Encabezado con logos dinámicos (desde info_establecimiento) ────────
// NOTA: el documento original proponía una tabla configuracion_logos
// (varios logos con posición/tamaño configurable), pero esa tabla no se
// usa en ningún lado del sistema todavía. En cambio, info_establecimiento
// ya tiene 4 campos de logo con una pantalla de admin funcionando
// (Establecimiento → 🖼️ Logos) y dos de ellos ya están etiquetados
// literalmente "Para documentos oficiales" — así que se usan esos.
export async function obtenerLogosHeaderHTML(): Promise<string> {
  const { data: info } = await supabaseAdmin
    .from('info_establecimiento')
    .select('logo_mineduc_url, logo_digeex_url, logo_establecimiento_url')
    .eq('id', 1)
    .single()

  const logos = [info?.logo_mineduc_url, info?.logo_digeex_url, info?.logo_establecimiento_url]
    .filter(Boolean) as string[]

  if (logos.length === 0) return ''

  const imgTag = (url: string) =>
    `<img src="${url}" style="height:70px;max-width:220px;object-fit:contain" />`

  if (logos.length === 1) {
    return `<div style="text-align:center;margin-bottom:24px">${imgTag(logos[0])}</div>`
  }
  // 2 o 3 logos: distribuidos en una fila (izquierda…derecha)
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
    ${logos.map(imgTag).join('\n    ')}
  </div>`
}
