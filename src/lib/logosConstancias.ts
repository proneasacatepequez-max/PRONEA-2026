// src/lib/logosConstancias.ts
// Encabezado de logos para los documentos imprimibles.
//
//  • Constancias de inscripción → solo MINEDUC (posición configurable).
//  • Otros documentos (boletas, escalas) → solo PRONEA, fijo a la izquierda.
//  • Los logos viven en public/images/ — NO dependen de Google Drive.
import { supabaseAdmin } from '@/lib/supabase'

export type PosicionLogo = 'izquierda' | 'centro' | 'derecha'

export const POSICIONES_LOGO: { v: PosicionLogo; label: string }[] = [
  { v: 'izquierda', label: '⬅️ Izquierda' },
  { v: 'centro',    label: '⏺️ Centro' },
  { v: 'derecha',   label: 'Derecha ➡️' },
]

const MINEDUC_DEFECTO = '/images/logo-mineduc.png'
const PRONEA_DEFECTO  = '/images/logo-pronea.png'

// Si el campo está vacío o todavía tiene un enlace viejo de Google Drive
// (que no carga como imagen), se usa el logo local por defecto.
function urlLogo(url: unknown, respaldo: string): string {
  const u = typeof url === 'string' ? url.trim() : ''
  if (!u) return respaldo
  if (/drive\.google\.com|docs\.google\.com/i.test(u)) return respaldo
  return u
}

function posicion(v: unknown): PosicionLogo {
  return (v === 'izquierda' || v === 'centro' || v === 'derecha') ? v : 'izquierda'
}

const escAttr = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

// ── Constancias: solo el logo del MINEDUC, con posición configurable ────
export function construirHeaderConstancia(info: any): string {
  const pos = posicion(info?.constancia_logo_mineduc_pos)
  const src = urlLogo(info?.logo_mineduc_url, MINEDUC_DEFECTO)

  const justify =
    pos === 'centro'  ? 'center' :
    pos === 'derecha' ? 'flex-end' :
                        'flex-start'

  return `<div style="display:flex;justify-content:${justify};align-items:center;margin-bottom:24px">
    <img src="${escAttr(src)}" alt="Ministerio de Educación"
         style="height:75px;max-width:230px;object-fit:contain" />
  </div>`
}

// ── Otros documentos: solo el logo de PRONEA, fijo a la izquierda ──────
export function construirHeaderDocumento(info: any): string {
  const src = urlLogo(info?.logo_url, PRONEA_DEFECTO)
  return `<div style="display:flex;justify-content:flex-start;align-items:center;margin-bottom:24px">
    <img src="${escAttr(src)}" alt="PRONEA"
         style="height:75px;max-width:230px;object-fit:contain" />
  </div>`
}

// ── Wrappers que leen la config de info_establecimiento ────────────────
export async function obtenerLogosConstanciaHTML(): Promise<string> {
  const { data: info } = await supabaseAdmin
    .from('info_establecimiento')
    .select('constancia_logo_mineduc_pos, logo_mineduc_url')
    .eq('id', 1)
    .maybeSingle()
  return construirHeaderConstancia(info)
}

export async function obtenerLogoDocumentoHTML(): Promise<string> {
  const { data: info } = await supabaseAdmin
    .from('info_establecimiento')
    .select('logo_url')
    .eq('id', 1)
    .maybeSingle()
  return construirHeaderDocumento(info)
}
