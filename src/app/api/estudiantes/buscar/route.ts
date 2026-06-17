// src/app/api/estudiantes/buscar/route.ts — NUEVA RUTA
// Busca estudiante existente por CUI o código MINEDUC
// Usada por el formulario de inscripción para decidir: "nuevo" vs "reinscribir"
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q || q.length < 3) return ok({ encontrados: [] })

  // Buscar por CUI exacto, código exacto, o nombre parcial
  const { data, error } = await supabaseAdmin
    .from('estudiantes')
    .select(`
      id, codigo_estudiante, cui, cui_pendiente,
      primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      telefono, fecha_nacimiento, genero, activo,
      municipio:municipios(id, nombre),
      inscripciones(
        id, ciclo_escolar, estado, version_libro,
        etapa:etapas(id, nombre, nivel, orden),
        sede:sedes(id, nombre)
      )
    `)
    .or(`cui.eq.${q},codigo_estudiante.eq.${q},primer_nombre.ilike.%${q}%,primer_apellido.ilike.%${q}%`)
    .eq('activo', true)
    .limit(10)

  if (error) return err(error.message, 500)

  // Para cada estudiante, marcar cuál es su última etapa cursada
  const conUltimaEtapa = (data ?? []).map((e: any) => {
    const inscripcionesOrdenadas = (e.inscripciones ?? [])
      .sort((a: any, b: any) => (b.etapa?.orden ?? 0) - (a.etapa?.orden ?? 0))
    const ultima = inscripcionesOrdenadas[0]
    const activa = (e.inscripciones ?? []).find((i: any) => i.estado === 'en_curso')

    return {
      ...e,
      ultima_etapa:      ultima?.etapa ?? null,
      inscripcion_activa: activa ?? null,
      total_inscripciones: (e.inscripciones ?? []).length,
    }
  })

  return ok({ encontrados: conUltimaEtapa })
}
