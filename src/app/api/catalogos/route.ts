// src/app/api/catalogos/route.ts
// Todos los catálogos para los dropdowns del formulario de estudiante
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const tipo = req.nextUrl.searchParams.get('tipo')

  // Catálogos estáticos como fallback
  const FALLBACK: Record<string, any[]> = {
    estado_civil:  [{ id:1,nombre:'Soltero/a' },{ id:2,nombre:'Casado/a' },{ id:3,nombre:'Unido/a' },{ id:4,nombre:'Divorciado/a' },{ id:5,nombre:'Viudo/a' }],
    pueblos:       [{ id:1,nombre:'Maya' },{ id:2,nombre:'Garífuna' },{ id:3,nombre:'Xinka' },{ id:4,nombre:'Ladino/Mestizo' },{ id:5,nombre:'Otro' }],
    idiomas:       [{ id:1,nombre:'Español' },{ id:2,nombre:'Kaqchikel' },{ id:3,nombre:'Kiche' },{ id:4,nombre:'Qeqchi' },{ id:5,nombre:'Mam' },{ id:6,nombre:'Poqomam' },{ id:7,nombre:'Otro' }],
    tipo_vivienda: [{ id:1,nombre:'Propia' },{ id:2,nombre:'Alquilada' },{ id:3,nombre:'Prestada' },{ id:4,nombre:'Familiar' },{ id:5,nombre:'Otro' }],
    ocupaciones:   [{ id:1,nombre:'Ama de casa' },{ id:2,nombre:'Agricultor/a' },{ id:3,nombre:'Comerciante' },{ id:4,nombre:'Empleado/a' },{ id:5,nombre:'Sin ocupación' },{ id:6,nombre:'Otro' }],
  }

  const tablaMap: Record<string, string> = {
    estado_civil:  'catalogo_estado_civil',
    pueblos:       'catalogo_pueblos',
    idiomas:       'catalogo_idiomas',
    tipo_vivienda: 'catalogo_tipo_vivienda',
    ocupaciones:   'catalogo_ocupaciones',
  }

  // Si piden un catálogo específico
  if (tipo && tablaMap[tipo]) {
    const { data, error } = await supabaseAdmin
      .from(tablaMap[tipo]).select('id,nombre').eq('activo', true).order('nombre')
    if (error || !data?.length) return ok(FALLBACK[tipo] ?? [])
    return ok(data)
  }

  // Si piden todos
  const resultado: Record<string, any[]> = {}
  for (const [key, tabla] of Object.entries(tablaMap)) {
    const { data } = await supabaseAdmin
      .from(tabla).select('id,nombre').eq('activo', true).order('nombre')
    resultado[key] = data?.length ? data : (FALLBACK[key] ?? [])
  }

  return ok(resultado)
}
