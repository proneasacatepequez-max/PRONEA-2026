// src/lib/constancias.ts
import { supabaseAdmin } from './supabase'

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

// ── Fecha en formato largo para el encabezado ──────────────────────────
export function fechaLargaGT(d: Date = new Date()): string {
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Texto completo de la constancia ─────────────────────────────────────
// Los marcadores {{...}} se reemplazan en el render (imprimir/route.ts)
// para poder aplicar negrilla sin guardar HTML crudo en BD.
export function generarTextoConstancia(datos: {
  fechaActual: string
  nombreCompleto: string
  cui: string | null
  codigoEstudiante: string
  nombreEtapaFormateado: string
  codigoGrupoSireex: string | null
  cicloEscolar: number
  fechaInscripcion: string
  modalidad: string
  municipio: string
  nombreFirmante: string
  cargoFirmante: string
  dependenciaFirmante: string | null
}): string {
  const grupo = datos.codigoGrupoSireex
    ? `${datos.codigoGrupoSireex}-${datos.cicloEscolar}`
    : `(sin grupo SIREEX asignado)`

  // Marcadores @@...@@ para negrilla — se sustituyen al renderizar.
  return `Antigua Guatemala, ${datos.fechaActual}

A QUIEN CORRESPONDA

De manera atenta hago de su conocimiento que el(la) @@${datos.nombreCompleto.toUpperCase()}@@ con Documento de Identificación CUI/DPI No. @@${datos.cui ?? 'PENDIENTE'}@@, con código de estudiante @@${datos.codigoEstudiante}@@.

Actualmente se encuentra inscrito en el Sistema de Información y Registro Extraescolar – SIREEX- en ${datos.nombreEtapaFormateado}, en el grupo @@${grupo}@@ dentro de la formación educativa que maneja el Programa Nacional de Educación Alternativa - PRONEA, desde la fecha @@${datos.fechaInscripcion}@@. Así mismo se manifiesta que está llevando su proceso educativo en la modalidad a @@${datos.modalidad}@@ en Antigua Guatemala.

Y para los usos legales que al interesado convenga, se extiende y firma la presente en el municipio de Antigua Guatemala.


${datos.nombreFirmante}
${datos.cargoFirmante}${datos.dependenciaFirmante ? '\n' + datos.dependenciaFirmante : ''}`
}

export async function obtenerLogosHeaderHTML(): Promise<string> {
  const { data: info } = await supabaseAdmin
    .from('info_establecimiento')
    .select('logo_url, logo_mineduc_url, logo_digeex_url, logo_establecimiento_url')
    .eq('id', 1)
    .single()

  let logos = [info?.logo_mineduc_url, info?.logo_digeex_url, info?.logo_establecimiento_url]
    .filter(Boolean) as string[]

  if (logos.length === 0 && info?.logo_url) logos = [info.logo_url]
  if (logos.length === 0) return ''

  const imgTag = (url: string) =>
    `<img src="${url}" style="height:70px;max-width:220px;object-fit:contain" />`

  if (logos.length === 1) {
    return `<div style="text-align:left;margin-bottom:24px">${imgTag(logos[0])}</div>`
  }
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
    ${logos.map(imgTag).join('\n    ')}
  </div>`
}
