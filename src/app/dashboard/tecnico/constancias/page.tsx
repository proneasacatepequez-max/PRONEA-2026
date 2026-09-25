'use client'
// src/app/dashboard/tecnico/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

export default function ConstanciasPage() {
  const [q, setQ]                 = useState('')
  const [buscando, setBuscando]   = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [estSel, setEstSel]       = useState<any>(null)
  const [inscSel, setInscSel]     = useState<any>(null)

  const [firmantes, setFirmantes] = useState<any[]>([])
  const [firmanteId, setFirmanteId] = useState('')
  const [generando, setGenerando] = useState(false)

  const [historial, setHistorial] = useState<any[]>([])
  const [msg, setMsg] = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    fetch('/api/firmantes-constancias?activos=1').then(r => r.json())
      .then(d => { setFirmantes(Array.isArray(d) ? d : []); const pred = (Array.isArray(d) ? d : []).find((f: any) => f.es_predeterminado); if (pred) setFirmanteId(pred.id) })
      .catch(() => {})
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    if (q.trim().length < 3) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(q.trim())}`)
        .then(r => r.json())
        .then(d => setResultados(d?.encontrados ?? []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 350)
    return () => clearTimeout(t)
  }, [q])

  const cargarHistorial = useCallback(async (estudianteId: string) => {
    const d = await fetch(`/api/constancias?estudiante_id=${estudianteId}`).then(r => r.json()).catch(() => ({ data: [] }))
    setHistorial(d?.data ?? [])
  }, [])

  const elegirEstudiante = (e: any) => {
    setEstSel(e)
    setInscSel(e.inscripcion_activa ?? (e.inscripciones?.[0] ?? null))
    setResultados([]); setQ('')
    cargarHistorial(e.id)
  }

  const generar = async () => {
    if (!inscSel) { flash('❌ Selecciona una inscripción'); return }
    setGenerando(true)
    try {
      const res = await fetch('/api/constancias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscripcion_id: inscSel.id, firmante_id: firmanteId || undefined }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `Respuesta inesperada del servidor (HTTP ${res.status}): ${texto.slice(0, 200)}` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? `Error al generar (HTTP ${res.status})`)); return }
      flash('✅ Constancia generada — enviada a validación del director')
      cargarHistorial(estSel.id)
    } catch (e: any) { flash('❌ No se pudo conectar con el servidor: ' + (e?.message ?? 'error desconocido')) }
    finally { setGenerando(false) }
  }

  const ESTADO_BADGE: Record<string, string> = {
    borrador: 'badge-gray', pendiente_validacion: 'badge-yellow', validado: 'badge-blue',
    rechazado: 'badge-red', exportado: 'badge-green', anulado: 'badge-gray',
  }
  const ESTADO_LABEL: Record<string, string> = {
    borrador: 'Borrador', pendiente_validacion: '⏳ Pendiente de validación', validado: '✔️ Validada — lista para exportar',
    rechazado: '❌ Rechazada', exportado: '✅ Exportada', anulado: '🚫 Anulada',
  }

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📄 Constancias de Inscripción</div></header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        {!estSel ? (
          <div className="card">
            <div className="card-title text-sm">🔍 Buscar estudiante</div>
            <input className="inp" placeholder="Nombre, código o CUI (mínimo 3 caracteres)..."
              value={q} onChange={e => setQ(e.target.value)} autoFocus />
            {buscando && <div className="text-xs text-gray-400 mt-2">Buscando...</div>}
            {resultados.length > 0 && (
              <div className="mt-3 space-y-1 max-h-[50vh] overflow-y-auto">
                {resultados.map((e: any) => (
                  <button key={e.id} onClick={() => elegirEstudiante(e)}
                    className="w-full text-left px-3 py-2 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50/30 transition-all text-sm">
                    <div className="font-semibold">{e.primer_apellido} {e.segundo_apellido}, {e.primer_nombre}</div>
                    <div className="text-xs text-gray-400 flex gap-2 flex-wrap mt-0.5">
                      <span className="font-mono">{e.codigo_estudiante}</span>
                      <span>{e.cui_pendiente ? 'CUI pendiente' : e.cui}</span>
                      {e.ultima_etapa && <span>· {e.ultima_etapa.nombre}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="card mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-bold">{estSel.primer_apellido} {estSel.segundo_apellido}, {estSel.primer_nombre}</div>
                <div className="text-xs text-gray-400 font-mono">{estSel.codigo_estudiante} · {estSel.cui_pendiente ? 'CUI pendiente' : estSel.cui}</div>
              </div>
              <button className="btn btn-g btn-sm" onClick={() => { setEstSel(null); setInscSel(null); setHistorial([]) }}>← Cambiar</button>
            </div>

            {(estSel.inscripciones?.length ?? 0) > 1 && (
              <div className="card mb-4">
                <label className="lbl">Inscripción (etapa / ciclo)</label>
                <select className="inp" value={inscSel?.id ?? ''} onChange={e => setInscSel(estSel.inscripciones.find((i: any) => i.id === e.target.value))}>
                  {estSel.inscripciones.map((i: any) => (
                    <option key={i.id} value={i.id}>{i.etapa?.nombre} — ciclo {i.ciclo_escolar} ({i.estado})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="card mb-4">
              <label className="lbl">Firmante</label>
              {firmantes.length === 0 ? (
                <div className="text-sm text-orange-600">⚠️ No hay firmantes configurados — pide al administrador que agregue uno en "Firmantes de Constancias".</div>
              ) : (
                <select className="inp" value={firmanteId} onChange={e => setFirmanteId(e.target.value)}>
                  {firmantes.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.nombre_completo} — {f.cargo}{f.es_predeterminado ? ' (predeterminado)' : ''}</option>
                  ))}
                </select>
              )}
            </div>

            <button className="btn btn-p w-full mb-6" disabled={!inscSel || generando || firmantes.length === 0} onClick={generar}>
              {generando ? '⏳ Generando...' : '📄 Generar constancia'}
            </button>

            <div className="card">
              <div className="card-title text-sm">📋 Historial de constancias</div>
              {historial.length === 0 ? (
                <div className="text-sm text-gray-400 text-center py-4">Sin constancias generadas todavía</div>
              ) : (
                <div className="space-y-2">
                  {historial.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 border border-gray-100 rounded-xl px-3 py-2">
                      <div>
                        <div className="text-sm font-mono font-bold">{c.numero_constancia}</div>
                        <span className={`badge text-xs ${ESTADO_BADGE[c.estado] ?? 'badge-gray'}`}>{ESTADO_LABEL[c.estado] ?? c.estado}</span>
                        {c.estado === 'rechazado' && c.motivo_rechazo && (
                          <div className="text-xs text-red-600 mt-1">Motivo: {c.motivo_rechazo}</div>
                        )}
                      </div>
                      <a href={`/api/constancias/${c.id}/imprimir`} target="_blank" rel="noreferrer" className="btn btn-g btn-sm whitespace-nowrap">
                        👁️ Ver / Imprimir
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
