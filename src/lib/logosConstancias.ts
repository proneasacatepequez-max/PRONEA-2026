// src/lib/logosConstancias.ts
// Encabezado de logos para los documentos imprimibles (constancia, boleta, escalas).
//
//  • Hay un CATÁLOGO de logos (tabla logos_documentos): MINEDUC, PRONEA y los que
//    el administrador agregue en el futuro.
//  • Cada TIPO de documento (constancia / boleta / escala / ...) tiene sus propias
//    asignaciones (tabla logos_documentos_asignacion): qué logos lleva y en qué
//    posición (izquierda / centro / derecha). Puede llevar uno, dos o más.
//  • Los logos viven en public/images/ — NO dependen de Google Drive.
//  • Si las tablas todavía no existen (no se ejecutó sql_logos_documentos.sql),
//    se usan los valores por defecto y nada se rompe.
import { supabaseAdmin } from '@/lib/supabase'

export type PosicionLogo = 'izquierda' | 'centro' | 'derecha'

export const POSICIONES_LOGO: { v: PosicionLogo; label: string }[] = [
  { v: 'izquierda', label: '⬅️ Izquierda' },
  { v: 'centro',    label: '⏺️ Centro' },
  { v: 'derecha',   label: 'Derecha ➡️' },
]

// Para agregar un documento nuevo en el futuro, solo añade una línea aquí
// (y llama obtenerLogosHTML('<tipo>') en su ruta de impresión).
export const TIPOS_DOCUMENTO: { v: string; label: string; icono: string }[] = [
  { v: 'constancia', label: 'Constancia de inscripción', icono: '📜' },
  { v: 'boleta',     label: 'Boleta de calificaciones',  icono: '🧾' },
  { v: 'escala',     label: 'Escalas numéricas',         icono: '📄' },
]

// Tamaño del logo según el documento (px en pantalla/impresión)
const MEDIDAS: Record<string, { altura: number; maxAncho: number; margenInf: number }> = {
  constancia: { altura: 105, maxAncho: 320, margenInf: 24 },
  boleta:     { altura: 62,  maxAncho: 200, margenInf: 12 },
  escala:     { altura: 46,  maxAncho: 150, margenInf: 6  },
}
const MEDIDA_DEFECTO = { altura: 70, maxAncho: 220, margenInf: 16 }

const MINEDUC_DEFECTO = '/images/logo-mineduc.png'
const PRONEA_DEFECTO  = '/images/logo-pronea.png'

export interface LogoAsignado {
  nombre: string
  url: string
  posicion: PosicionLogo
}

// Devuelve una URL usable o null. Acepta rutas locales (/images/...) y
// enlaces https directos. Rechaza enlaces de Google Drive (no cargan como imagen).
export function sanitizarUrlLogo(url: unknown): string | null {
  const u = typeof url === 'string' ? url.trim() : ''
  if (!u) return null
  if (!u.startsWith('/') && !/^https?:\/\//i.test(u)) return null
  if (u.startsWith('//')) return null
  if (/drive\.google\.com|docs\.google\.com|\/d\/[A-Za-z0-9_-]{20,}/i.test(u)) return null
  return u
}

export function normalizarPosicion(v: unknown): PosicionLogo {
  return (v === 'izquierda' || v === 'centro' || v === 'derecha') ? v : 'izquierda'
}

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// ── Render: fila de 3 zonas (izq / centro / der) ────────────────────────
// Las zonas izquierda y derecha siempre existen (flex:1) para que el logo
// central quede realmente centrado aunque falte alguno de los lados.
export function construirHeaderLogos(logos: LogoAsignado[], tipo: string): string {
  if (!logos.length) return ''
  const m = MEDIDAS[tipo] ?? MEDIDA_DEFECTO

  const img = (l: LogoAsignado) =>
    `<img src="${escAttr(l.url)}" alt="${escAttr(l.nombre)}" onerror="this.style.display='none'"
       style="height:${m.altura}px;max-width:${m.maxAncho}px;object-fit:contain" />`

  const zona = (pos: PosicionLogo) => logos.filter(l => l.posicion === pos)

  const izq = zona('izquierda')
  const cen = zona('centro')
  const der = zona('derecha')

  const slot = (items: LogoAsignado[], justify: string, flex: string) =>
    `<div style="display:flex;align-items:center;gap:14px;justify-content:${justify};flex:${flex}">${items.map(img).join('')}</div>`

  return `<div class="logos-header" style="display:flex;align-items:center;gap:14px;margin-bottom:${m.margenInf}px">
    ${slot(izq, 'flex-start', '1 1 0')}
    ${cen.length ? slot(cen, 'center', '0 0 auto') : ''}
    ${slot(der, 'flex-end', '1 1 0')}
  </div>`
}

// ── Valores por defecto (si faltan las tablas) ──────────────────────────
async function logosPorDefecto(tipo: string): Promise<LogoAsignado[]> {
  let urlMineduc = MINEDUC_DEFECTO
  let urlPronea  = PRONEA_DEFECTO
  let posConst: PosicionLogo = 'izquierda'
  try {
    const { data: info } = await supabaseAdmin
      .from('info_establecimiento')
      .select('logo_url, logo_mineduc_url, constancia_logo_mineduc_pos')
      .eq('id', 1).maybeSingle()
    urlMineduc = sanitizarUrlLogo(info?.logo_mineduc_url) ?? MINEDUC_DEFECTO
    urlPronea  = sanitizarUrlLogo(info?.logo_url) ?? PRONEA_DEFECTO
    posConst   = normalizarPosicion(info?.constancia_logo_mineduc_pos)
  } catch { /* usa los defectos */ }

  if (tipo === 'constancia') {
    return [{ nombre: 'MINEDUC', url: urlMineduc, posicion: posConst }]
  }
  return [
    { nombre: 'PRONEA',  url: urlPronea,  posicion: 'izquierda' },
    { nombre: 'MINEDUC', url: urlMineduc, posicion: 'derecha' },
  ]
}

// ── Lee la configuración del tipo de documento ──────────────────────────
export async function obtenerLogosAsignados(tipo: string): Promise<LogoAsignado[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('logos_documentos_asignacion')
      .select('posicion, orden, logo:logos_documentos(nombre, url, activo)')
      .eq('tipo_documento', tipo)
      .order('orden', { ascending: true })

    if (error) return await logosPorDefecto(tipo)   // tablas aún no creadas

    const out: LogoAsignado[] = []
    for (const row of (data ?? []) as any[]) {
      const logo = Array.isArray(row.logo) ? row.logo[0] : row.logo
      if (!logo || logo.activo === false) continue
      const url = sanitizarUrlLogo(logo.url)
      if (!url) continue
      out.push({ nombre: logo.nombre, url, posicion: normalizarPosicion(row.posicion) })
    }
    return out   // vacío = el administrador dejó este documento sin logos
  } catch {
    return await logosPorDefecto(tipo)
  }
}

// ── Punto de entrada para las rutas de impresión ────────────────────────
export async function obtenerLogosHTML(tipo: string): Promise<string> {
  return construirHeaderLogos(await obtenerLogosAsignados(tipo), tipo)
}

// Compatibilidad con la ruta de constancias
export async function obtenerLogosConstanciaHTML(): Promise<string> {
  return obtenerLogosHTML('constancia')
}
