'use client'
// src/app/dashboard/director/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

const ESTADO_BADGE: Record<string, string> = {
  pendiente_validacion: 'badge-yellow', validado: 'badge-blue',
  rechazado: 'badge-red', exportado: 'badge-green', anulado: 'badge-gray',
}
const ESTADO_LABEL: Record<string, string> = {
  pendiente_validacion: '⏳ Pendiente', validado: '✔️ Validada',
  rechazado: '❌ Rechazada', exportado: '✅ Exportada', anulado: '🚫 Anulada',
}

export default function ConstanciasDirectorPage() {
  const [lista, setLista]   = useState<any[]>([])
  const [aviso, setAviso]   = useState('')
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
    setAviso(d?.aviso ?? '')
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
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); return }
      flash('✅ Constancia validada')
      cargar()
    } catch (e: any) { flash('❌ No se pudo conectar: ' + (e?.message ?? '')) }
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
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); return }
      flash('✅ Constancia rechazada')
      setRechazandoId(null); setMotivo('')
      cargar()
    } catch (e: any) { flash('❌ No se pudo conectar: ' + (e?.message ?? '')) }
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
      <div className="pc max-w-7xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : aviso ? (
          <div className="alert al-w">⚠️ {aviso}</div>
        ) : lista.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">✅ No hay constancias pendientes de validación</div>
        ) : (
          <div className="card p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-bold">Número</th>
                  <th className="text-left px-4 py-3 font-bold">Estudiante</th>
                  <th className="text-left px-4 py-3 font-bold">Código</th>
                  <th className="text-left px-4 py-3 font-bold">Etapa</th>
                  <th className="text-left px-4 py-3 font-bold">Firmante</th>
                  <th className="text-right px-4 py-3 font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c: any) => {
                  const est = c.datos_estudiante_snapshot ?? {}
                  const firm = c.datos_firmante_snapshot ?? {}
                  const ocupado = procesando === c.id
                  const rechazando = rechazandoId === c.id
                  return (
                    <tr key={c.id} className="border-t border-gray-100 hover:bg-gray-50/60 align-top">
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{c.numero_constancia}</td>
                      <td className="px-4 py-3 font-semibold">{est.nombre_completo}</td>
                      <td className="px-4 py-3 font-mono text-xs">{est.codigo_estudiante}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{est.etapa?.nombre}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {firm.nombre_completo}
                        <div className="text-gray-400">{firm.cargo}</div>
                      </td>
                      <td className="px-4 py-3">
                        {rechazando ? (
                          <div className="space-y-2 min-w-[220px]">
                            <textarea className="inp text-sm" rows={2} placeholder="Motivo del rechazo..."
                              value={motivo} onChange={e => setMotivo(e.target.value)} autoFocus />
                            <div className="flex gap-2 justify-end">
                              <button className="btn btn-d btn-sm" disabled={ocupado} onClick={() => rechazar(c.id)}>
                                {ocupado ? '⏳' : 'Confirmar'}
                              </button>
                              <button className="btn btn-g btn-sm" onClick={() => { setRechazandoId(null); setMotivo('') }}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            <a href={`/api/constancias/${c.id}/imprimir`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm whitespace-nowrap">
                              👁️ Ver
                            </a>
                            <button className="btn btn-p btn-sm whitespace-nowrap" disabled={ocupado} onClick={() => validar(c.id)}>
                              {ocupado ? '⏳' : '✔️ Validar'}
                            </button>
                            <button className="btn btn-d btn-sm whitespace-nowrap" onClick={() => setRechazandoId(c.id)}>
                              ❌ Rechazar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
