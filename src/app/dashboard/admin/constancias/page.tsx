'use client'
// src/app/dashboard/admin/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'badge-gray', pendiente_validacion: 'badge-yellow', validado: 'badge-blue',
  rechazado: 'badge-red', exportado: 'badge-green', anulado: 'badge-gray',
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', pendiente_validacion: '⏳ Pendiente', validado: '✔️ Validada',
  rechazado: '❌ Rechazada', exportado: '✅ Exportada', anulado: '🚫 Anulada',
}

export default function ConstanciasAdminPage() {
  const [lista, setLista]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [buscar, setBuscar]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [msg, setMsg] = useState('')
  const [anulandoId, setAnulandoId] = useState<string | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    const d = await fetch(`/api/constancias?${params}`).then(r => r.json()).catch(() => ({ data: [] }))
    setLista(d?.data ?? [])
    setLoading(false)
  }, [filtroEstado])

  useEffect(() => { cargar() }, [cargar])

  const anular = async (id: string) => {
    if (!confirm('¿Anular esta constancia? Esta acción no se puede deshacer.')) return
    setAnulandoId(id)
    try {
      const res = await fetch(`/api/constancias/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'anular' }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `HTTP ${res.status}` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al anular')); return }
      flash('✅ Constancia anulada')
      cargar()
    } catch (e: any) { flash('❌ No se pudo conectar: ' + (e?.message ?? '')) }
    finally { setAnulandoId(null) }
  }

  const filtrados = lista.filter((c: any) => {
    if (!buscar.trim()) return true
    const est = c.datos_estudiante_snapshot ?? {}
    const txt = `${est.nombre_completo ?? ''} ${est.codigo_estudiante ?? ''} ${c.numero_constancia}`.toLowerCase()
    return txt.includes(buscar.toLowerCase())
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📄 Constancias Generadas</div>
          <div className="text-xs text-gray-400">{filtrados.length} de {lista.length} · histórico completo del sistema</div>
        </div>
      </header>
      <div className="pc max-w-4xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        <div className="card mb-4 flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[12rem]">
            <label className="lbl">Buscar</label>
            <input className="inp" placeholder="Estudiante, código o número de constancia..."
              value={buscar} onChange={e => setBuscar(e.target.value)} />
          </div>
          <div className="w-52">
            <label className="lbl">Estado</label>
            <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">Sin constancias que coincidan</div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((c: any) => {
              const est = c.datos_estudiante_snapshot ?? {}
              return (
                <div key={c.id} className="card flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-mono text-xs text-gray-400">{c.numero_constancia}</div>
                    <div className="font-semibold text-sm">{est.nombre_completo}</div>
                    <div className="text-xs text-gray-400">{est.codigo_estudiante} · {est.etapa?.nombre}</div>
                    <span className={`badge text-xs mt-1 inline-block ${ESTADO_BADGE[c.estado] ?? 'badge-gray'}`}>{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                    {c.estado === 'rechazado' && c.motivo_rechazo && (
                      <div className="text-xs text-red-600 mt-1">Motivo: {c.motivo_rechazo}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a href={`/api/constancias/${c.id}/imprimir`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm whitespace-nowrap">
                      👁️ Ver / Imprimir
                    </a>
                    {c.estado !== 'anulado' && (
                      <button className="btn btn-d btn-sm" disabled={anulandoId === c.id} onClick={() => anular(c.id)}>
                        {anulandoId === c.id ? '⏳...' : '🚫 Anular'}
                      </button>
                    )}
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
