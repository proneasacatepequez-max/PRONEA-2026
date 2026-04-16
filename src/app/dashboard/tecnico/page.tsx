// src/app/dashboard/tecnico/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

export default async function TecnicoDashboard() {
  const s = await getSession()
  if (!s || s.rol !== 'tecnico') redirect('/login')

  const { data:tec } = await supabaseAdmin.from('tecnicos')
    .select('id,primer_nombre,primer_apellido,codigo_tecnico').eq('usuario_id',s.sub).single()
  if (!tec) redirect('/login')

  const [{ count:total },{ count:riesgo },{ count:grupos }] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*',{count:'exact',head:true}).eq('tecnico_id',tec.id).eq('ciclo_escolar',2026).eq('estado','en_curso'),
    supabaseAdmin.from('resumen_libro').select('inscripciones!inner(*)',{count:'exact',head:true}).eq('inscripciones.tecnico_id',tec.id).lt('nota_final',45),
    supabaseAdmin.from('grupos_sireex').select('*',{count:'exact',head:true}).eq('tecnico_id',tec.id).eq('estado','abierto').eq('ciclo_escolar',2026),
  ])

  const { data:pv } = await supabaseAdmin.from('inscripciones').select('version_libro').eq('tecnico_id',tec.id).eq('ciclo_escolar',2026)
  const vc = {nuevo:0,viejo:0}; pv?.forEach((i:any)=>{ vc[i.version_libro as 'nuevo'|'viejo']++ })

  const { data:ultimas } = await supabaseAdmin.from('inscripciones')
    .select('id,version_libro,fecha_inscripcion,tiene_ajuste_discapacidad,etapa:etapas(nombre),estudiante:estudiantes(primer_nombre,primer_apellido,codigo_estudiante)')
    .eq('tecnico_id',tec.id).eq('ciclo_escolar',2026).order('creado_en',{ascending:false}).limit(5)

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">Hola, {tec.primer_nombre} 👋</div>
          <div className="text-xs text-gray-400">Código: {tec.codigo_tecnico??'—'}</div>
        </div>
        <div className="text-sm text-gray-400">{new Date().toLocaleDateString('es-GT',{weekday:'long',year:'numeric',month:'short',day:'numeric'})}</div>
      </header>
      <div className="pc">
        <div className="g4">
          <div className="sc blue"><div className="text-3xl mb-1">🎓</div><div className="text-3xl font-extrabold text-gray-800">{total??0}</div><div className="text-sm text-gray-500 font-semibold">Mis estudiantes</div></div>
          <div className="sc blue"><div className="text-3xl mb-1">📗</div><div className="text-3xl font-extrabold text-blue-700">{vc.nuevo}</div><div className="text-sm text-gray-500 font-semibold">Libro Nuevo</div></div>
          <div className="sc yellow"><div className="text-3xl mb-1">📙</div><div className="text-3xl font-extrabold text-orange-600">{vc.viejo}</div><div className="text-sm text-gray-500 font-semibold">Libro Viejo</div></div>
          <div className={`sc ${(riesgo??0)>0?'red':'green'}`}><div className="text-3xl mb-1">⚠️</div><div className="text-3xl font-extrabold text-gray-800">{riesgo??0}</div><div className="text-sm text-gray-500 font-semibold">En riesgo (&lt;45%)</div></div>
        </div>
        <div className="g2">
          <div className="card">
            <div className="card-title">⚡ Acciones rápidas</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                {href:'/dashboard/tecnico/inscribir',  icon:'➕',label:'Inscribir',cls:'btn-p'},
                {href:'/dashboard/tecnico/notas',      icon:'📝',label:'Notas',   cls:'btn-s'},
                {href:'/dashboard/tecnico/sireex',     icon:'📤',label:'SIREEX',  cls:'btn-g'},
                {href:'/dashboard/tecnico/estudiantes',icon:'🎓',label:'Estudiantes',cls:'btn-g'},
              ].map(({href,icon,label,cls})=>(
                <Link key={href} href={href} className={`btn ${cls} justify-center py-3`}><span>{icon}</span><span>{label}</span></Link>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-title">🕐 Últimas inscripciones</div>
            <div className="space-y-2">
              {(ultimas??[]).map((i:any)=>(
                <div key={i.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-bold text-gray-700">{(i.estudiante as any)?.primer_nombre} {(i.estudiante as any)?.primer_apellido}</div>
                    <div className="text-xs text-gray-400">{(i.etapa as any)?.nombre}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`badge ${i.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>{i.version_libro==='nuevo'?'📗':'📙'}</span>
                    <Link href={`/dashboard/tecnico/notas?id=${i.id}`} className="btn btn-p btn-xs">📝</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
