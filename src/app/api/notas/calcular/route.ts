// src/app/api/notas/calcular/route.ts
import { NextRequest } from 'next/server'
import { getSession, ok, err } from '@/lib/auth'
import { calcularInscripcion } from '@/lib/calcularNotas'

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const { inscripcion_id, numero_libro } = await req.json()
  if (!inscripcion_id) return err('inscripcion_id requerido')

  const resultado = await calcularInscripcion(inscripcion_id, numero_libro)
  if (!resultado.ok) return err(resultado.error ?? 'Error al calcular', 404)

  return ok(resultado)
}
