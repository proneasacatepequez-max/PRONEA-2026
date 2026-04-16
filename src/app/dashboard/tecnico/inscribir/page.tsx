'use client'
// src/app/dashboard/tecnico/inscribir/page.tsx
import { useState } from 'react'
import { FormGroup, Input, Select, Alert, SelectorVersion, Steps, LoadingBtn } from '@/components/ui'
import { ETAPAS_LISTA, MUNICIPIOS_SAC } from '@/types'

const DISC=[{id:1,n:'Ninguna'},{id:2,n:'Intelectual Leve'},{id:3,n:'Intelectual Moderada'},{id:4,n:'Intelectual Grave'},{id:5,n:'Intelectual Profunda'},{id:6,n:'TEA'},{id:7,n:'Visual'},{id:8,n:'Baja Visión'},{id:9,n:'Auditiva'},{id:10,n:'Pérdida Auditiva Leve'},{id:11,n:'Física o Motora'},{id:12,n:'Mental'},{id:13,n:'Múltiple'},{id:14,n:'Gente Pequeña'},{id:15,n:'Problemas Aprendizaje'},{id:16,n:'Pendiente'}]
const SECC=['A','A1','A2','A3','A4','A5','A6','AA','AB','B','C','C1','D','D1']
const INSC0={etapa_id:'',sede_id:'',modalidad_id:'1',seccion_id:'',ciclo_escolar:'2026',repite_etapa:false,codigo_sireex:'',version_libro:'nuevo' as 'nuevo'|'viejo'}
type Modo='buscar'|'encontrado'|'nuevo'

