// src/app/dashboard/coordinador/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
export default async function CoordinadorDashboard() {
  const s = await getSession(); if(!s||s.rol!=='coordinador_digeex') redirect('/login')
  const [{ count:listos },{ count:exportados },{ count:grupos }] = await Promise.all([
    supabaseAdmin.from('resumen_etapa').select('*',{count:'exact',head:true}).eq('validado_digeex',false).not('nota_final_etapa','is',null),
    supabaseAdmin.from('grupos_sireex').select('*',{count:'exact',head:true}).eq('estado','exportado').eq('ciclo_escolar',2026),
    supabaseAdmin.from('grupos_sireex').select('*',{count:'exact',head:true}).eq('estado','abierto').eq('ciclo_escolar',2026),
  ])
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">Coordinador DIGEEX — Validación SIREEX</div></header>
      <div className="pc">
        <div className="alert al-w mb-4"><b>🔒 El coordinador no puede ingresar notas ni delegar permisos.</b> Solo puede visualizar estudiantes según la configuración de visibilidad.</div>
        <div className="g3">
          <div className="sc green"><div className="text-3xl mb-1">✅</div><div className="text-3xl font-extrabold text-gray-800">{listos??0}</div><div className="text-sm text-gray-500 font-semibold">Listos para validar</div></div>
          <div className="sc blue"><div className="text-3xl mb-1">📤</div><div className="text-3xl font-extrabold text-gray-800">{exportados??0}</div><div className="text-sm text-gray-500 font-semibold">Grupos exportados</div></div>
          <div className="sc yellow"><div className="text-3xl mb-1">📂</div><div className="text-3xl font-extrabold text-gray-800">{grupos??0}</div><div className="text-sm text-gray-500 font-semibold">Grupos abiertos</div></div>
        </div>
        <div className="card">
          <div className="card-title">⚡ Acciones disponibles</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/coordinador/grupos" className="btn btn-p justify-center">📤 Ver grupos SIREEX</Link>
            <Link href="/dashboard/coordinador/exportar" className="btn btn-s justify-center">📥 Exportar CSV</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
