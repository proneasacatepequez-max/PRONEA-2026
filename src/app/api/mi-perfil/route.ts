// src/app/api/mi-perfil/route.ts
import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)

  const { data: est } = await supabaseAdmin.from('estudiantes')
    .select(`id,codigo_estudiante,primer_nombre,primer_apellido,cui,cui_pendiente,telefono,correo,
      inscripciones(id,version_libro,estado,ciclo_escolar,
        etapa:etapas(nombre), sede:sedes(nombre))`)
    .eq('usuario_id', s.sub).single()

  const inscripcion = (est?.inscripciones as any[])?.find((i: any) => i.estado === 'en_curso') ?? null
  return ok({ estudiante: est, inscripcion })
}

export async function PATCH(req: NextRequest) {
  const s = await getSession(req); if (!s) return err('No autorizado', 401)
  const { contrasena_actual, contrasena_nueva } = await req.json()
  if (!contrasena_actual || !contrasena_nueva) return err('Contraseña actual y nueva requeridas')
  if (contrasena_nueva.length < 6) return err('La nueva contraseña debe tener al menos 6 caracteres')

  const { data: u } = await supabaseAdmin.from('usuarios')
    .select('id,contrasena_hash').eq('id', s.sub).single()
  if (!u) return err('Usuario no encontrado', 404)

  const valida = await bcrypt.compare(contrasena_actual, u.contrasena_hash)
  if (!valida) return err('La contraseña actual es incorrecta', 401)

  const hash = await bcrypt.hash(contrasena_nueva, 10)
  await supabaseAdmin.from('usuarios').update({
    contrasena_hash: hash, primer_ingreso: false
  }).eq('id', s.sub)

  return ok({ ok: true })
}
