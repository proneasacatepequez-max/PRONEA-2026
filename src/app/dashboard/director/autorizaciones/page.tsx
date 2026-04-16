'use client'
// src/app/dashboard/director/autorizaciones/page.tsx
import { useState, useEffect } from 'react'
import { Alert, Spinner, Empty, LoadingBtn, Modal, FormGroup, Select, Input } from '@/components/ui'
import { PERMISOS_SISTEMA } from '@/types'

export default function AutorizacionesDirectorPage() {
  const [auths, setAuths] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState({ enlace_id:'', permiso:'ingresar_notas_enlace', fecha_fin:'', observaciones:'' })
  const [enlaces, setEnlaces] = useState<any[]>([])

  const cargar = async () => {
    setLoading(true)
    const [a, e] = await Promise.all([
      fetch('/api/autorizaciones').then(r=>r.json()),
      fetch('/api/mis-enlaces').then(r=>r.json()).catch(()=>[]),
    ])
    setAuths(Array.isArray(a)?a:[])
    setEnlaces(Array.isArray(e)?e:[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const crear = async () => {
    if (!form.enlace_id || !form.permiso) { setMsg('❌ Enlace y permiso requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/autorizaciones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)})
    const d = await res.json()
    setMsg(res.ok?'✅ Autorización creada. El admin debe confirmarla.':'❌ '+d.error)
    setTimeout(()=>setMsg(''),4000)
    setModal(false); cargar(); setSaving(false)
  }

  const revocar = async (id: string) => {
    const res = await fetch('/api/autorizaciones',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,accion:'revocar'})})
    setMsg(res.ok?'✅ Revocada':'❌ Error')
    setTimeout(()=>setMsg(''),3000); cargar()
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div><div className="page-title">🔐 Autorizar a mis Enlaces</div><div className="text-xs text-gray-400">El admin debe confirmar para que el enlace pueda ejecutar la acción</div></div>
        <button className="btn btn-p" onClick={()=>setModal(true)}>＋ Nueva autorización</button>
      </header>
      <div className="pc max-w-3xl">
        {msg&&<Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}
        <div className="alert al-i mb-4">
          <div>
            <b>📋 Flujo de autorización:</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>1️⃣ Tú creas la autorización (esta página)</div>
              <div>2️⃣ El administrador la confirma</div>
              <div>3️⃣ El enlace puede ejecutar la acción</div>
              <div className="text-red-700 font-bold mt-1">⚠️ Sin confirmación del admin, el enlace NO puede actuar.</div>
            </div>
          </div>
        </div>
        {loading?<Spinner/>:auths.length===0?<Empty msg="Sin autorizaciones creadas aún"/>:(
          <div className="space-y-3">
            {auths.map((a:any)=>{
              const vencida = a.fecha_fin && new Date(a.fecha_fin)<new Date()
              const enlace = a.enlace??{}
              return (
                <div key={a.id} className={`card border-l-4 ${a.autorizado_por_admin&&!vencida?'border-l-green-500':!a.autorizado_por_admin?'border-l-yellow-400':'border-l-red-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {!a.autorizado_por_admin&&<span className="badge badge-yellow">⏳ Esperando admin</span>}
                        {a.autorizado_por_admin&&!vencida&&<span className="badge badge-green">✅ Activa</span>}
                        {vencida&&<span className="badge badge-red">⌛ Vencida</span>}
                        <span className="text-sm font-bold text-gray-800">{a.permiso?.replace(/_/g,' ')}</span>
                      </div>
                      <div className="text-sm text-gray-600"><b>Enlace:</b> {enlace.primer_nombre} {enlace.primer_apellido}</div>
                      {a.fecha_fin&&<div className="text-xs text-gray-400">Vence: {new Date(a.fecha_fin).toLocaleDateString('es-GT')}</div>}
                    </div>
                    {a.activo&&<button className="btn btn-d btn-xs" onClick={()=>revocar(a.id)}>Revocar</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title="＋ Nueva autorización"
        footer={<><button className="btn btn-g" onClick={()=>setModal(false)}>Cancelar</button><LoadingBtn loading={saving} className="btn btn-p" onClick={crear}>Crear</LoadingBtn></>}>
        <div className="alert al-w mb-3 text-xs">El administrador debe confirmar esta autorización para que surta efecto.</div>
        <FormGroup label="Enlace institucional" required>
          <Select value={form.enlace_id} onChange={e=>setForm(f=>({...f,enlace_id:e.target.value}))}>
            <option value="">— Seleccionar —</option>
            {enlaces.map((e:any)=><option key={e.id} value={e.id}>{e.primer_nombre} {e.primer_apellido}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Permiso a delegar" required>
          <Select value={form.permiso} onChange={e=>setForm(f=>({...f,permiso:e.target.value}))}>
            {PERMISOS_SISTEMA.map(p=><option key={p} value={p}>{p.replace(/_/g,' ')}</option>)}
          </Select>
        </FormGroup>
        <FormGroup label="Fecha de vencimiento (opcional)" hint="Dejar vacío = sin límite">
          <Input type="date" value={form.fecha_fin} onChange={e=>setForm(f=>({...f,fecha_fin:e.target.value}))}/>
        </FormGroup>
        <FormGroup label="Observaciones">
          <Input value={form.observaciones} onChange={e=>setForm(f=>({...f,observaciones:e.target.value}))} placeholder="Opcional..."/>
        </FormGroup>
      </Modal>
    </div>
  )
}
