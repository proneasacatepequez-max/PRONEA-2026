// src/lib/permisos.ts
// Función central de control de acceso — llama a verificar_permiso() en Supabase
import { supabaseAdmin } from '@/lib/supabase'
import type { RolUsuario } from '@/types'

// ── Verificar permiso principal ────────────────────────────
export async function verificarPermiso(
  usuarioId: string,
  permiso: string,
  ip?: string
): Promise<{ permitido: boolean; motivo: string }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('verificar_permiso', {
      p_usuario_id: usuarioId,
      p_permiso:    permiso,
    })
    if (error) { console.error('[verificarPermiso]', error.message); return { permitido:false, motivo:'Error al verificar' } }
    const permitido = data === true
    if (!permitido) {
      // Registrar intento sin bloquear respuesta
      supabaseAdmin.rpc('registrar_intento_no_autorizado', {
        p_usuario_id: usuarioId, p_permiso: permiso,
        p_accion: `Intento de ${permiso}`, p_ip: ip ?? null,
      }).catch(() => {})
    }
    return { permitido, motivo: permitido ? 'Autorizado' : `Sin permiso para "${permiso}"` }
  } catch { return { permitido:false, motivo:'Error interno' } }
}

// ── Verificar visibilidad de institución para coordinador ──
export async function visibilidadInstitucion(instId: string) {
  const { data } = await supabaseAdmin.rpc('verificar_visibilidad_coordinador', { p_institucion_id: instId })
  if (!data?.[0]) return { visible:true, enlaceVisible:true, nombre:'No disponible' }
  return {
    visible:       data[0].institucion_visible as boolean,
    enlaceVisible: data[0].enlace_visible as boolean,
    nombre:        data[0].nombre_mostrar as string,
  }
}

// ── Leer configuración del sistema ────────────────────────
export async function leerConfig(param: string, def='true'): Promise<string> {
  const { data } = await supabaseAdmin.from('configuracion').select('valor').eq('parametro', param).single()
  return data?.valor ?? def
}
export const docsObligatorios = () => leerConfig('documentos_obligatorios','true').then(v=>v==='true')
export const docsVisibles     = () => leerConfig('documentos_visibles','true').then(v=>v==='true')
export const docsVisiblesEst  = () => leerConfig('documentos_visibles_estudiante','true').then(v=>v==='true')

// ── Calcular promedios ─────────────────────────────────────
export interface Cfg { pctTareas:number; pctExamenes:number; notaMinima:number; pesoL1:number; pesoL2:number }
export const CFG_DEFAULT: Cfg = { pctTareas:60, pctExamenes:40, notaMinima:60, pesoL1:50, pesoL2:50 }

export async function cargarConfig(): Promise<Cfg> {
  const { data } = await supabaseAdmin.from('configuracion').select('parametro,valor')
    .in('parametro',['PORCENTAJE_TAREAS','PORCENTAJE_EXAMENES','NOTA_MINIMA_PROMOCION','PESO_LIBRO_1','PESO_LIBRO_2'])
  if (!data) return CFG_DEFAULT
  const m = Object.fromEntries(data.map((c:any) => [c.parametro, parseInt(c.valor)]))
  return { pctTareas:m.PORCENTAJE_TAREAS??60, pctExamenes:m.PORCENTAJE_EXAMENES??40,
    notaMinima:m.NOTA_MINIMA_PROMOCION??60, pesoL1:m.PESO_LIBRO_1??50, pesoL2:m.PESO_LIBRO_2??50 }
}
export const calcZona   = (pts:number, max:number) => max ? Math.round(pts/max*100*100)/100 : 0
export const calcLibro  = (zona:number, ex:number, c:Cfg=CFG_DEFAULT) => Math.round((zona*c.pctTareas/100+ex*c.pctExamenes/100)*100)/100
export const calcEtapa  = (n1:number|null, n2:number|null, c:Cfg=CFG_DEFAULT) => n1===null||n2===null ? null : Math.round((n1*c.pesoL1/100+n2*c.pesoL2/100)*100)/100
export const cualitativa = (n:number) => n>=90?'Excelente':n>=80?'Muy Bueno':n>=70?'Bueno':n>=60?'Suficiente':'Insuficiente'
export const colorNota  = (n:number|null) => n===null?'text-gray-400':n>=70?'text-green-600':n>=60?'text-yellow-600':'text-red-600'
export const bgNota     = (n:number|null) => n===null?'bg-gray-100 text-gray-500':n>=70?'bg-green-100 text-green-800':n>=60?'bg-yellow-100 text-yellow-800':'bg-red-100 text-red-800'
