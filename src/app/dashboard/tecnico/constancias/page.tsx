'use client'
// src/app/dashboard/tecnico/constancias/page.tsx
import { useState, useEffect, useCallback } from 'react'

const ESTADO_BADGE: Record<string, string> = {
  borrador: 'badge-gray', pendiente_validacion: 'badge-yellow', validado: 'badge-blue',
  rechazado: 'badge-red', exportado: 'badge-green', anulado: 'badge-gray',
}
const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', pendiente_validacion: '⏳ Pendiente de validación', validado: '✔️ Validada — lista para exportar',
  rechazado: '❌ Rechazada', exportado: '✅ Exportada', anulado: '🚫 Anulada',
}

export default function ConstanciasPage() {
  const [tab, setTab] = useState<'generar' | 'historico'>('generar')

  // — Generación —
  const [q, setQ]                 = useState('')
  const [buscando, setBuscando]   = useState(false)
  const [resultados, setResultados] = useState<any[]>([])
  const [estSel, setEstSel]       = useState<any>(null)
  const [inscSel, setInscSel]     = useState<any>(null)

  const [firmantes, setFirmantes] = useState<any[]>([])
  const [firmanteId, setFirmanteId] = useState('')
  const [grupoSireexManual, setGrupoSireexManual] = useState('')
  const [modalidadManual, setModalidadManual] = useState('')   // ← NUEVO
  const [generando, setGenerando] = useState(false)
  const [historialEst, setHistorialEst] = useState<any[]>([])

  // — Histórico completo (tabla) —
  const [listaGlobal, setListaGlobal] = useState<any[]>([])
  const [loadingGlobal, setLoadingGlobal] = useState(true)
  const [buscarGlobal, setBuscarGlobal] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const [msg, setMsg] = useState('')
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  useEffect(() => {
    fetch('/api/firmantes-constancias?activos=1').then(r => r.json())
      .then(d => { setFirmantes(Array.isArray(d) ? d : []); const pred = (Array.isArray(d) ? d : []).find((f: any) => f.es_predeterminado); if (pred) setFirmanteId(pred.id) })
      .catch(() => {})
  }, [])

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

  const cargarHistorialEstudiante = useCallback(async (estudianteId: string) => {
    const d = await fetch(`/api/constancias?estudiante_id=${estudianteId}`).then(r => r.json()).catch(() => ({ data: [] }))
    setHistorialEst(d?.data ?? [])
  }, [])

  const cargarGlobal = useCallback(async () => {
    setLoadingGlobal(true)
    const params = new URLSearchParams()
    if (filtroEstado) params.set('estado', filtroEstado)
    const d = await fetch(`/api/constancias?${params}`).then(r => r.json()).catch(() => ({ data: [] }))
    setListaGlobal(d?.data ?? [])
    setLoadingGlobal(false)
  }, [filtroEstado])

  useEffect(() => { if (tab === 'historico') cargarGlobal() }, [tab, cargarGlobal])

  const elegirEstudiante = (e: any) => {
    setEstSel(e)
    setInscSel(e.inscripcion_activa ?? (e.inscripciones?.[0] ?? null))
    setResultados([]); setQ('')
    cargarHistorialEstudiante(e.id)
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
          modalidad_manual: modalidadManual.trim() || undefined,  // ← NUEVO
        }),
      })
      const texto = await res.text()
      let d: any = {}
      try { d = texto ? JSON.parse(texto) : {} } catch { d = { error: `Respuesta inesperada del servidor (HTTP ${res.status}): ${texto.slice(0, 200)}` } }
      if (!res.ok) { flash('❌ ' + (d.error ?? `Error al generar (HTTP ${res.status})`)); return }
      flash('✅ Constancia generada — enviada a validación del director')
      cargarHistorialEstudiante(estSel.id)
    } catch (e: any) { flash('❌ No se pudo conectar con el servidor: ' + (e?.message ?? 'error
