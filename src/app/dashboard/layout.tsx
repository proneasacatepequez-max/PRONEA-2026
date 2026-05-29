// src/app/dashboard/layout.tsx
// CORRECCIÓN: obtiene nombre real del perfil, no del correo
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Sidebar from '@/components/layout/Sidebar'

async function getNombreReal(usuarioId: string, rol: string): Promise<string> {
  try {
    if (rol === 'tecnico') {
      const { data } = await supabaseAdmin.from('tecnicos')
        .select('primer_nombre, primer_apellido').eq('usuario_id', usuarioId).single()
      if (data) return `${data.primer_nombre} ${data.primer_apellido}`
    }
    if (rol === 'director') {
      const { data } = await supabaseAdmin.from('directores')
        .select('primer_nombre, primer_apellido').eq('usuario_id', usuarioId).single()
      if (data) return `${data.primer_nombre} ${data.primer_apellido}`
    }
    if (rol === 'enlace_institucional') {
      const { data } = await supabaseAdmin.from('enlaces_institucionales')
        .select('primer_nombre, primer_apellido').eq('usuario_id', usuarioId).single()
      if (data) return `${data.primer_nombre} ${data.primer_apellido}`
    }
    if (rol === 'coordinador_digeex') {
      const { data } = await supabaseAdmin.from('coordinadores_departamento')
        .select('primer_nombre, primer_apellido').eq('usuario_id', usuarioId).single()
      if (data) return `${data.primer_nombre} ${data.primer_apellido}`
    }
    if (rol === 'estudiante') {
      const { data } = await supabaseAdmin.from('estudiantes')
        .select('primer_nombre, primer_apellido').eq('usuario_id', usuarioId).single()
      if (data) return `${data.primer_nombre} ${data.primer_apellido}`
    }
  } catch { /* fallback al correo */ }
  return ''
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  const nombreReal = await getNombreReal(session.sub, session.rol)
  // fallback si no tiene perfil aún (administrador u otros)
  const nombre = nombreReal || session.correo.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="flex min-h-screen">
      <Sidebar rol={session.rol} nombre={nombre} correo={session.correo} />
      <div className="main">{children}</div>
    </div>
  )
}
