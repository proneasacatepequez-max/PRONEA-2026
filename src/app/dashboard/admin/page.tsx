// src/app/dashboard/admin/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export default async function AdminDashboard() {
  const s = await getSession()
  if (!s || s.rol !== 'administrador') redirect('/login')

  const [
    { count: totalEst },
    { count: totalTec },
    { count: gruposAbiertos },
    { count: pendientesConf },
  ] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*',{count:'exact',head:true}).eq('ciclo_escolar',2026).eq('estado','en_curso'),
    supabaseAdmin.from('tecnicos').select('*',{count:'exact',head:true}).eq('activo',true),
    supabaseAdmin.from('grupos_sireex').select('*',{count:'exact',head:true}).eq('estado','abierto').eq('ciclo_escolar',2026),
    supabaseAdmin.from('autorizaciones_director').select('*',{count:'exact',head:true}).is('autorizado_por_admin',null).eq('activo',true),
  ])

  const { data: porVersion } = await supabaseAdmin.from('inscripciones')
    .select('version_libro').eq('ciclo_escolar',2026).eq('estado','en_curso')
  const vc = { nuevo:0, viejo:0 }
  porVersion?.forEach((i:any) => { vc[i.version_libro as 'nuevo'|'viejo']++ })

  const { data: permisosGlobales } = await supabaseAdmin
    .from('permisos_globales').select('permiso,activo,descripcion').order('permiso')

  const { data: auditoria } = await supabaseAdmin.from('auditoria')
    .select('id,accion,tabla_afectada,creado_en').order('creado_en',{ascending:false}).limit(6)

  const hoy = new Date().toLocaleDateString('es-GT',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">Dashboard Administrador</div>
        <div className="text-sm text-gray-400">{hoy}</div>
      </header>
      <div className="pc">
        <div className="g4">
          <div className="sc blue"><div className="text-3xl mb-1">🎓</div><div className="text-3xl font-extrabold text-gray-800">{totalEst??0}</div><div className="text-sm text-gray-500 font-semibold">Estudiantes activos</div></div>
          <div className="sc green"><div className="text-3xl mb-1">👨‍🏫</div><div className="text-3xl font-extrabold text-gray-800">{totalTec??0}</div><div className="text-sm text-gray-500 font-semibold">Técnicos activos</div></div>
          <div className="sc yellow"><div className="text-3xl mb-1">📤</div><div className="text-3xl font-extrabold text-gray-800">{gruposAbiertos??0}</div><div className="text-sm text-gray-500 font-semibold">Grupos SIREEX abiertos</div></div>
          <div className={`sc ${(pendientesConf??0)>0?'red':'green'}`}><div className="text-3xl mb-1">⏳</div><div className="text-3xl font-extrabold text-gray-800">{pendientesConf??0}</div><div className="text-sm text-gray-500 font-semibold">Autorizaciones pendientes</div></div>
        </div>

        {/* Alerta autorizaciones pendientes */}
        {(pendientesConf??0) > 0 && (
          <div className="alert al-w mb-5">
            <div>
              <b>⚠️ Hay {pendientesConf} autorización(es) de director esperando tu confirmación.</b>
              <span className="ml-2 text-sm">Sin tu confirmación, el enlace no puede ejecutar la acción.</span>
              <Link href="/dashboard/admin/autorizaciones" className="ml-2 underline font-bold">Revisar ahora →</Link>
            </div>
          </div>
        )}

        <div className="g2">
          {/* Permisos globales */}
          <div className="card">
            <div className="card-title">
              🔐 Permisos globales del sistema
              <Link href="/dashboard/admin/permisos" className="text-xs text-pronea-secondary hover:underline">Gestionar →</Link>
            </div>
            <div className="space-y-2">
              {(permisosGlobales??[]).map((pg:any) => (
                <div key={pg.permiso} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-bold text-gray-700">{pg.permiso.replace(/_/g,' ')}</div>
                    <div className="text-[10px] text-gray-400">{pg.descripcion?.substring(0,60)}...</div>
                  </div>
                  <span className={`badge ${pg.activo?'badge-green':'badge-red'}`}>{pg.activo?'✅ Activo':'🔴 Inactivo'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Versión de libros + accesos */}
          <div className="flex flex-col gap-4">
            <div className="card">
              <div className="card-title">📚 Versión de libro — Ciclo 2026</div>
              <div className="flex gap-3">
                <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-3xl font-extrabold text-blue-700">{vc.nuevo}</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">📗 Nuevo</div>
                  <div className="text-xs text-gray-400">{(totalEst??0)>0?Math.round(vc.nuevo/(totalEst||1)*100):0}%</div>
                </div>
                <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                  <div className="text-3xl font-extrabold text-orange-700">{vc.viejo}</div>
                  <div className="text-sm font-bold text-orange-600 mt-1">📙 Viejo</div>
                  <div className="text-xs text-orange-400">En transición</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">⚡ Módulos</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {href:'/dashboard/admin/permisos',      icon:'🔐', label:'Permisos'},
                  {href:'/dashboard/admin/autorizaciones', icon:'✅', label:'Autorizaciones'},
                  {href:'/dashboard/admin/visibilidad',    icon:'👁️', label:'Visibilidad'},
                  {href:'/dashboard/admin/establecimiento',icon:'🏛️', label:'Establecimiento'},
                  {href:'/dashboard/admin/libros',         icon:'📚', label:'Libros'},
                  {href:'/dashboard/admin/sireex',         icon:'📤', label:'SIREEX'},
                  {href:'/dashboard/admin/usuarios',       icon:'👥', label:'Usuarios'},
                  {href:'/dashboard/admin/configuracion',  icon:'⚙️', label:'Config'},
                ].map(({ href, icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-pronea-secondary hover:bg-pronea-light transition-all text-xs font-semibold text-gray-700">
                    <span>{icon}</span><span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card">
          <div className="card-title">
            🔔 Actividad reciente
            <Link href="/dashboard/admin/auditoria" className="text-xs text-pronea-secondary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-1">
            {(auditoria??[]).map((a:any) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-pronea-secondary flex-shrink-0"/>
                <div className="flex-1 font-semibold text-gray-700 truncate">{a.accion} — {a.tabla_afectada}</div>
                <div className="text-xs text-gray-400 flex-shrink-0">{new Date(a.creado_en).toLocaleTimeString('es-GT',{hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
