'use client'
// src/app/dashboard/admin/visibilidad/page.tsx
import { useState, useEffect } from 'react'
import { Alert, Spinner, Empty, Toggle, LoadingBtn, Modal, FormGroup, Input, Textarea } from '@/components/ui'

export default function VisibilidadPage() {
  const [vis, setVis] = useState<any[]>([])
  const [instituciones, setInst] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ institucion_id:'', visible_para_coordinador:true, ocultar_enlace:false, razon_ocultamiento:'' })

  const cargar = async () => {
    setLoading(true)
    const [v, i] = await Promise.all([
      fetch('/api/visibilidad').then(r=>r.json()),
      fetch('/api/instituciones').then(r=>r.json()).catch(()=>[]),
    ])
    setVis(Array.isArray(v)?v:[])
    setInst(Array.isArray(i)?i:[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    setSaving(true)
    const res = await fetch('/api/visibilidad',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    const d = await res.json()
    setMsg(res.ok?'✅ Guardado':'❌ '+d.error)
    setTimeout(()=>setMsg(''),3000)
    setModal(false); cargar(); setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👁️ Visibilidad para Coordinador</div>
          <div className="text-xs text-gray-400">Controla qué instituciones y enlaces puede ver el coordinador DIGEEX</div>
        </div>
        <button className="btn btn-p" onClick={()=>setModal(true)}>＋ Configurar institución</button>
      </header>
      <div className="pc max-w-3xl">
        {msg&&<Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}
        <div className="alert al-i mb-4">
          <div>
            <b>📋 Reglas de visibilidad:</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>• <b>Institución oculta</b> → el coordinador ve <code className="bg-blue-100 px-1 rounded">"No disponible"</code></div>
              <div>• <b>Enlace oculto</b> → el coordinador ve <code className="bg-blue-100 px-1 rounded">"Oculto"</code> en lugar del nombre</div>
              <div>• Esta configuración aplica en <b>API, búsquedas y exportaciones</b> (no solo frontend)</div>
            </div>
          </div>
        </div>
        {loading?<Spinner/>:vis.length===0?<Empty msg="Sin configuración especial. Todas las instituciones son visibles."/>:(
          <div className="space-y-3">
            {vis.map((v:any)=>(
              <div key={v.id} className="card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-gray-800">{v.institucion?.nombre}</div>
                    <div className="text-xs text-gray-400">{v.institucion?.tipo}</div>
                    {v.razon_ocultamiento&&<div className="text-xs text-gray-500 mt-1">Razón: {v.razon_ocultamiento}</div>}
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-right">
                    <span className={`badge ${v.visible_para_coordinador?'badge-green':'badge-red'}`}>{v.visible_para_coordinador?'Institución visible':'Institución oculta'}</span>
                    <span className={`badge ${v.ocultar_enlace?'badge-yellow':'badge-green'}`}>{v.ocultar_enlace?'Enlace oculto':'Enlace visible'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="👁️ Configurar visibilidad"
        footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancelar</button><LoadingBtn loading={saving} className="btn btn-p" onClick={guardar}>💾 Guardar</LoadingBtn></>}>
        <FormGroup label="Institución" required>
          <select className="inp" value={form.institucion_id} onChange={e=>setForm(f=>({...f,institucion_id:e.target.value}))}>
            <option value="">— Seleccionar —</option>
            {instituciones.map((i:any)=><option key={i.id} value={i.id}>{i.nombre}</option>)}
          </select>
        </FormGroup>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div><div className="text-sm font-bold text-gray-700">Visible para coordinador</div><div className="text-xs text-gray-400">Si está desactivado, el coordinador ve "No disponible"</div></div>
            <Toggle checked={form.visible_para_coordinador} onChange={v=>setForm(f=>({...f,visible_para_coordinador:v}))}/>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div><div className="text-sm font-bold text-gray-700">Ocultar enlace institucional</div><div className="text-xs text-gray-400">El coordinador verá "Oculto" en lugar del nombre</div></div>
            <Toggle checked={form.ocultar_enlace} onChange={v=>setForm(f=>({...f,ocultar_enlace:v}))}/>
          </div>
        </div>
        <FormGroup label="Razón del ocultamiento (interna)" hint="El coordinador no la verá">
          <Textarea value={form.razon_ocultamiento} onChange={e=>setForm(f=>({...f,razon_ocultamiento:e.target.value}))} rows={2}/>
        </FormGroup>
      </Modal>
    </div>
  )
}
