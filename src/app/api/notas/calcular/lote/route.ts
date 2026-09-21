// src/app/api/notas/calcular/lote/route.ts
// Igual que /api/notas/calcular pero para VARIOS estudiantes en una sola
// petición — pensado para acciones masivas de cientos de registros desde
// el admin, donde hacer una llamada HTTP por estudiante desde el navegador
// sería lento. Todo el trabajo ocurre en el servidor.
import { NextRequest } from 'next/server'
import { getSession, ok, err } from '@/lib/auth'
import { calcularInscripcion } from '@/lib/calcularNotas'

const LIMITE_POR_LOTE = 500

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { inscripcion_ids } = await req.json()
  if (!Array.isArray(inscripcion_ids) || inscripcion_ids.length === 0)
    return err('inscripcion_ids requerido (arreglo no vacío)', 400)
  if (inscripcion_ids.length > LIMITE_POR_LOTE)
    return err(`Máximo ${LIMITE_POR_LOTE} inscripciones por lote`, 400)

  // Se procesan en tandas pequeñas en paralelo para no saturar la conexión
  // a Supabase, pero mucho más rápido que una petición HTTP por estudiante.
  const TAMANO_TANDA = 10
  const detalle: any[] = []

  for (let i = 0; i < inscripcion_ids.length; i += TAMANO_TANDA) {
    const tanda = inscripcion_ids.slice(i, i + TAMANO_TANDA)
    const resultadosTanda = await Promise.all(
      tanda.map(async (id: string) => {
        try {
          const r = await calcularInscripcion(id)
          return { inscripcion_id: id, ok: r.ok, error: r.error ?? null, completada: r.inscripcion_completada, estado_final: r.estado_final }
        } catch (e: any) {
          return { inscripcion_id: id, ok: false, error: e?.message ?? 'Error inesperado', completada: false, estado_final: null }
        }
      })
    )
    detalle.push(...resultadosTanda)
  }

  const completados = detalle.filter(d => d.completada).length
  const errores      = detalle.filter(d => !d.ok).length

  return ok({
    ok: true,
    total: detalle.length,
    completados,
    errores,
    detalle,
  })
}
