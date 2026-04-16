// src/app/dashboard/estudiante/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { docsVisiblesEst } from '@/lib/permisos'

export default async function EstudianteDashboard() {
  const s = await getSession(); if(!s||s.rol!=='estudiante') redirect('/login')

  const { data:est } = await supabaseAdmin.from('estudiantes')
    .select('id,primer_nombre,primer_apellido,codigo_estudiante,discapacidad_id').eq('usuario_id',s.sub).single()
  if(!est) redirect('/login')

  const { data:insc } = await supabaseAdmin.from('inscripciones')
    .select(`id,ciclo_escolar,estado,version_libro,tiene_ajuste_discapacidad,codigo_sireex,
      etapa:etapas(id,nombre,codigo,nivel), tecnico:tecnicos(primer_nombre,primer_apellido,telefono),
      sede:sedes(nombre,horario), modalidad:modalidades(nombre), seccion:secciones(codigo)
    `).eq('estudiante_id',est.id).eq('estado','en_curso').eq('ciclo_escolar',2026).single()

  const { data:re } = insc ? await supabaseAdmin.from('resumen_etapa')
    .select('nota_libro_1,nota_libro_2,nota_final_etapa,calificacion_cualitativa,promovido')
    .eq('inscripcion_id',insc.id).single() : { data:null }

  const libros = insc ? await Promise.all([1,2].map(async num => {
    const { data:l } = await supabaseAdmin.from('libros').select('id,nombre,numero,version')
      .eq('etapa_id',(insc.etapa as any).id??0).eq('numero',num).eq('version',insc.version_libro).single()
    if(!l) return null
    const { data:rl } = await supabaseAdmin.from('resumen_libro')
      .select('tareas_completadas,tareas_total,zona,nota_final,promovido,estado').eq('inscripcion_id',insc.id).eq('libro_id',l.id).single()
    return { ...l, resumen:rl }
  })) : []

  const { data:ajustes } = insc ? await supabaseAdmin.from('ajustes_discapacidad')
    .select('id,descripcion_ajuste,tareas_total_ajustado,tipo_ajuste:tipos_ajuste_discapacidad(nombre)')
    .eq('inscripcion_id',insc.id).eq('activo',true) : { data:[] }

  const mostrarDocs = await docsVisiblesEst()

  return (
    <div className="ap">
      <header className="topbar">
        <div><div className="page-title">Hola, {est.primer_nombre} 👋</div><div className="text-xs text-gray-400">{est.codigo_estudiante}</div></div>
        <div className="text-sm text-gray-400">{new Date().toLocaleDateString('es-GT',{weekday:'long',year:'numeric',month:'short',day:'numeric'})}</div>
      </header>
      <div className="pc">
        <div className="g3">
          <div className="sc blue"><div className="text-3xl mb-1">📊</div><div className="text-3xl font-extrabold text-gray-800">{re?.nota_final_etapa?.toFixed(1)??'—'}%</div><div className="text-sm text-gray-500 font-semibold">Mi promedio</div></div>
          <div className={`sc ${re?.promovido?'green':re?.promovido===false?'red':'yellow'}`}>
            <div className="text-3xl mb-1">{re?.promovido?'🎉':re?.promovido===false?'⚠️':'⏳'}</div>
            <div className="text-base font-extrabold text-gray-800">{re?.promovido?'Promovido':re?.promovido===false?'No promovido':'En curso'}</div>
            <div className="text-sm text-gray-500">{re?.calificacion_cualitativa??'Estado'}</div>
          </div>
          <div className={`sc ${insc?.tiene_ajuste_discapacidad?'yellow':'blue'}`}>
            <div className="text-3xl mb-1">{insc?.tiene_ajuste_discapacidad?'♿':'📚'}</div>
            <div className="text-base font-extrabold text-gray-800">{insc?.version_libro==='nuevo'?'Libro Nuevo':'Libro Viejo'}</div>
            <div className="text-sm text-gray-500">{insc?.tiene_ajuste_discapacidad?'Con ajustes':'Sin ajustes'}</div>
          </div>
        </div>

        {/* Inscripción activa */}
        {insc&&(
          <div className="card mb-5">
            <div className="card-title">📋 Mi inscripción</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div><span className="text-gray-400">Etapa:</span> <b>{(insc.etapa as any)?.nombre}</b></div>
              <div><span className="text-gray-400">Sede:</span> <b>{(insc.sede as any)?.nombre}</b></div>
              <div><span className="text-gray-400">Horario:</span> <b>{(insc.sede as any)?.horario??'—'}</b></div>
              <div><span className="text-gray-400">Sección:</span> <b>{(insc.seccion as any)?.codigo??'—'}</b></div>
              <div><span className="text-gray-400">Mi técnico:</span> <b>{(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}</b> <span className="text-gray-400">{(insc.tecnico as any)?.telefono??''}</span></div>
              <div><span className="text-gray-400">Libro:</span> <span className={`badge ml-1 ${insc.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>{insc.version_libro==='nuevo'?'📗 Nuevo':'📙 Viejo'}</span></div>
            </div>
          </div>
        )}

        {/* Ajustes activos */}
        {(ajustes??[]).length>0&&(
          <div className="alert al-w mb-4">
            <div><b>♿ Tienes {(ajustes??[]).length} ajuste(s) curricular(es):</b>
              {(ajustes??[]).map((a:any)=><div key={a.id} className="text-xs mt-1">• <b>{a.tipo_ajuste?.nombre}</b>: {a.descripcion_ajuste}{a.tareas_total_ajustado&&<span className="ml-1">({a.tareas_total_ajustado} tareas requeridas)</span>}</div>)}
            </div>
          </div>
        )}

        {/* Notas por libro */}
        <div className="card mb-5">
          <div className="card-title">📚 Mis notas por libro</div>
          <div className="g2">
            {libros.filter(Boolean).map((l:any)=>(
              <div key={l.id} className={`rounded-xl p-4 ${l.resumen?.nota_final!=null?(l.resumen.nota_final>=70?'bg-green-50':l.resumen.nota_final>=60?'bg-yellow-50':'bg-red-50'):'bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-gray-700">Libro {l.numero}</div>
                  <span className={`badge ${l.version==='nuevo'?'badge-blue':'badge-orange'}`}>{l.version==='nuevo'?'📗':'📙'}</span>
                </div>
                <div className={`text-2xl font-extrabold ${l.resumen?.nota_final?(l.resumen.nota_final>=70?'text-green-600':l.resumen.nota_final>=60?'text-yellow-600':'text-red-600'):'text-gray-400'}`}>
                  {l.resumen?.nota_final?.toFixed(1)??'—'}%
                </div>
                {l.resumen&&<div className="text-xs text-gray-500 mt-1">Tareas: {l.resumen.tareas_completadas}/{l.resumen.tareas_total} · Zona: {l.resumen.zona?.toFixed(1)??'—'}%</div>}
                <div className="mt-2">
                  {l.resumen?.promovido===true&&<span className="badge badge-green">✓ Promovido</span>}
                  {l.resumen?.promovido===false&&<span className="badge badge-red">✗ No promovido</span>}
                  {!l.resumen&&<span className="badge badge-yellow">En progreso</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">⚡ Mi espacio</div>
          <div className="grid grid-cols-3 gap-3">
            <Link href="/dashboard/estudiante/calificaciones" className="btn btn-p justify-center">📝 Mis notas</Link>
            {mostrarDocs&&<Link href="/dashboard/estudiante/documentos" className="btn btn-g justify-center">📎 Documentos</Link>}
            <Link href="/dashboard/estudiante/recursos" className="btn btn-g justify-center">🎬 Recursos</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
