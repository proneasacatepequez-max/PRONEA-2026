'use client'
// src/app/dashboard/director/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

export default function ConstanciasDirectorPage() {
  const [lista, setLista]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState<string | null>(null)
  const [rechazandoId, setRechazandoId] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const d = await fetch('/api/constancias?estado=pendiente_validacion').then(r => r.json()).catch(() => ({ data: [] }))
    setLista(d?.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const validar = async (id: string) => {
    setProcesando(id)
    try {
      const res = await fetch(`/api/constancias/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'validar' }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `Respuesta inesperada (HTTP ${res.status})` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); return }
      flash('✅ Constancia validada')
      cargar()
    } catch (e: any) { flash('❌ No se pudo conectar con el servidor: ' + (e?.message ?? 'error desconocido')) }
    finally { setProcesando(null) }
  }

  const rechazar = async (id: string) => {
    if (!motivo.trim()) { flash('❌ Escribe el motivo del rechazo'); return }
    setProcesando(id)
    try {
      const res = await fetch(`/api/constancias/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'rechazar', motivo }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `Respuesta inesperada (HTTP ${res.status})` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); return }
      flash('✅ Constancia rechazada — el técnico deberá generar una nueva')
      setRechazandoId(null); setMotivo('')
      cargar()
    } catch (e: any) { flash('❌ No se pudo conectar con el servidor: ' + (e?.message ?? 'error desconocido')) }
    finally { setProcesando(null) }
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📄 Constancias Pendientes de Validación</div>
          <div className="text-xs text-gray-400">{lista.length} pendiente{lista.length === 1 ? '' : 's'}</div>
        </div>
      </header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">✅ No hay constancias pendientes de validación</div>
        ) : (
          <div className="space-y-3">
            {lista.map((c: any) => {
              const est = c.datos_estudiante_snapshot ?? {}
              const firm = c.datos_firmante_snapshot ?? {}
              return (
                <div key={c.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="font-mono text-xs text-gray-400">{c.numero_constancia}</div>
                      <div className="font-bold">{est.nombre_completo}</div>
                      <div className="text-xs text-gray-400">{est.codigo_estudiante} · {est.etapa?.nombre}</div>
                    </div>
                    <a href={`/api/constancias/${c.id}/imprimir`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm whitespace-nowrap">
                      👁️ Ver texto completo
                    </a>
                  </div>
                  <div className="text-xs text-gray-500 mb-3">Firma: {firm.nombre_completo} — {firm.cargo}</div>

                  {rechazandoId === c.id ? (
                    <div className="space-y-2">
                      <textarea className="inp text-sm" rows={2} placeholder="Motivo del rechazo..."
                        value={motivo} onChange={e => setMotivo(e.target.value)} autoFocus />
                      <div className="flex gap-2">
                        <button className="btn btn-d btn-sm" disabled={procesando === c.id} onClick={() => rechazar(c.id)}>
                          {procesando === c.id ? '⏳...' : 'Confirmar rechazo'}
                        </button>
                        <button className="btn btn-g btn-sm" onClick={() => { setRechazandoId(null); setMotivo('') }}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button className="btn btn-p btn-sm" disabled={procesando === c.id} onClick={() => validar(c.id)}>
                        {procesando === c.id ? '⏳...' : '✔️ Validar'}
                      </button>
                      <button className="btn btn-d btn-sm" onClick={() => setRechazandoId(c.id)}>❌ Rechazar</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

