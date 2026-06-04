// src/app/api/dua/route.ts
// FIX: mensaje de error claro cuando el perfil técnico no está configurado
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

async function getTecnicoId(usuarioId: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('tecnicos').select('id').eq('usuario_id', usuarioId).single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p      = req.nextUrl.searchParams
  const ciclo  = p.get('ciclo') ?? '2026'
  const grupoId = p.get('grupo_id')

  let tecnicoId: string | null = null

  if (s.rol === 'tecnico') {
    tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) {
      // Retornar estructura vacía con mensaje claro en lugar de error 404
      return ok({
        grupos: [],
        sesiones: [],
        _aviso: 'Tu perfil de técnico no está completamente configurado. El administrador debe registrar tus datos personales en el sistema.',
      })
    }
  }

  let qGrupos = supabaseAdmin.from('grupos_dua').select(`
    id, nombre, descripcion, estado, max_estudiantes, ciclo_escolar, creado_en,
    etapa:etapas(nombre),
    sede:sedes(nombre),
    tecnico:tecnicos(primer_nombre, primer_apellido)
  `)
  .eq('ciclo_escolar', parseInt(ciclo))
  .order('creado_en', { ascending: false })

  if (tecnicoId) qGrupos = qGrupos.eq('tecnico_id', tecnicoId)

  const { data: grupos, error } = await qGrupos
  if (error) return err(error.message, 500)

  if (grupoId) {
    const { data: sesiones } = await supabaseAdmin.from('sesiones_dua').select(`
      id, fecha_sesion, hora_inicio, hora_fin, estado, observaciones,
      actividades_dua(id, nombre, numero_actividad, puntos_max, area:areas(nombre))
    `)
    .eq('grupo_dua_id', grupoId)
    .order('fecha_sesion', { ascending: false })

    return ok({ grupos: grupos ?? [], sesiones: sesiones ?? [] })
  }

  return ok({ grupos: grupos ?? [], sesiones: [] })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador'].includes(s.rol)) return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))

  // FIX: obtener tecnico_id REAL
  let tecnicoId: string | null = b.tecnico_id ?? null
  if (!tecnicoId && s.rol === 'tecnico') {
    tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) {
      return err(
        'Tu perfil de técnico no está configurado. Contacta al administrador.',
        404
      )
    }
  }

  if (!tecnicoId)       return err('tecnico_id requerido')
  if (!b.sede_id)       return err('sede_id requerido')
  if (!b.ciclo_escolar) return err('ciclo_escolar requerido')

  const { data, error } = await supabaseAdmin.from('grupos_dua').insert({
    tecnico_id:    tecnicoId,
    sede_id:       b.sede_id,
    ciclo_escolar: parseInt(b.ciclo_escolar),
    nombre:        b.nombre       || `Grupo DUA ${new Date().toLocaleDateString('es-GT')}`,
    descripcion:   b.descripcion  || null,
    etapa_id:      b.etapa_id     ? parseInt(b.etapa_id) : null,
    max_estudiantes: b.max_estudiantes ?? 10,
    estado:       'activo',
    creado_por:    s.sub,
  }).select('id, nombre').single()

  if (error) return err(error.message, 500)
  return ok(data, 201)
}
