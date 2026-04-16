'use client'
// src/app/dashboard/tecnico/notas/page.tsx
import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Alert, Tabs, NotaInput, Spinner } from '@/components/ui'
import { calcPuntosExamen } from '@/lib/utils'

export default function NotasPage() {
  const sp = useSearchParams()
  const [inscId,setInscId] = useState(sp.get('id')?? '')
  const [numLibro,setNumLibro] = useState('1')
  const [tab,setTab] = useState('tareas')
  const [libro,setLibro] = useState<any>(null)
  const [tareas,setTareas] = useState<any[]>([])
  const [examenes,setExamenes] = useState<any[]>([])
  const [ajustes,setAjustes] = useState<any[]>([])
  const [loading,setLoading] = useState(false)
  const [err,setErr] = useState('')
  const [msg,setMsg] = useState('')

  const cargar = useCallback(async (tipo:string) => {
    if (!inscId) return
    setLoading(true); setErr('')
    const res = await fetch(`/api/notas?inscripcion_id=${inscId}&numero_libro=${numLibro}&tipo=${tipo}`)
    const d = await res.json()
    if (!res.ok) { setErr(d.error??'Error al cargar'); setLoading(false); return }
    setLibro(d.libro)
    if (tipo==='tareas') setTareas(d.tareas??[])
    else setExamenes(d.examenes??[])
    setLoading(false)
  },[inscId,numLibro])

  useEffect(()=>{ if(inscId){ cargar(tab); fetch(`/api/ajustes?inscripcion_id=${inscId}`).then(r=>r.json()).then(d=>setAjustes(Array.isArray(d)?d.filter((a:any)=>a.activo):[])) } },[inscId,numLibro])
  useEffect(()=>{ if(inscId) cargar(tab) },[tab])

  const guardar = async (tipo:'tarea'|'examen', id:string, val:number) => {
    const body = tipo==='tarea' ? {tipo,inscripcion_id:inscId,tarea_id:id,nota:val} : {tipo,inscripcion_id:inscId,examen_id:id,nota_original:val}
    const res = await fetch('/api/notas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    const d = await res.json()
    if (!res.ok) { setErr(d.error); return }
    if (tipo==='tarea') setTareas(t=>t.map(tt=>tt.id===id?{...tt,nota:val}:tt))
    else setExamenes(e=>e.map(ee=>ee.id===id?{...ee,nota_original:val,puntos_obtenidos:calcPuntosExamen(val)}:ee))
    setMsg('✅'); setTimeout(()=>setMsg(''),1000)
  }

  const recalcular = async () => {
    const res = await fetch('/api/notas/calcular',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({inscripcion_id:inscId,numero_libro:numLibro})})
    const d = await res.json()
    if(d.ok) setMsg(`🔄 ${d.resultados?.[0]?.nota_final?.toFixed(1)}%`)
  }

  const porArea = tareas.reduce((acc:Record<string,any[]>,t)=>{ const k=t.area?.nombre??'Sin área'; if(!acc[k])acc[k]=[]; acc[k].push(t); return acc },{})
  const completadas = tareas.filter(t=>t.nota!==null&&!t.omitida).length
  const pts = tareas.filter(t=>!t.omitida).reduce((s,t)=>s+(t.nota??0),0)
  const max = tareas.filter(t=>!t.omitida).reduce((s,t)=>s+t.puntos_max,0)

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📝 Registro de Notas</div>
        <div className="flex items-center gap-2">
          {msg&&<span className="text-sm font-bold text-green-600">{msg}</span>}
          {libro&&<span className={`badge ${libro.version==='nuevo'?'badge-blue':'badge-orange'}`}>{libro.version==='nuevo'?'📗 Nuevo':'📙 Viejo'}</span>}
        </div>
      </header>
      <div className="pc">
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="flex-1 min-w-48">
              <label className="lbl">ID de inscripción</label>
              <input className="inp font-mono text-xs" value={inscId} onChange={e=>setInscId(e.target.value)} placeholder="UUID..."/>
            </div>
            <div className="w-28"><label className="lbl">Libro</label><select className="inp" value={numLibro} onChange={e=>setNumLibro(e.target.value)}><option value="1">Libro 1</option><option value="2">Libro 2</option></select></div>
            <button className="btn btn-p" onClick={()=>cargar(tab)}>📂 Cargar</button>
            {inscId&&<button className="btn btn-g" onClick={recalcular}>🔄 Recalcular</button>}
          </div>
        </div>

        {err&&<Alert type="error">{err}</Alert>}

        {ajustes.length>0&&(
          <div className="alert al-w mb-3">
            <div><b>♿ {ajustes.length} ajuste(s) activo(s) por discapacidad:</b>
              {ajustes.map((a:any)=>(<div key={a.id} className="text-xs mt-1">• {a.tipo_ajuste?.nombre}: {a.descripcion_ajuste}{a.tareas_total_ajustado&&<span className="ml-1 badge badge-orange">Tareas req.: {a.tareas_total_ajustado}</span>}</div>))}
            </div>
          </div>
        )}

        {!inscId ? (
          <div className="card text-center py-12 text-gray-400"><div className="text-4xl mb-3">📝</div><div className="font-semibold">Ingresa un ID de inscripción para cargar las notas</div></div>
        ) : loading ? <Spinner/> : (
          <div className="card">
            {tareas.length>0&&(
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-blue-50 rounded-xl p-3 text-center"><div className="text-xl font-extrabold text-blue-700">{completadas}/{tareas.filter(t=>!t.omitida).length}</div><div className="text-xs font-bold text-blue-600">Tareas registradas</div></div>
                <div className="bg-green-50 rounded-xl p-3 text-center"><div className="text-xl font-extrabold text-green-700">{pts.toFixed(1)}/{max}</div><div className="text-xs font-bold text-green-600">Puntos obtenidos</div></div>
                <div className={`rounded-xl p-3 text-center ${max>0&&Math.round(pts/max*100)>=60?'bg-green-50':'bg-red-50'}`}><div className="text-xl font-extrabold">{max>0?Math.round(pts/max*100):0}%</div><div className="text-xs font-bold">Zona actual</div></div>
              </div>
            )}
            <Tabs tabs={[{id:'tareas',label:`📋 Tareas (${tareas.length})`},{id:'examenes',label:`📊 Exámenes (${examenes.length})`}]} active={tab} onChange={setTab}/>
            {tab==='tareas'&&(
              tareas.length===0 ? <div className="text-center py-8 text-gray-400 text-sm">No hay tareas. Verifica tabla <code>tareas_catalogo</code>.</div>
              : Object.entries(porArea).map(([area,tList])=>(
                <div key={area} className="mb-5">
                  <div className="text-sm font-extrabold text-gray-700 mb-2">📚 {area} — {(tList as any[]).filter(t=>t.nota!==null&&!t.omitida).length}/{(tList as any[]).filter(t=>!t.omitida).length}</div>
                  <div className="tw"><table className="tbl">
                    <thead><tr><th>#</th><th>Tarea</th><th>Páginas</th><th>Nota (0–5)</th><th>Estado</th></tr></thead>
                    <tbody>{(tList as any[]).map(t=>(
                      <tr key={t.id} className={t.omitida?'opacity-40':''}>
                        <td className="text-gray-400 text-xs">{t.numero_tarea}</td>
                        <td>{t.nombre}{t.omitida&&<span className="ml-1 badge badge-orange text-[9px]">Omitida</span>}</td>
                        <td className="text-gray-400 text-xs">{t.paginas??'—'}</td>
                        <td>{t.omitida?<span className="text-xs text-gray-400">N/A</span>:<NotaInput value={t.nota} max={t.puntos_max} onSave={v=>guardar('tarea',t.id,v)}/>}</td>
                        <td>{t.omitida?<span className="badge badge-orange">Omitida</span>:t.nota===null?<span className="badge badge-yellow">Pendiente</span>:t.con_ajuste?<span className="badge badge-purple">♿ {t.nota}</span>:<span className={`badge ${t.nota>=(t.puntos_max*0.6)?'badge-green':'badge-red'}`}>✓ {t.nota}</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                </div>
              ))
            )}
            {tab==='examenes'&&(
              <div>
                <div className="alert al-i mb-3 text-xs">💡 Nota original (0–100). Sistema calcula: <b>puntos = nota × 20 / 100</b></div>
                {examenes.length===0 ? <div className="text-center py-8 text-gray-400 text-sm">No hay exámenes. Verifica <code>examenes_catalogo</code>.</div>
                : <div className="tw"><table className="tbl">
                    <thead><tr><th>Área</th><th>Examen</th><th>Nota (0–100)</th><th>Puntos (/20)</th><th>Estado</th></tr></thead>
                    <tbody>{examenes.map((ex:any)=>(
                      <tr key={ex.id}>
                        <td className="font-semibold">{ex.area?.nombre}</td>
                        <td>{ex.nombre}</td>
                        <td><NotaInput value={ex.nota_original} max={100} onSave={v=>guardar('examen',ex.id,v)}/></td>
                        <td className="font-bold text-pronea-secondary">{ex.nota_original!==null?`${calcPuntosExamen(ex.nota_original).toFixed(2)} pts`:'—'}</td>
                        <td>{ex.nota_original===null?<span className="badge badge-yellow">Pendiente</span>:<span className={`badge ${ex.nota_original>=60?'badge-green':'badge-red'}`}>{ex.nota_original}%</span>}</td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
