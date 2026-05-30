'use client'
// src/app/dashboard/coordinador/grupos/page.tsx
// CORRECCIÓN: usa /api/sireex/exportar (ruta correcta, no sireex-v5 que no existe)
// También muestra código MINEDUC y permite exportar escalas
import { useState, useEffect } from 'react'

export default function CoordinadorGruposPage() {
  const [grupos,      setGrupos]      = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [ciclo,       setCiclo]       = useState('2026')
  const [descargando, setDescargando] = useState<string | null>(null)
  const [msg,         setMsg]         = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sireex/grupos?ciclo=${ciclo}`)
      .then(r => r.json())
      .then(d => setGrupos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [ciclo])

  const exportarExcel = async (grupoId: string, codigo: string) => {
    setDescargando(grupoId)
    // CORRECCIÓN: ruta correcta /api/sireex/exportar (no sireex-v5)
    const res = await fetch(`/api/sireex/exportar?grupo_id=${grupoId}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      flash('❌ ' + (d.error ?? 'Error al exportar'))
      setDescargando(null)
      return
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `SIREEX-${codigo}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setDescargando(null)
    flash(`✅ Excel descargado: ${codigo}`)
  }

  const ESTADO_COLOR: Record<string, string> = {
    abierto:   'badge-green',
    cerrado:   'badge-yellow',
    exportado: 'badge-blue',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Grupos SIREEX</div>
          <div className="text-xs text-gray-400">Solo lectura · {grupos.length} grupo(s)</div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          🔒 El coordinador puede visualizar y exportar grupos. No puede crear ni modificar grupos.
        </div>

        <div className="card">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📤</div>
              <div className="font-semibold">Sin grupos para el ciclo {ciclo}</div>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Código Interno</th>
                    <th>Código MINEDUC</th>
                    <th>Técnico</th>
                    <th>Etapa</th>
                    <th>Sede</th>
                    <th className="text-center">Estudiantes</th>
                    <th className="text-center">Estado</th>
                    <th className="text-center">Exportar</th>
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g: any) => (
                    <tr key={g.id}>
                      <td className="font-mono font-bold text-sm">{g.codigo}</td>
                      <td className="font-mono text-sm">
                        {g.codigo_mineduc
                          ? <span className="text-blue-600 font-bold">{g.codigo_mineduc}</span>
                          : <span className="text-gray-300 text-xs">Sin asignar</span>}
                      </td>
                      <td className="text-sm">
                        {(g.tecnico as any)?.primer_nombre} {(g.tecnico as any)?.primer_apellido}
                        <div className="text-xs text-gray-400 font-mono">{(g.tecnico as any)?.codigo_tecnico}</div>
                      </td>
                      <td className="text-sm">{(g.etapa as any)?.nombre}</td>
                      <td className="text-sm">{(g.sede as any)?.nombre}</td>
                      <td className="text-center font-extrabold text-lg">{g._count?.estudiantes ?? 0}</td>
                      <td className="text-center">
                        <span className={`badge ${ESTADO_COLOR[g.estado] ?? 'badge-gray'}`}>
                          {g.estado}
                        </span>
                      </td>
                      <td className="text-center">
                        <button
                          className="btn btn-p btn-sm"
                          onClick={() => exportarExcel(g.id, g.codigo)}
                          disabled={descargando === g.id}
                        >
                          {descargando === g.id
                            ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            : '⬇️ Excel'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
