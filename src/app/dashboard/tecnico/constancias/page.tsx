'use client'
// src/app/dashboard/tecnico/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'badge-gray', pendiente_validacion: 'badge-yellow', validado: 'badge-blue',
  rechazado: 'badge-red', exportado: 'badge-green', anulado: 'badge-gray',
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', pendiente_validacion: '⏳ Pendiente', validado: '✔️ Validada',
  rechazado: '❌ Rechazada', exportado: '✅ Exportada', anulado: '🚫 Anulada',
}

export default function ConstanciasPage() {
  // — Generador —
  const [q, setQ]                 = useState('')
  const [buscando, setBuscando]   = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [estSel, setEstSel]       = useState<any>(null)
  const [inscSel, setInscSel]     = useState<any>(null)

  const [firmantes, setFirmantes] = useState<any[]>([])
  const [firmanteId, setFirmanteId] = useState('')
  const [grupoSireexManual, setGrupoSireexManual] = useState('')
  const [modalidadManual, setModalidadManual] = useState('')
  const [generando, setGenerando] = useState(false)

  // — Histórico global (tabla) —
  const [listaGlobal, setListaGlobal] = useState<any[]>([])
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [buscarGlobal, setBuscarGlobal] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [msg, setMsg] = useState('')
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  // Cargar firmantes al montar
  useEffect(() => {
    fetch('/api/firmantes-constancias?activos=1')
      .then(r => r.json())
      .then(d => {
        const arr = Array.isArray(d) ? d : []
        setFirmantes(arr)
        const pred = arr.find((f: any) => f.es_predeterminado)
        if (pred) setFirmanteId(pred.id)
        else if (arr[0]) setFirmanteId(arr[0].id)
      })
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

  const cargarGlobal = useCallback(async () => {
    setLoadingGlobal(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    const d = await fetch(`/api/constancias?${params}`).then(r => r.json()).catch(() => ({ data: [] }))
    setListaGlobal(d?.data ?? [])
    setLoadingGlobal(false)
  }, [filtroEstado])

  useEffect(() => { cargarGlobal() }, [cargarGlobal])

  const elegirEstudiante = (e: any) => {
    setEstSel(e)
    setInscSel(e.inscripcion_activa ?? (e.inscripciones?.[0] ?? null))
    setResultados([]); setQ('')
  }

  const generar = async () => {
    if (!inscSel) { flash('❌ Selecciona una inscripción'); return }
    setGenerando(true)
    try {
      const res = await fetch('/api/constancias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inscripcion_id: inscSel.id,
          firmante_id: firmanteId || undefined,
          grupo_sireex_manual: grupoSireexManual.trim() || undefined,
          modalidad_manual: modalidadManual.trim() || undefined,
        }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `Respuesta inesperada (HTTP ${res.status}): ${texto.slice(0, 200)}` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? `Error al generar (HTTP ${res.status})`)); return }
      flash('✅ Constancia generada — enviada a validación del director')
      // limpiar
      setEstSel(null); setInscSel(null)
      setGrupoSireexManual(''); setModalidadManual('')
      cargarGlobal()
    } catch (e: any) { flash('❌ No se pudo conectar: ' + (e?.message ?? 'error desconocido')) }
    finally { setGenerando(false) }
  }

  const listaFiltradaGlobal = listaGlobal.filter((c: any) => {
    if (!buscarGlobal.trim()) return true
    const est = c.datos_estudiante_snapshot ?? {}
    const txt = `${est.nombre_completo ?? ''} ${est.codigo_estudiante ?? ''} ${c.numero_constancia}`.toLowerCase()
    return txt.includes(buscarGlobal.toLowerCase())
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📄 Constancias de Inscripción</div>
          <div className="text-xs text-gray-400">Genera nuevas constancias y consulta el histórico completo</div>
        </div>
      </header>

      <div className="pc max-w-4xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        {/* ══════════ GENERADOR ══════════ */}
        <div className="card mb-6">
          <div className="card-title text-sm mb-3">➕ Generar nueva constancia</div>

          {!estSel ? (
            <>
              <label className="lbl">1. Buscar estudiante</label>
              <input
                className="inp"
                placeholder="Nombre, código o CUI (mínimo 3 caracteres)..."
                value={q}
                onChange={e => setQ(e.target.value)}
              />
              {buscando && <div className="text-xs text-gray-400 mt-2">Buscando...</div>}
              {resultados.length > 0 && (
                <div className="mt-3 space-y-1 max-h-[40vh] overflow-y-auto">
                  {resultados.map((e: any) => (
                    <button
                      key={e.id}
                      onClick={() => elegirEstudiante(e)}
                      className="w-full text-left px-3 py-2 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50/30 transition-all text-sm"
                    >
                      <div className="font-semibold">
                        {e.primer_apellido} {e.segundo_apellido}, {e.primer_nombre}
                      </div>
                      <div className="text-xs text-gray-400 flex gap-2 flex-wrap mt-0.5">
                        <span className="font-mono">{e.codigo_estudiante}</span>
                        <span>{e.cui_pendiente ? 'CUI pendiente' : e.cui}</span>
                        {e.ultima_etapa && <span>· {e.ultima_etapa.nombre}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {!buscando && q.trim().length >= 3 && resultados.length === 0 && (
                <div className="text-sm text-gray-400 mt-3 text-center">Sin resultados</div>
              )}
            </>
          ) : (
            <>
              {/* Estudiante seleccionado */}
              <div className="flex items-start justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
                <div>
                  <div className="font-bold">
                    {estSel.primer_apellido} {estSel.segundo_apellido}, {estSel.primer_nombre}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {estSel.codigo_estudiante} · {estSel.cui_pendiente ? 'CUI pendiente' : estSel.cui}
                  </div>
                </div>
                <button className="btn btn-g btn-sm" onClick={() => { setEstSel(null); setInscSel(null) }}>
                  ← Cambiar
                </button>
              </div>

              {/* Inscripción si hay varias */}
              {(estSel.inscripciones?.length ?? 0) > 1 && (
                <div className="mb-4">
                  <label className="lbl">2. Inscripción (etapa / ciclo)</label>
                  <select
                    className="inp"
                    value={inscSel?.id ?? ''}
                    onChange={e => setInscSel(estSel.inscripciones.find((i: any) => i.id === e.target.value))}
                  >
                    {estSel.inscripciones.map((i: any) => (
                      <option key={i.id} value={i.id}>
                        {i.etapa?.nombre} — ciclo {i.ciclo_escolar} ({i.estado})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Firmante */}
              <div className="mb-4">
                <label className="lbl">3. Firmante</label>
                {firmantes.length === 0 ? (
                  <div className="text-sm text-orange-600">
                    ⚠️ No hay firmantes configurados — pide al administrador que agregue uno en
                    "Firmantes de Constancias".
                  </div>
                ) : (
                  <select className="inp" value={firmanteId} onChange={e => setFirmanteId(e.target.value)}>
                    {firmantes.map((f: any) => (
                      <option key={f.id} value={f.id}>
                        {f.nombre_completo} — {f.cargo}{f.es_predeterminado ? ' (predeterminado)' : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Grupo SIREEX */}
              <div className="mb-4">
                <label className="lbl">4. Grupo SIREEX (opcional)</label>
                <input
                  className="inp"
                  value={grupoSireexManual}
                  onChange={e => setGrupoSireexManual(e.target.value)}
                  placeholder="Ej: 16504 — déjalo vacío para usar el que ya tenga asignado el sistema"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Escribe solo el código (sin el ciclo) — el ciclo escolar se agrega automáticamente.
                </div>
              </div>

              {/* Modalidad manual */}
              <div className="mb-4">
                <label className="lbl">5. Modalidad (opcional)</label>
                <input
                  className="inp"
                  value={modalidadManual}
                  onChange={e => setModalidadManual(e.target.value)}
                  placeholder="Ej: Presencial, Semipresencial, A distancia — vacío = usa la del sistema"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Si lo dejas vacío, se usará la modalidad registrada en la inscripción.
                </div>
              </div>

              <button
                className="btn btn-p w-full"
                disabled={!inscSel || generando || firmantes.length === 0}
                onClick={generar}
              >
                {generando ? '⏳ Generando...' : '📄 Generar constancia'}
              </button>
            </>
          )}
        </div>

        {/* ══════════ HISTÓRICO COMPLETO ══════════ */}
        <div className="card">
          <div className="card-title text-sm mb-3">📋 Histórico completo de constancias</div>

          <div className="flex gap-3 flex-wrap items-end mb-4">
            <div className="flex-1 min-w-[12rem]">
              <label className="lbl">Buscar</label>
              <input
                className="inp"
                placeholder="Estudiante, código o número de constancia..."
                value={buscarGlobal}
                onChange={e => setBuscarGlobal(e.target.value)}
              />
            </div>
            <div className="w-52">
              <label className="lbl">Estado</label>
              <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(ESTADO_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
          </div>

          {loadingGlobal ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : listaFiltradaGlobal.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Sin constancias que coincidan</div>
          ) : (
            <div className="space-y-2">
              {listaFiltradaGlobal.map((c: any) => {
                const est = c.datos_estudiante_snapshot ?? {}
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 flex-wrap border border-gray-100 rounded-xl px-3 py-2"
                  >
                    <div>
                      <div className="font-mono text-xs text-gray-400">{c.numero_constancia}</div>
                      <div className="font-semibold text-sm">{est.nombre_completo}</div>
                      <div className="text-xs text-gray-400">
                        {est.codigo_estudiante} · {est.etapa?.nombre}
                      </div>
                      <span className={`badge text-xs mt-1 inline-block ${ESTADO_BADGE[c.estado] ?? 'badge-gray'}`}>
                        {ESTADO_LABEL[c.estado] ?? c.estado}
                      </span>
                      {c.estado === 'rechazado' && c.motivo_rechazo && (
                        <div className="text-xs text-red-600 mt-1">Motivo: {c.motivo_rechazo}</div>
                      )}
                    </div>
                    <a
                      href={`/api/constancias/${c.id}/imprimir`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-g btn-sm whitespace-nowrap"
                    >
                      👁️ Ver / Imprimir
                    </a>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
