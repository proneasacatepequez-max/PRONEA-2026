// src/app/api/logos-documentos/route.ts
// Administración del catálogo de logos y de su asignación por tipo de documento.
// Solo administrador.
//
//  GET  → { logos, asignaciones, tipos, tablasListas }
//  POST → { accion: 'crear_logo' | 'editar_logo' | 'eliminar_logo' | 'guardar_asignacion', ... }
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
import { TIPOS_DOCUMENTO, sanitizarUrlLogo, normalizarPosicion } from '@/lib/logosConstancias'

const MSG_URL =
  'Ruta inválida. Usa una ruta como /images/logo-x.png o un enlace https directo a la imagen (no enlaces de Google Drive).'

async function soloAdmin(req: NextRequest) {
  const s = await getSession(req)
  return s && s.rol === 'administrador' ? s : null
}

export async function GET(req: NextRequest) {
  try {
    if (!(await soloAdmin(req))) return err('Solo administrador', 403)

    const { data: logos, error: e1 } = await supabaseAdmin
      .from('logos_documentos')
      .select('id, clave, nombre, url, activo, orden')
      .order('orden', { ascending: true })
      .order('id', { ascending: true })

    if (e1) {
      // Lo más probable: aún no se ejecutó sql_logos_documentos.sql
      return ok({ logos: [], asignaciones: [], tipos: TIPOS_DOCUMENTO, tablasListas: false, detalle: e1.message })
    }

    const { data: asignaciones, error: e2 } = await supabaseAdmin
      .from('logos_documentos_asignacion')
      .select('tipo_documento, logo_id, posicion, orden')
      .order('orden', { ascending: true })

    if (e2) return err(e2.message, 500)

    return ok({ logos: logos ?? [], asignaciones: asignaciones ?? [], tipos: TIPOS_DOCUMENTO, tablasListas: true })
  } catch (e: any) {
    return err(e?.message ?? 'Error interno', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!(await soloAdmin(req))) return err('Solo administrador', 403)

    const b = await req.json().catch(() => ({}))
    const accion = b.accion as string

    // ── Crear un logo nuevo en el catálogo ───────────────────────────
    if (accion === 'crear_logo') {
      const nombre = String(b.nombre ?? '').trim().slice(0, 80)
      const url = sanitizarUrlLogo(b.url)
      if (!nombre) return err('El nombre es requerido')
      if (!url) return err(MSG_URL)

      const { data: ult } = await supabaseAdmin
        .from('logos_documentos').select('orden').order('orden', { ascending: false }).limit(1).maybeSingle()

      const { data, error } = await supabaseAdmin
        .from('logos_documentos')
        .insert({ nombre, url, activo: true, orden: (ult?.orden ?? 0) + 1 })
        .select('id, clave, nombre, url, activo, orden').single()
      if (error) return err(error.message, 500)
      return ok({ ok: true, logo: data })
    }

    // ── Editar nombre / ruta / activo ────────────────────────────────
    if (accion === 'editar_logo') {
      const id = Number(b.id)
      if (!id) return err('id requerido')
      const upd: any = {}
      if (b.nombre !== undefined) {
        const n = String(b.nombre).trim().slice(0, 80)
        if (!n) return err('El nombre no puede estar vacío')
        upd.nombre = n
      }
      if (b.url !== undefined) {
        const u = sanitizarUrlLogo(b.url)
        if (!u) return err(MSG_URL)
        upd.url = u
      }
      if (b.activo !== undefined) upd.activo = !!b.activo
      if (!Object.keys(upd).length) return err('Nada que actualizar')

      const { error } = await supabaseAdmin.from('logos_documentos').update(upd).eq('id', id)
      if (error) return err(error.message, 500)
      return ok({ ok: true })
    }

    // ── Eliminar (también quita sus asignaciones por ON DELETE CASCADE) ─
    if (accion === 'eliminar_logo') {
      const id = Number(b.id)
      if (!id) return err('id requerido')
      const { error } = await supabaseAdmin.from('logos_documentos').delete().eq('id', id)
      if (error) return err(error.message, 500)
      return ok({ ok: true })
    }

    // ── Guardar qué logos lleva un tipo de documento y en qué posición ─
    if (accion === 'guardar_asignacion') {
      const tipo = String(b.tipo ?? '')
      if (!TIPOS_DOCUMENTO.some(t => t.v === tipo)) return err('Tipo de documento inválido')
      const items: { logo_id: number; posicion: string }[] = Array.isArray(b.items) ? b.items : []

      // Sin duplicados, solo ids numéricos
      const vistos = new Set<number>()
      const filas = items
        .map((it, i) => ({ logo_id: Number(it.logo_id), posicion: normalizarPosicion(it.posicion), orden: i + 1 }))
        .filter(f => f.logo_id && !vistos.has(f.logo_id) && vistos.add(f.logo_id))
        .map(f => ({ ...f, tipo_documento: tipo }))

      const { error: eDel } = await supabaseAdmin
        .from('logos_documentos_asignacion').delete().eq('tipo_documento', tipo)
      if (eDel) return err(eDel.message, 500)

      if (filas.length) {
        const { error: eIns } = await supabaseAdmin.from('logos_documentos_asignacion').insert(filas)
        if (eIns) return err(eIns.message, 500)
      }
      return ok({ ok: true })
    }

    return err('Acción no válida')
  } catch (e: any) {
    return err(e?.message ?? 'Error interno', 500)
  }
}
