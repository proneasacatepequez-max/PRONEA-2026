// src/lib/estadoInscripcion.ts
// Egreso perezoso: una inscripción 'completada' en la ÚLTIMA etapa del
// programa (hoy 5to. Bachillerato — la de mayor "orden" entre las etapas
// activas) pasa a 'finalizada' automáticamente la primera vez que se
// CONSULTA en un ciclo escolar posterior al que se completó.
//
// No es un cron: se evalúa "al vuelo" cada vez que GET /api/inscripciones
// devuelve filas, así que el cambio ocurre "para una búsqueda que se haga"
// (tal como lo pidió Marco), sin depender de un job programado que esta
// app no tiene.
import { supabaseAdmin } from './supabase'

let ordenMaxCache: { valor: number; ts: number } | null = null

// El "orden" tope se cachea en memoria unos minutos: cambia rarísima vez
// (solo si se agrega/desactiva una etapa) y así evitamos una consulta
// extra por cada petición de la lista de inscripciones.
async function obtenerOrdenMaxEtapaActiva(): Promise<number | null> {
  const ahora = Date.now()
  if (ordenMaxCache && ahora - ordenMaxCache.ts < 5 * 60 * 1000) return ordenMaxCache.valor

  const { data } = await supabaseAdmin.from('etapas')
    .select('orden').eq('activo', true)
    .order('orden', { ascending: false }).limit(1).single()

  if (data?.orden == null) return null
  ordenMaxCache = { valor: data.orden, ts: ahora }
  return data.orden
}

type InscripcionParaEgreso = {
  id: string
  estado: string
  ciclo_escolar: number
  etapa?: { orden?: number | null } | null
}

// Revisa un lote de inscripciones (ya traídas de la BD) y, para las que
// corresponda, las marca 'finalizada' en la base de datos. Devuelve el
// mismo arreglo con el campo `estado` ya actualizado donde aplicó, para
// que la respuesta de la petición actual sea consistente con lo que se
// acaba de escribir.
export async function egresarLoteSiCorresponde<T extends InscripcionParaEgreso>(
  filas: T[]
): Promise<T[]> {
  const anioActual = new Date().getFullYear()

  const candidatas = filas.filter(f =>
    f.estado === 'completada' &&
    f.ciclo_escolar < anioActual &&
    f.etapa?.orden != null
  )
  if (candidatas.length === 0) return filas

  const ordenMax = await obtenerOrdenMaxEtapaActiva()
  if (ordenMax == null) return filas

  const idsAEgresar = candidatas
    .filter(f => f.etapa!.orden === ordenMax)
    .map(f => f.id)
  if (idsAEgresar.length === 0) return filas

  const { error } = await supabaseAdmin.from('inscripciones')
    .update({ estado: 'finalizada' })
    .in('id', idsAEgresar)

  if (error) return filas // si falla la escritura, devolvemos los datos tal cual (sin egresar)

  const idsSet = new Set(idsAEgresar)
  return filas.map(f => idsSet.has(f.id) ? { ...f, estado: 'finalizada' } : f)
}

// Variante para una sola inscripción (GET por id).
export async function egresarUnaSiCorresponde<T extends InscripcionParaEgreso>(
  fila: T
): Promise<T> {
  const [resultado] = await egresarLoteSiCorresponde([fila])
  return resultado
}
