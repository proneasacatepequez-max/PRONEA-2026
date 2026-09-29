// src/lib/constancias.ts
import { supabaseAdmin } from './supabase'

// ── Formateo de la etapa a lenguaje formal ──────────────────────────────
// Estructura PRONEA:
//   • Primaria:  1ra. Etapa (1°-3°)  |  2da. Etapa (4°-6°)
//   • Básico:    1ra. Etapa (1°-2°)  |  2da. Etapa (3°)
//   • Diversificado: 4to. Bachillerato | 5to. Bachillerato
//
// El campo real (etapas.nombre) puede venir como:
//   "1a. Etapa Básico", "2a. Etapa Primaria", "5to. Bachillerato",
//   "4to. Bachillerato", "5to. Grado Bachillerato", etc.
const ORDINALES_FEMENINOS: Record<string, string> = {
  '1a': 'Primera', '2a': 'Segunda', '3a': 'Tercera',
  '4a': 'Cuarta', '5a': 'Quinta', '6a': 'Sexta',
}
const ORDINALES_MASCULINOS: Record<string, string> = {
  '1ro': 'Primer', '2do': 'Segundo', '3ro': 'Tercer',
  '4to': 'Cuarto', '5to': 'Quinto', '6to': 'Sexto',
}

// Nombre oficial completo del bachillerato (con orientación)
const BACHILLERATO_COMPLETO =
  'Bachillerato en Ciencias y Letras con Orientación en Productividad y Emprendimiento'

export function formatearEtapaParaTexto(nombreEtapa: string): string {
  if (!nombreEtapa) return ''
  const original = nombreEtapa.trim()

  // 1) Bachillerato: acepta "5to. Bachillerato", "5to Bachillerato",
  //    "5to. Grado Bachillerato", "5to. Año Bachillerato"
  const mBach = original.match(
    /^(\d+(?:to|ro|do|a))\.?\s*(?:Grado|Año)?\s*Bachillerato/i
  )
  if (mBach) {
    const prefijo = mBach[1].toLowerCase()
    const ordinal = ORDINALES_MASCULINOS[prefijo]
      ?? ORDINALES_FEMENINOS[prefijo]
      ?? prefijo
    return `${ordinal} ${BACHILLERATO_COMPLETO}`
  }

  // 2) Etapa (Básico / Primaria / Diversificado): "1a. Etapa Básico"
  const mEtapa = original.match(/^(\d+(?:a|ro|do|to))\.?\s+Etapa\s+(.+)$/i)
  if (mEtapa) {
    const [, prefijo, resto] = mEtapa
    const restoLower = resto.trim().toLowerCase()
    const ordinal = ORDINALES_FEMENINOS[prefijo.toLowerCase()]
      ?? ORDINALES_MASCULINOS[prefijo.toLowerCase()]
      ?? prefijo

    let cicloTexto: string
    if (restoLower.includes('bach') || restoLower.includes('diversif')) {
      cicloTexto = 'del Ciclo de Educación Diversificada'
    } else if (restoLower.includes('básic') || restoLower.includes('basic')) {
      cicloTexto = 'del Ciclo de Educación Básica'
    } else if (restoLower.includes('primaria') || restoLower.includes('primar')) {
      cicloTexto = 'del Ciclo de Educación Primaria'
    } else {
      cicloTexto = `del Ciclo de Educación ${resto.trim()}`
    }

    return `la ${ordinal} Etapa ${cicloTexto}`
  }

  // 3) Fallback para nombres no reconocidos
  return `la ${original}`
}

// ── Fecha en formato largo para el encabezado ──────────────────────────
export function fechaLargaGT(d: Date = new Date()): string {
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Texto completo de la constancia ─────────────────────────────────────
// Los marcadores @@...@@ se reemplazan por <b>...</b> en el render
// (imprimir/route.ts), para no guardar HTML crudo en BD.
//
// Reglas de "lugar" (IMPORTANTE — no confundir):
//   • Encabezado de fecha ("Antigua Guatemala, 29 de septiembre...") →
//     FIJO. Es donde se emite el documento.
//   • Párrafo legal ("...en la modalidad X en <municipio>") → DINÁMICO.
//     Es el municipio donde el estudiante RECIBE clases, o sea el
//     municipio de la sede de la inscripción.
//   • Cierre ("...en el municipio de Antigua Guatemala.") → FIJO.
//     Es donde se firma la constancia (Coordinador Departamental DIGEEX
//     con sede en Antigua Guatemala). NO cambia por sede.
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
  municipio: string          // municipio de la SEDE (dinámico, solo párrafo legal)
  nombreFirmante: string
  cargoFirmante: string
  dependenciaFirmante: string | null
}): string {
  const grupo = datos.codigoGrupoSireex
    ? `${datos.codigoGrupoSireex}-${datos.cicloEscolar}`
    : `(sin grupo SIREEX asignado)`

  // Municipio de la SEDE (donde el estudiante recibe clases). Si por
  // alguna razón viene vacío, se usa Antigua Guatemala como respaldo.
  const municipioSede = datos.municipio?.trim() || 'Antigua Guatemala'

  return `Antigua Guatemala, ${datos.fechaActual}

A QUIEN CORRESPONDA

De manera atenta hago de su conocimiento que el(la) @@${datos.nombreCompleto.toUpperCase()}@@ con Documento de Identificación CUI/DPI No. @@${datos.cui ?? 'PENDIENTE'}@@, con código de estudiante @@${datos.codigoEstudiante}@@.

Actualmente se encuentra inscrito en el Sistema de Información y Registro Extraescolar – SIREEX- en ${datos.nombreEtapaFormateado}, en el grupo @@${grupo}@@ dentro de la formación educativa que maneja el Programa Nacional de Educación Alternativa - PRONEA, desde la fecha @@${datos.fechaInscripcion}@@. Así mismo se manifiesta que está llevando su proceso educativo en la modalidad @@${datos.modalidad}@@ en ${municipioSede}.

Y para los usos legales que al interesado convenga, se extiende y firma la presente en el municipio de Antigua Guatemala.


${datos.nombreFirmante}
${datos.cargoFirmante}${datos.dependenciaFirmante ? '\n' + datos.dependenciaFirmante : ''}`
}

// ── Encabezado con logos dinámicos (desde info_establecimiento) ────────
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
