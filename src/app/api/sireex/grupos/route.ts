// src/app/api/sireex/grupos/route.ts
// FIX CRÍTICO: tecnico_id NUNCA usa s.sub como fallback (s.sub es usuario_id, no tecnico_id)
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

  const p     = req.nextUrl.searchParams
  const ciclo  = p.get('ciclo') ?? '2026'
  const estado = p.get('estado')

  let q = supabaseAdmin.from('grupos_sireex')
    .select(`
      id, codigo, codigo_mineduc, nombre, estado, ciclo_escolar,
      fecha_apertura, fecha_cierre, observaciones,
      tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico),
      etapa:etapas(id, nombre, codigo),
      sede:sedes(id, nombre)
    `)
    .eq('ciclo_escolar', parseInt(ciclo))
    .order('creado_en', { ascending: false })

  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) return err('Perfil de técnico no encontrado. Contacta al administrador para que configure tu perfil.', 404)
    q = q.eq('tecnico_id', tecnicoId)
  }

  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return err(error.message, 500)

  // Contar estudiantes por grupo
  const grupos = await Promise.all((data ?? []).map(async (g: any) => {
    const { count } = await supabaseAdmin
      .from('estudiantes_grupo_sireex')
      .select('*', { count: 'exact', head: true })
      .eq('grupo_sireex_id', g.id)
    return { ...g, _count: { estudiantes: count ?? 0 } }
  }))

  return ok(grupos)
}

export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (!['tecnico', 'administrador', 'director'].includes(s.rol))
    return err('Sin permiso', 403)

  const b = await req.json().catch(() => ({}))

  if (!b.etapa_id || !b.sede_id || !b.ciclo_escolar)
    return err('etapa_id, sede_id y ciclo_escolar son requeridos')

  // ─────────────────────────────────────────────────────────
  // FIX: obtener tecnico_id REAL — NUNCA usar s.sub como fallback
  // s.sub es usuario_id, no tecnico_id — son tablas diferentes
  // ─────────────────────────────────────────────────────────
  let tecnicoId: string | null = b.tecnico_id ?? null

  if (!tecnicoId && s.rol === 'tecnico') {
    tecnicoId = await getTecnicoId(s.sub)
    if (!tecnicoId) {
      return err(
        'Tu perfil de técnico no está configurado. Contacta al administrador para que registre tus datos en el sistema antes de crear grupos.',
        404
      )
    }
  }

  if (!tecnicoId) {
    return err('tecnico_id requerido para crear un grupo SIREEX', 400)
  }

  const ciclo  = parseInt(b.ciclo_escolar)
  const ts     = Date.now()
  const codigo = b.codigo ?? `SR-${ciclo}-${String(ts).slice(-5)}`

  const { data, error } = await supabaseAdmin.from('grupos_sireex').insert({
    codigo,
    nombre:         b.nombre         ?? null,
    codigo_mineduc: b.codigo_mineduc  ?? null,
    tecnico_id:     tecnicoId,          // ← siempre el ID real de la tabla tecnicos
    etapa_id:       parseInt(b.etapa_id),
    sede_id:        b.sede_id,
    ciclo_escolar:  ciclo,
    estado:        'abierto',
    observaciones:  b.observaciones   ?? null,
    creado_por:     s.sub,
    ingresado_por:  s.sub,
    fecha_apertura: new Date().toISOString().split('T')[0],
  }).select('id, codigo').single()

  if (error) return err(error.message, 500)

  await supabaseAdmin.from('grupos_sireex_historial').insert({
    grupo_sireex_id: data.id,
    accion:          'CREADO',
    usuario_id:      s.sub,
    detalle:         `Grupo creado: ${data.codigo}`,
  }).catch(() => {})

  return ok(data, 201)
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const b = await req.json().catch(() => ({}))
  if (!b.id) return err('id requerido')

  // Verificar que sea el técnico dueño del grupo o admin
  if (s.rol === 'tecnico') {
    const tecnicoId = await getTecnicoId(s.sub)
    const { data: g } = await supabaseAdmin
      .from('grupos_sireex').select('tecnico_id').eq('id', b.id).single()
    if (tecnicoId !== g?.tecnico_id)
      return err('Sin permiso para editar este grupo', 403)
  }

  const upd: any = {}
  if (b.codigo_mineduc !== undefined) upd.codigo_mineduc = b.codigo_mineduc || null
  if (b.nombre         !== undefined) upd.nombre         = b.nombre         || null
  if (b.estado         !== undefined) upd.estado         = b.estado
  if (b.observaciones  !== undefined) upd.observaciones  = b.observaciones  || null
  if (b.fecha_cierre   !== undefined) upd.fecha_cierre   = b.fecha_cierre   || null

  if (Object.keys(upd).length === 0) return err('Nada que actualizar')

  const { error } = await supabaseAdmin
    .from('grupos_sireex').update(upd).eq('id', b.id)

  if (error) return err(error.message, 500)
  return ok({ ok: true })
}
