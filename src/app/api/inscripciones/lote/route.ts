// src/app/api/inscripciones/lote/route.ts
// Cambia el estado de VARIAS inscripciones en una sola operación de base
// de datos (UPDATE ... WHERE id IN (...)) — pensado para acciones masivas
// de cientos de registros desde el admin, mucho más rápido que una
// petición PATCH por estudiante.
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

const ESTADOS_VALIDOS = ['en_curso', 'completada', 'retirada', 'suspendida', 'finalizada']
const LIMITE_POR_LOTE = 1000

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !['administrador', 'director', 'tecnico'].includes(s.rol))
    return err('Sin permiso', 403)

  let b: any = {}
  try { b = await req.json() } catch { return err('JSON inválido') }

  const { ids, estado } = b
  if (!Array.isArray(ids) || ids.length === 0) return err('ids requerido (arreglo no vacío)', 400)
  if (ids.length > LIMITE_POR_LOTE) return err(`Máximo ${LIMITE_POR_LOTE} inscripciones por lote`, 400)
  if (!estado || !ESTADOS_VALIDOS.includes(estado))
    return err(`estado inválido — valores permitidos: ${ESTADOS_VALIDOS.join(', ')}`, 400)

  // El técnico solo puede aplicar el cambio a inscripciones que él mismo
  // registró (mismo criterio que el PATCH individual para etapa/libro).
  let idsPermitidos = ids
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    if (!tec) return err('Técnico no encontrado', 403)
    const { data: propias } = await supabaseAdmin.from('inscripciones')
      .select('id').in('id', ids).eq('tecnico_id', tec.id)
    idsPermitidos = (propias ?? []).map((p: any) => p.id)
    if (idsPermitidos.length === 0) return err('❌ Ninguna de las inscripciones seleccionadas te pertenece.', 403)
  }

  const upd: any = { estado }
  if (estado === 'completada') {
    // fecha_cierre solo si no tenía una ya — se hace en dos pasos porque
    // el UPDATE en lote no puede leer el valor previo de cada fila.
    const { data: sinFecha } = await supabaseAdmin.from('inscripciones')
      .select('id').in('id', idsPermitidos).is('fecha_cierre', null)
    const idsSinFecha = (sinFecha ?? []).map((r: any) => r.id)
    if (idsSinFecha.length > 0) {
      await supabaseAdmin.from('inscripciones')
        .update({ fecha_cierre: new Date().toISOString().slice(0, 10) })
        .in('id', idsSinFecha)
    }
  }

  const { error, count } = await supabaseAdmin.from('inscripciones')
    .update(upd, { count: 'exact' })
    .in('id', idsPermitidos)

  if (error) return err(error.message, 500)

  return ok({
    ok: true,
    actualizados: count ?? idsPermitidos.length,
    omitidos: ids.length - idsPermitidos.length,
  })
}
