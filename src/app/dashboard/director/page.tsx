// src/app/dashboard/director/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
export default async function DirectorDashboard() {
  const s = await getSession(); if(!s||s.rol!=='director') redirect('/login')
  const { data:dir } = await supabaseAdmin.from('directores').select('id,primer_nombre,primer_apellido,sede_id,sede:sedes(nombre)').eq('usuario_id',s.sub).single()
  if(!dir) redirect('/login')
  const [{ count:est },{ count:tec },{ count:pend }] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*',{count:'exact',head:true}).eq('sede_id',dir.sede_id).eq('ciclo_escolar',2026).eq('estado','en_curso'),
    supabaseAdmin.from('tecnico_sedes').select('*',{count:'exact',head:true}).eq('sede_id',dir.sede_id).eq('activo',true),
    supabaseAdmin.from('autorizaciones_director').select('id',{count:'exact',head:true}).eq('director_id',dir.id).is('autorizado_por_admin',null).eq('activo',true),
  ])
  return (
    <div className="ap">
      <header className="topbar"><div><div className="page-title">Director — {(dir.sede as any)?.nombre}</div><div className="text-xs text-gray-400">{dir.primer_nombre} {dir.primer_apellido}</div></div></header>
      <div className="pc">
        {(pend??0)>0&&<div className="alert al-w mb-4"><b>⏳ {pend} autorización(es) esperando confirmación del administrador.</b></div>}
        <div className="g3">
          <div className="sc blue"><div className="text-3xl mb-1">🎓</div><div className="text-3xl font-extrabold text-gray-800">{est??0}</div><div className="text-sm text-gray-500 font-semibold">Estudiantes</div></div>
          <div className="sc green"><div className="text-3xl mb-1">👨‍🏫</div><div className="text-3xl font-extrabold text-gray-800">{tec??0}</div><div className="text-sm text-gray-500 font-semibold">Técnicos</div></div>
          <div className={`sc ${(pend??0)>0?'yellow':'green'}`}><div className="text-3xl mb-1">🔐</div><div className="text-3xl font-extrabold text-gray-800">{pend??0}</div><div className="text-sm text-gray-500 font-semibold">Pendientes admin</div></div>
        </div>
        <div className="card">
          <div className="card-title">⚡ Acciones</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/director/autorizaciones" className="btn btn-p justify-center">🔐 Autorizar a mis enlaces</Link>
            <Link href="/dashboard/director/estudiantes" className="btn btn-g justify-center">🎓 Ver estudiantes</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
