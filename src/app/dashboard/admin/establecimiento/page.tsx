'use client'
// src/app/dashboard/admin/establecimiento/page.tsx
import { useState, useEffect } from 'react'
import { FormGroup, Input, Textarea, Alert, LoadingBtn, Tabs } from '@/components/ui'

export default function EstablecimientoPage() {
  const [info, setInfo] = useState<any>({})
  const [slider, setSlider] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [tab, setTab] = useState('info')
  const [nuevaImg, setNuevaImg] = useState({ url_imagen:'', titulo:'', orden:0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/establecimiento').then(r=>r.json()),
      fetch('/api/slider').then(r=>r.json()).catch(()=>[]),
    ]).then(([e,s]) => { setInfo(e??{}); setSlider(s??[]) }).finally(() => setLoading(false))
  }, [])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/establecimiento',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(info)})
    const d = await res.json()
    setMsg(res.ok?'✅ Guardado':'❌ '+d.error)
    setTimeout(()=>setMsg(''),3000); setSaving(false)
  }

  const addSlider = async () => {
    if (!nuevaImg.url_imagen) return
    const res = await fetch('/api/slider',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(nuevaImg)})
    if (res.ok) { const d=await res.json(); setSlider(s=>[...s,{...nuevaImg,id:d.id,activo:true}]); setNuevaImg({url_imagen:'',titulo:'',orden:0}) }
  }

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setInfo((i:any)=>({...i,[k]:e.target.value}))

  if (loading) return <div className="ap"><header className="topbar"><div className="page-title">Establecimiento</div></header><div className="pc text-gray-400 py-20 text-center">Cargando...</div></div>

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">🏛️ Configuración del Establecimiento</div>
        <LoadingBtn loading={saving} className="btn btn-p" onClick={save}>💾 Guardar cambios</LoadingBtn>
      </header>
      <div className="pc max-w-4xl">
        {msg&&<Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}
        <Tabs tabs={[{id:'info',label:'📋 Información'},{id:'logos',label:'🖼️ Logos'},{id:'slider',label:'🎬 Slider Login'}]} active={tab} onChange={setTab}/>

        {tab==='info'&&(
          <div className="card">
            <div className="card-title">Información institucional</div>
            <div className="fg2">
              <FormGroup label="Nombre completo" required><Input value={info.nombre_completo??''} onChange={F('nombre_completo')}/></FormGroup>
              <FormGroup label="Nombre corto"><Input value={info.nombre_corto??''} onChange={F('nombre_corto')}/></FormGroup>
              <FormGroup label="Director(a)"><Input value={info.director_nombre??''} onChange={F('director_nombre')} placeholder="Lic. Juan García"/></FormGroup>
              <FormGroup label="Título del director"><Input value={info.director_titulo??''} onChange={F('director_titulo')} placeholder="Director Departamental"/></FormGroup>
              <FormGroup label="Teléfono"><Input value={info.telefono??''} onChange={F('telefono')}/></FormGroup>
              <FormGroup label="WhatsApp"><Input value={info.whatsapp??''} onChange={F('whatsapp')}/></FormGroup>
              <FormGroup label="Correo institucional"><Input type="email" value={info.correo??''} onChange={F('correo')}/></FormGroup>
              <FormGroup label="Facebook"><Input value={info.facebook??''} onChange={F('facebook')}/></FormGroup>
              <FormGroup label="Departamento"><Input value={info.departamento??''} onChange={F('departamento')}/></FormGroup>
              <FormGroup label="Municipio"><Input value={info.municipio??''} onChange={F('municipio')}/></FormGroup>
            </div>
            <FormGroup label="Dirección"><Textarea value={info.direccion??''} onChange={F('direccion')}/></FormGroup>
            <FormGroup label="Horario de atención"><Textarea rows={2} value={info.horario_atencion??''} onChange={F('horario_atencion')} placeholder="Lunes a Viernes 8:00-16:00 / Sábados 8:00-12:00"/></FormGroup>
          </div>
        )}

        {tab==='logos'&&(
          <div className="card">
            <div className="card-title">Logos institucionales</div>
            <div className="alert al-i mb-4">💡 Ingresa URL pública (Supabase Storage o Google Drive vista directa).</div>
            {[
              {k:'logo_url',label:'Logo PRONEA principal',desc:'Aparece en login y sidebar'},
              {k:'logo_mineduc_url',label:'Logo MINEDUC',desc:'Aparece en escalas y reportes'},
              {k:'logo_digeex_url',label:'Logo DIGEEX',desc:'Aparece en documentos oficiales'},
              {k:'logo_establecimiento_url',label:'Logo del Establecimiento',desc:'Logo local de la sede'},
            ].map(({k,label,desc}) => (
              <div key={k} className="flex items-start gap-4 mb-4 p-3 border border-gray-100 rounded-xl">
                <div className="w-16 h-16 rounded-lg border border-gray-200 flex items-center justify-center bg-gray-50 flex-shrink-0 overflow-hidden">
                  {info[k] ? <img src={info[k]} alt={label} className="w-full h-full object-contain p-1"/> : <span className="text-gray-300 text-3xl">🖼️</span>}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-700 mb-0.5">{label}</div>
                  <div className="text-xs text-gray-400 mb-2">{desc}</div>
                  <Input value={info[k]??''} onChange={F(k)} placeholder="https://..."/>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==='slider'&&(
          <div className="card">
            <div className="card-title">Imágenes del slider (login)</div>
            <div className="alert al-i mb-4">💡 Imágenes de fondo rotativas en el panel del login. Recomendado: 1200×800px.</div>
            <div className="space-y-2 mb-5">
              {slider.map((img:any) => (
                <div key={img.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <img src={img.url_imagen} alt={img.titulo??''} className="w-16 h-10 object-cover rounded"/>
                  <div className="flex-1"><div className="text-sm font-semibold text-gray-700">{img.titulo??'Sin título'}</div><div className="text-xs text-gray-400 truncate">{img.url_imagen}</div></div>
                  <span className={`badge ${img.activo?'badge-green':'badge-gray'}`}>{img.activo?'Activo':'Inactivo'}</span>
                </div>
              ))}
            </div>
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <div className="text-sm font-bold text-gray-600 mb-3">➕ Agregar imagen</div>
              <FormGroup label="URL de la imagen"><Input value={nuevaImg.url_imagen} onChange={e=>setNuevaImg(n=>({...n,url_imagen:e.target.value}))} placeholder="https://..."/></FormGroup>
              <div className="fg2">
                <FormGroup label="Título (opcional)"><Input value={nuevaImg.titulo} onChange={e=>setNuevaImg(n=>({...n,titulo:e.target.value}))}/></FormGroup>
                <FormGroup label="Orden"><Input type="number" value={nuevaImg.orden} onChange={e=>setNuevaImg(n=>({...n,orden:parseInt(e.target.value)||0}))}/></FormGroup>
              </div>
              <button className="btn btn-p" onClick={addSlider}>➕ Agregar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
