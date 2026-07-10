'use client'
// src/app/dashboard/director/sireex/page.tsx — NUEVA PÁGINA
// Director ve grupos SIREEX de sus técnicos (solo lectura + exportar Excel)
import { useState, useEffect } from 'react'

export default function DirectorSireexPage() {
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

  const exportar = async (grupoId: string, codigo: string) => {
    setDescargando(grupoId)
    const res = await fetch(`/api/sireex/exportar?grupo_id=${grupoId}`)
    if (!res.ok) { flash('❌ Error al exportar'); setDescargando(null); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `SIREEX-${codigo}.xlsx`
    a.click()
    setDescargando(null)
    flash(`✅ Descargado: ${codigo}`)
  }

  const BADGE: Record<string, string> = {
    abierto: 'badge-green', cerrado: 'badge-yellow', exportado: 'badge-blue',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Grupos SIREEX de mis Técnicos</div>
          <div className="text-xs text-gray-400">Solo lectura · {grupos.length} grupo(s)</div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📤</div>
              <div className="font-semibold">Sin grupos para el ciclo {ciclo}</div>
              <div className="text-sm mt-1">Los técnicos deben crear sus grupos desde su dashboard</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-teal-700 to-teal-800 text-white text-left">
                    {['Código Interno','Código MINEDUC','Técnico','Etapa','Sede','Estudiantes','Estado','Exportar'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-teal-600 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g: any, idx: number) => (
                    <tr key={g.id}
                      className={`border-b hover:bg-teal-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-teal-50/20'}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-sm text-teal-700">{g.codigo}</td>
                      <td className="px-3 py-2.5 font-mono text-sm">
                        {g.codigo_mineduc
                          ? <span className="text-blue-600 font-bold">{g.codigo_mineduc}</span>
                          : <span className="text-gray-300 text-xs italic">Sin asignar</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                        {(g.tecnico as any)?.primer_nombre} {(g.tecnico as any)?.primer_apellido}
                        <div className="text-xs text-gray-400 font-mono">{(g.tecnico as any)?.codigo_tecnico}</div>
                      </td>
                      <td className="px-3 py-2.5 text-sm">{(g.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-sm text-gray-600">{(g.sede as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-lg">{g._count?.estudiantes ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${BADGE[g.estado] ?? 'badge-gray'}`}>{g.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          className="btn btn-p btn-sm whitespace-nowrap"
                          onClick={() => exportar(g.id, g.codigo)}
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
