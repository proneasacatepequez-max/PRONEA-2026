'use client'
// src/app/dashboard/admin/autorizaciones/page.tsx
import { useState, useEffect } from 'react'
import { Badge, Alert, Spinner, Empty, LoadingBtn, Modal, FormGroup, Input, Select } from '@/components/ui'
import { ETAPAS_LISTA } from '@/types'

export default function AutorizacionesAdminPage() {
  const [auths, setAuths] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string|null>(null)
  const [msg, setMsg] = useState('')
  const [filtro, setFiltro] = useState<'todos'|'pendientes'|'activos'>('pendientes')

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/autorizaciones').then(r=>r.json())
    setAuths(Array.isArray(d)?d:[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const accion = async (id: string, accion: 'confirmar'|'revocar') => {
    setProcessing(id)
    const res = await fetch('/api/autorizaciones', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ id, accion })
    })
    const d = await res.json()
    setMsg(res.ok ? `✅ Autorización ${accion==='confirmar'?'confirmada':'revocada'}` : `❌ ${d.error}`)
    setTimeout(() => setMsg(''), 3000)
    cargar()
    setProcessing(null)
  }

  const filtrados = auths.filter((a:any) => {
    if (filtro==='pendientes') return !a.autorizado_por_admin && a.activo
    if (filtro==='activos')   return a.autorizado_por_admin && a.activo
    return true
  })
  const pendientes = auths.filter((a:any) => !a.autorizado_por_admin && a.activo).length

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">✅ Autorizaciones de Directores</div>
          <div className="text-xs text-gray-400">Confirma o revoca permisos delegados por directores a enlaces</div>
        </div>
      </header>
      <div className="pc max-w-4xl">
        {msg && <Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}

        {pendientes > 0 && (
          <div className="alert al-w mb-4">
            <b>⚠️ {pendientes} autorización(es) pendientes de tu confirmación.</b>
            <span className="ml-2 text-sm">Sin tu confirmación el enlace no puede ejecutar la acción.</span>
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {[['todos','Todas'],['pendientes',`Pendientes (${auths.filter((a:any)=>!a.autorizado_por_admin&&a.activo).length})`],['activos','Confirmadas']] as const}
          {([['todos','Todas'],['pendientes',`Pendientes (${pendientes})`],['activos','Confirmadas']] as [string,string][]).map(([v,l]) => (
            <button key={v} onClick={() => setFiltro(v as any)}
              className={`btn btn-sm ${filtro===v?'btn-p':'btn-g'}`}>{l}</button>
          ))}
        </div>

        {loading ? <Spinner/> : filtrados.length===0 ? <Empty msg="No hay autorizaciones en esta categoría"/> : (
          <div className="space-y-3">
            {filtrados.map((a:any) => {
              const confirmada = !!a.autorizado_por_admin
              const enlace = a.enlace ?? {}
              const vencida = a.fecha_fin && new Date(a.fecha_fin) < new Date()
              return (
                <div key={a.id} className={`card border-l-4 ${confirmada&&!vencida?'border-l-green-500':!confirmada?'border-l-yellow-400':'border-l-red-300'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {!confirmada && <span className="badge badge-yellow">⏳ Pendiente confirmación</span>}
                        {confirmada && !vencida && <span className="badge badge-green">✅ Activa</span>}
                        {vencida && <span className="badge badge-red">⌛ Vencida</span>}
                        <span className="text-sm font-extrabold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">{a.permiso?.replace(/_/g,' ')}</span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <b>Enlace:</b> {enlace.primer_nombre} {enlace.primer_apellido}
                        {enlace.institucion && <span className="text-gray-400 ml-1">— {enlace.institucion.nombre}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Vigencia: {new Date(a.fecha_inicio).toLocaleDateString('es-GT')} → {a.fecha_fin ? new Date(a.fecha_fin).toLocaleDateString('es-GT') : 'Sin límite'}
                        {a.observaciones && <span className="ml-2">| Nota: {a.observaciones}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {!confirmada && (
                        <LoadingBtn loading={processing===a.id} className="btn btn-s btn-sm"
                          onClick={() => accion(a.id,'confirmar')}>✅ Confirmar</LoadingBtn>
                      )}
                      {a.activo && (
                        <LoadingBtn loading={processing===a.id} className="btn btn-d btn-sm"
                          onClick={() => accion(a.id,'revocar')}>🚫 Revocar</LoadingBtn>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
