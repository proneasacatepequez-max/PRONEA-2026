'use client'
// src/app/dashboard/admin/configuracion/page.tsx
import { useState, useEffect } from 'react'
import { Alert, Spinner, Toggle, LoadingBtn } from '@/components/ui'

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string|null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    fetch('/api/configuracion').then(r=>r.json()).then(d=>setConfig(d.raw??[])).finally(()=>setLoading(false))
  }, [])

  const actualizar = async (parametro: string, valor: string) => {
    setSaving(parametro)
    const res = await fetch('/api/configuracion',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({parametro,valor})})
    const d = await res.json()
    if (res.ok) setConfig(c=>c.map((cc:any)=>cc.parametro===parametro?{...cc,valor}:cc))
    setMsg(res.ok?`✅ ${parametro} actualizado`:`❌ ${d.error}`)
    setTimeout(()=>setMsg(''),3000); setSaving(null)
  }

  const BOOLEAN_PARAMS = ['documentos_obligatorios','documentos_visibles','documentos_visibles_estudiante','documentos_visibles_tecnico','permisos_delegados_activos']

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">⚙️ Configuración del Sistema</div></header>
      <div className="pc max-w-3xl">
        {msg&&<Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}
        {loading?<Spinner/>:(
          <div className="space-y-2">
            {config.map((c:any) => (
              <div key={c.parametro} className="card flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-800">{c.parametro.replace(/_/g,' ')}</div>
                  <div className="text-xs text-gray-400">{c.descripcion}</div>
                </div>
                {BOOLEAN_PARAMS.includes(c.parametro)
                  ? <div className="flex items-center gap-2">
                      <span className={`badge ${c.valor==='true'?'badge-green':'badge-red'} text-xs`}>{c.valor==='true'?'Activo':'Inactivo'}</span>
                      {saving===c.parametro
                        ? <div className="w-5 h-5 border-2 border-pronea border-t-transparent rounded-full animate-spin"/>
                        : <Toggle checked={c.valor==='true'} onChange={v=>actualizar(c.parametro,String(v))}/>
                      }
                    </div>
                  : <div className="flex items-center gap-2">
                      <input className="inp w-24 text-center" defaultValue={c.valor}
                        onBlur={e=>{if(e.target.value!==c.valor) actualizar(c.parametro,e.target.value)}}/>
                    </div>
                }
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
