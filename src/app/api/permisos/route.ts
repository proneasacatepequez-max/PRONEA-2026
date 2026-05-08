// src/app/api/permisos/route.ts
// CORREGIDO: manejo de errores para que no se quede cargando indefinidamente
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  // Intentar con la vista primero
  const { data: vistaData, error: vistaError } = await supabaseAdmin
    .from('v_panel_permisos_admin')
    .select('*')

  if (!vistaError) return ok(vistaData ?? [])

  // Si la vista no existe, leer directamente de permisos_globales
  const { data, error } = await supabaseAdmin
    .from('permisos_globales')
    .select('permiso, activo, descripcion, actualizado_por, actualizado_en')
    .order('permiso')

  if (error) {
    // Si la tabla tampoco existe, devolver permisos por defecto
    if (error.code === '42P01') {
      return ok([
        { permiso: 'ingresar_notas_enlace',       activo: false, descripcion: 'Permite al enlace ingresar notas', autorizaciones_vigentes: 0, pendientes_confirmacion_admin: 0 },
        { permiso: 'ver_documentos_enlace',        activo: false, descripcion: 'Permite al enlace ver documentos', autorizaciones_vigentes: 0, pendientes_confirmacion_admin: 0 },
        { permiso: 'inscribir_estudiantes_enlace', activo: false, descripcion: 'Permite al enlace inscribir estudiantes', autorizaciones_vigentes: 0, pendientes_confirmacion_admin: 0 },
        { permiso: 'exportar_datos_enlace',        activo: false, descripcion: 'Permite al enlace exportar datos', autorizaciones_vigentes: 0, pendientes_confirmacion_admin: 0 },
        { permiso: 'gestionar_sesiones_enlace',    activo: false, descripcion: 'Permite al enlace gestionar sesiones', autorizaciones_vigentes: 0, pendientes_confirmacion_admin: 0 },
      ])
    }
    return err(error.message, 500)
  }

  // Enriquecer con conteos de autorizaciones
  const enriquecidos = await Promise.all((data ?? []).map(async (pg: any) => {
    const { count: vigentes } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('*', { count: 'exact', head: true })
      .eq('permiso', pg.permiso).eq('activo', true)
      .not('autorizado_por_admin', 'is', null)
      .catch(() => ({ count: 0 }))

    const { count: pendientes } = await supabaseAdmin
      .from('autorizaciones_director')
      .select('*', { count: 'exact', head: true })
      .eq('permiso', pg.permiso).eq('activo', true)
      .is('autorizado_por_admin', null)
      .catch(() => ({ count: 0 }))

    return {
      ...pg,
      global_activo: pg.activo,
      autorizaciones_vigentes: vigentes ?? 0,
      pendientes_confirmacion_admin: pendientes ?? 0,
    }
  }))

  return ok(enriquecidos)
}

export async function PUT(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)
  if (s.rol !== 'administrador') return err('Solo administrador', 403)

  const { permiso, activo } = await req.json()
  if (!permiso || typeof activo !== 'boolean') return err('permiso y activo requeridos')

  const { error } = await supabaseAdmin
    .from('permisos_globales')
    .update({ activo, actualizado_por: s.sub, actualizado_en: new Date().toISOString() })
    .eq('permiso', permiso)

  if (error) {
    // Si no existe el registro, insertarlo
    if (error.code === 'PGRST116' || error.message.includes('no rows')) {
      await supabaseAdmin.from('permisos_globales').insert({
        permiso, activo, descripcion: permiso.replace(/_/g, ' '), actualizado_por: s.sub
      })
      return ok({ ok: true, permiso, activo })
    }
    return err(error.message, 500)
  }

  return ok({ ok: true, permiso, activo })
}