export default function InscribirPage(){
  const [modo,setModo]=useState<Modo>('buscar')
  const [paso,setPaso]=useState(1)
  const [busq,setBusq]=useState({tipo:'cui',val:''})
  const [buscando,setBuscando]=useState(false)
  const [resultados,setResultados]=useState<any[]>([])
  const [estSel,setEstSel]=useState<any>(null)
  const [errBusq,setErrBusq]=useState('')
  const [per,setPer]=useState({primer_nombre:'',segundo_nombre:'',primer_apellido:'',segundo_apellido:'',apellido_casada:'',cui:'',cui_pendiente:false,fecha_nacimiento:'',genero:'',telefono:'',correo:'',correo_classroom:'',municipio_id:'',discapacidad_id:'1',conflicto_ley:false,becado_por:''})
  const [insc,setInsc]=useState(INSC0)
  const [docs,setDocs]=useState([{tipo_documento_id:1,label:'DPI *',url:'',req:true},{tipo_documento_id:2,label:'Cert. nacimiento *',url:'',req:true},{tipo_documento_id:4,label:'Fotografía *',url:'',req:true},{tipo_documento_id:3,label:'Constancia estudios',url:'',req:false}])
  const [saving,setSaving]=useState(false)
  const [err,setErr]=useState('')
  const [ok,setOk]=useState<any>(null)
  const reset=()=>{setModo('buscar');setPaso(1);setResultados([]);setEstSel(null);setErr('');setErrBusq('');setBusq({tipo:'cui',val:''});setInsc(INSC0)}

  const buscar=async()=>{
    if(!busq.val.trim()){setErrBusq('Ingresa un valor');return}
    setBuscando(true);setErrBusq('');setResultados([])
    const p=new URLSearchParams();p.set(busq.tipo==='cui'?'cui':busq.tipo==='codigo'?'codigo':'nombre',busq.val)
    const r=await fetch(`/api/estudiantes/buscar?${p}`).then(r=>r.json())
    if(r.encontrado) setResultados(r.estudiantes)
    else{setModo('nuevo');if(busq.tipo==='cui')setPer(p=>({...p,cui:busq.val}))}
    setBuscando(false)
  }

  const guardarExistente=async()=>{
    if(!estSel||!insc.etapa_id||!insc.sede_id){setErr('Etapa y sede requeridos');return}
    setSaving(true);setErr('')
    const res=await fetch(`/api/estudiantes/${estSel.id}/inscribir`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...insc,etapa_id:parseInt(insc.etapa_id),ciclo_escolar:parseInt(insc.ciclo_escolar),modalidad_id:insc.modalidad_id?parseInt(insc.modalidad_id):null,seccion_id:insc.seccion_id?parseInt(insc.seccion_id):null})})
    const d=await res.json()
    if(res.status===409){setErr(d.message);setSaving(false);return}
    if(!res.ok){setErr(d.error??'Error');setSaving(false);return}
    setOk({codigo:d.codigo_estudiante,nombre:d.estudiante,tipo:'existente',id:d.inscripcion_id})
    setSaving(false)
  }

  const guardarNuevo=async()=>{
    setSaving(true);setErr('')
    const res=await fetch('/api/estudiantes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...per,municipio_id:per.municipio_id?parseInt(per.municipio_id):null,discapacidad_id:parseInt(per.discapacidad_id),...insc,etapa_id:parseInt(insc.etapa_id),ciclo_escolar:parseInt(insc.ciclo_escolar),modalidad_id:insc.modalidad_id?parseInt(insc.modalidad_id):null,seccion_id:insc.seccion_id?parseInt(insc.seccion_id):null,documentos:docs.filter(d=>d.url).map(d=>({tipo_documento_id:d.tipo_documento_id,url_google_drive:d.url}))})})
    const d=await res.json()
    if(!res.ok){setErr(d.error??'Error');setSaving(false);return}
    setOk({codigo:d.codigo_estudiante,nombre:`${per.primer_nombre} ${per.primer_apellido}`,tipo:'nuevo',id:d.inscripcion_id})
    setSaving(false)
  }

  if(ok) return(
    <div className="ap">
      <header className="topbar"><div className="page-title">➕ Inscribir</div></header>
      <div className="pc flex justify-center"><div className="card max-w-sm text-center">
        <div className="text-6xl mb-3">🎉</div>
        <h2 className="text-lg font-extrabold text-gray-800 mb-1">{ok.tipo==='nuevo'?'¡Estudiante inscrito!':'¡Inscripción creada!'}</h2>
        <div className="bg-green-50 rounded-xl p-3 text-left mb-4">
          <div className="text-sm font-bold text-green-800">{ok.nombre}</div>
          <div className="text-xl font-extrabold text-green-700 mt-0.5">{ok.codigo}</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-p flex-1" onClick={()=>{setOk(null);reset()}}>➕ Nueva</button>
          <a href="/dashboard/tecnico/estudiantes" className="btn btn-g flex-1">Ver lista</a>
        </div>
      </div></div>
    </div>
  )

  return(
    <div className="ap">
      <header className="topbar">
        <div className="page-title">➕ Inscribir Estudiante</div>
        {modo!=='buscar'&&<button className="btn btn-g btn-sm" onClick={reset}>← Empezar de nuevo</button>}
      </header>
      <div className="pc max-w-3xl">
        {modo==='buscar'&&(
          <div>
            <div className="g2 mb-0">
              <div className="card border-2 border-blue-100"><div className="text-xl mb-1">🔍</div><div className="font-extrabold text-blue-800 text-sm">Estudiante existente</div><div className="text-xs text-blue-600">Solo crea la inscripción sin duplicar datos.</div></div>
              <div className="card border-2 border-green-100"><div className="text-xl mb-1">✨</div><div className="font-extrabold text-green-800 text-sm">Estudiante nuevo</div><div className="text-xs text-green-600">Formulario completo si no se encuentra.</div></div>
            </div>
            <div className="card mt-4">
              <div className="card-title">🔍 Buscar primero</div>
              <div className="flex gap-2 mb-3">
                <div className="w-32"><label className="lbl">Tipo</label><select className="inp" value={busq.tipo} onChange={e=>setBusq(b=>({...b,tipo:e.target.value}))}><option value="cui">CUI</option><option value="codigo">Código</option><option value="nombre">Nombre</option></select></div>
                <div className="flex-1"><label className="lbl">Valor</label><input className="inp" value={busq.val} onChange={e=>setBusq(b=>({...b,val:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&buscar()} placeholder={busq.tipo==='cui'?'2456 78901 0101':'...'/></div>
                <div className="pt-5"><LoadingBtn loading={buscando} className="btn btn-p" onClick={buscar}>Buscar</LoadingBtn></div>
              </div>
              {errBusq&&<Alert type="error">{errBusq}</Alert>}
              {resultados.length>0&&(
                <div>
                  <div className="text-sm font-bold text-gray-700 mb-2">✅ {resultados.length} resultado(s):</div>
                  {resultados.map((e:any)=>(
                    <div key={e.id} onClick={()=>{setEstSel(e);setResultados([]);setModo('encontrado')}}
                      className="border border-gray-100 rounded-xl p-3 mb-2 hover:border-pronea-secondary hover:bg-pronea-light cursor-pointer transition-all">
                      <div className="font-bold text-gray-800">{e.primer_nombre} {e.primer_apellido}</div>
                      <div className="text-xs text-gray-400">Código: {e.codigo_estudiante} · CUI: {e.cui_pendiente?'Pendiente':(e.cui??'—')} · Tel: {e.telefono}</div>
                      {e.inscripciones?.length>0&&<div className="flex flex-wrap gap-1 mt-1">{e.inscripciones.map((i:any)=><span key={i.id} className={`badge text-xs ${i.estado==='en_curso'?'badge-green':'badge-gray'}`}>{i.etapa?.nombre} {i.ciclo_escolar} {i.version_libro==='nuevo'?'📗':'📙'}</span>)}</div>}
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-400">¿No es ninguno?</span>
                    <button className="btn btn-g btn-sm" onClick={()=>{setResultados([]);setModo('nuevo')}}>✨ Crear nuevo</button>
                  </div>
                </div>
              )}
              <div className="flex justify-between mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">¿Nuevo sin buscar?</span>
                <button className="btn btn-g btn-sm" onClick={()=>setModo('nuevo')}>✨ Ingresar nuevo</button>
              </div>
            </div>
          </div>
        )}

        {modo==='encontrado'&&estSel&&(
          <div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4 flex items-start justify-between">
              <div>
                <div className="text-xs text-blue-500 font-bold uppercase mb-1">✅ Seleccionado</div>
                <div className="font-extrabold text-blue-900">{estSel.primer_nombre} {estSel.primer_apellido}</div>
                <div className="text-xs text-blue-600">Código: {estSel.codigo_estudiante} · CUI: {estSel.cui_pendiente?'Pendiente':(estSel.cui??'—')}</div>
              </div>
              <button className="btn btn-g btn-sm" onClick={()=>{setModo('buscar');setEstSel(null)}}>✕</button>
            </div>
            {err&&<Alert type="error">{err}</Alert>}
            <div className="card">
              <div className="card-title">📋 Nueva inscripción</div>
              <div className="fg2">
                <FormGroup label="Etapa" required><Select value={insc.etapa_id} onChange={e=>setInsc(i=>({...i,etapa_id:e.target.value}))}><option value="">—</option>{ETAPAS_LISTA.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></FormGroup>
                <FormGroup label="Ciclo"><Input type="number" value={insc.ciclo_escolar} onChange={e=>setInsc(i=>({...i,ciclo_escolar:e.target.value}))}/></FormGroup>
                <FormGroup label="Sede (UUID)" required><Input value={insc.sede_id} onChange={e=>setInsc(i=>({...i,sede_id:e.target.value}))} placeholder="UUID"/></FormGroup>
                <FormGroup label="Sección"><Select value={insc.seccion_id} onChange={e=>setInsc(i=>({...i,seccion_id:e.target.value}))}><option value="">—</option>{SECC.map((c,idx)=><option key={c} value={idx+1}>{c}</option>)}</Select></FormGroup>
              </div>
              <FormGroup label="Versión del libro *"><SelectorVersion value={insc.version_libro} onChange={v=>setInsc(i=>({...i,version_libro:v}))}/></FormGroup>
              <div className="flex justify-end mt-3"><LoadingBtn loading={saving} className="btn btn-s" onClick={guardarExistente}>✅ Crear inscripción</LoadingBtn></div>
            </div>
          </div>
        )}

        {modo==='nuevo'&&(
          <div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex gap-2"><span className="text-xl">✨</span><div><div className="font-bold text-green-800 text-sm">Nuevo estudiante</div><div className="text-xs text-green-600">Registros en <code className="bg-green-100 px-1 rounded">usuarios</code> <code className="bg-green-100 px-1 rounded">estudiantes</code> <code className="bg-green-100 px-1 rounded">inscripciones</code></div></div></div>
            <Steps steps={['Datos personales','Inscripción','Documentos']} current={paso-1}/>
            {err&&<Alert type="error">{err}</Alert>}
            <div className="card">
              {paso===1&&(
                <div>
                  <div className="text-sm font-extrabold text-gray-700 mb-3">Datos personales</div>
                  <div className="fg2">
                    <FormGroup label="Primer nombre" required><Input value={per.primer_nombre} onChange={e=>setPer(p=>({...p,primer_nombre:e.target.value}))}/></FormGroup>
                    <FormGroup label="Segundo nombre"><Input value={per.segundo_nombre} onChange={e=>setPer(p=>({...p,segundo_nombre:e.target.value}))}/></FormGroup>
                    <FormGroup label="Primer apellido" required><Input value={per.primer_apellido} onChange={e=>setPer(p=>({...p,primer_apellido:e.target.value}))}/></FormGroup>
                    <FormGroup label="Segundo apellido"><Input value={per.segundo_apellido} onChange={e=>setPer(p=>({...p,segundo_apellido:e.target.value}))}/></FormGroup>
                    <div className="col-span-2 flex gap-3 items-end">
                      <FormGroup label="CUI" required={!per.cui_pendiente} className="flex-1 mb-0"><Input value={per.cui} onChange={e=>setPer(p=>({...p,cui:e.target.value}))} disabled={per.cui_pendiente} placeholder="2456 78901 0101"/></FormGroup>
                      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer pb-2 whitespace-nowrap"><input type="checkbox" checked={per.cui_pendiente} onChange={e=>setPer(p=>({...p,cui_pendiente:e.target.checked,cui:''}))} className="w-4 h-4"/>Sin CUI</label>
                    </div>
                    <FormGroup label="Fecha nacimiento"><Input type="date" value={per.fecha_nacimiento} onChange={e=>setPer(p=>({...p,fecha_nacimiento:e.target.value}))}/></FormGroup>
                    <FormGroup label="Teléfono" required><Input value={per.telefono} onChange={e=>setPer(p=>({...p,telefono:e.target.value}))} placeholder="5555-1234"/></FormGroup>
                    <FormGroup label="Correo"><Input type="email" value={per.correo} onChange={e=>setPer(p=>({...p,correo:e.target.value}))}/></FormGroup>
                    <FormGroup label="Municipio"><Select value={per.municipio_id} onChange={e=>setPer(p=>({...p,municipio_id:e.target.value}))}><option value="">—</option>{MUNICIPIOS_SAC.map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}</Select></FormGroup>
                    <FormGroup label="Discapacidad"><Select value={per.discapacidad_id} onChange={e=>setPer(p=>({...p,discapacidad_id:e.target.value}))}>{DISC.map(d=><option key={d.id} value={d.id}>{d.n}</option>)}</Select></FormGroup>
                  </div>
                  <div className="flex justify-between mt-3">
                    <button className="btn btn-g btn-sm" onClick={()=>setModo('buscar')}>← Volver</button>
                    <button className="btn btn-p" onClick={()=>{if(!per.primer_nombre||!per.primer_apellido||!per.telefono){setErr('Nombre y teléfono requeridos');return}if(!per.cui_pendiente&&!per.cui){setErr('Ingresa CUI o marca Sin CUI');return}setErr('');setPaso(2)}}>Siguiente →</button>
                  </div>
                </div>
              )}
              {paso===2&&(
                <div>
                  <div className="text-sm font-extrabold text-gray-700 mb-3">Datos de inscripción</div>
                  <div className="fg2">
                    <FormGroup label="Etapa" required><Select value={insc.etapa_id} onChange={e=>setInsc(i=>({...i,etapa_id:e.target.value}))}><option value="">—</option>{ETAPAS_LISTA.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</Select></FormGroup>
                    <FormGroup label="Ciclo"><Input type="number" value={insc.ciclo_escolar} onChange={e=>setInsc(i=>({...i,ciclo_escolar:e.target.value}))}/></FormGroup>
                    <FormGroup label="Sede (UUID)" required><Input value={insc.sede_id} onChange={e=>setInsc(i=>({...i,sede_id:e.target.value}))} placeholder="UUID"/></FormGroup>
                    <FormGroup label="Sección"><Select value={insc.seccion_id} onChange={e=>setInsc(i=>({...i,seccion_id:e.target.value}))}><option value="">—</option>{SECC.map((c,idx)=><option key={c} value={idx+1}>{c}</option>)}</Select></FormGroup>
                    <FormGroup label="SIREEX"><Input value={insc.codigo_sireex} onChange={e=>setInsc(i=>({...i,codigo_sireex:e.target.value}))} placeholder="Opcional"/></FormGroup>
                  </div>
                  <FormGroup label="Versión del libro *"><SelectorVersion value={insc.version_libro} onChange={v=>setInsc(i=>({...i,version_libro:v}))}/></FormGroup>
                  <div className="flex justify-between mt-3">
                    <button className="btn btn-g" onClick={()=>setPaso(1)}>← Anterior</button>
                    <button className="btn btn-p" onClick={()=>{if(!insc.etapa_id||!insc.sede_id){setErr('Etapa y sede requeridos');return}setErr('');setPaso(3)}}>Siguiente →</button>
                  </div>
                </div>
              )}
              {paso===3&&(
                <div>
                  <div className="text-sm font-extrabold text-gray-700 mb-2">Documentos</div>
                  <div className="alert al-i mb-3 text-xs">📎 URL pública de Google Drive. Tabla: <code>documentos_estudiante</code></div>
                  {docs.map((d,idx)=>(
                    <FormGroup key={d.tipo_documento_id} label={d.label} required={d.req}>
                      <Input type="url" value={d.url} onChange={e=>{const nd=[...docs];nd[idx].url=e.target.value;setDocs(nd)}} placeholder="https://drive.google.com/..."/>
                    </FormGroup>
                  ))}
                  <div className="flex justify-between mt-3">
                    <button className="btn btn-g" onClick={()=>setPaso(2)}>← Anterior</button>
                    <LoadingBtn loading={saving} className="btn btn-s" onClick={guardarNuevo}>✅ Guardar inscripción</LoadingBtn>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
