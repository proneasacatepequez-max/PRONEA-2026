'use client'
// src/app/dashboard/admin/sireex/page.tsx
// FIX: colores verdes, exportar Excel (no CSV), tabla horizontal completa
import { useState, useEffect, useCallback } from 'react'

export default function SireexAdminPage() {
  const [grupos,      setGrupos]      = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [ciclo,       setCiclo]       = useState('2026')
  const [buscar,      setBuscar]      = useState('')
  const [descargando, setDescargando] = useState<string | null>(null)
  const [msg,         setMsg]         = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const d = await fetch(`/api/sireex/grupos?ciclo=${ciclo}`)
      .then(r => r.json()).catch(() => [])
    setGrupos(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar] )

  const exportarExcel = async (grupoId: string, codigo: string) => {
    setDescargando(grupoId)
    // FIX: ruta correcta /api/sireex/exportar (no sireex-v5)
    const res = await fetch(`/api/sireex/exportar?grupo_id=${grupoId}`)
    if (!res.ok) { flash('❌ Error al exportar'); setDescargando(null); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `SIREEX-${codigo}-notas.xlsx`
    a.click()
    URL.revokeObjectURL(a.href)
    setDescargando(null)
    flash(`✅ Descargado: ${codigo}`)
  }

  const filtrados = grupos.filter(g => {
    if (!buscar) return true
    const txt = `${g.codigo} ${g.codigo_mineduc ?? ''} ${(g.tecnico as any)?.primer_apellido ?? ''} ${(g.etapa as any)?.nombre ?? ''} ${(g.sede as any)?.nombre ?? ''}`.toLowerCase()
    return txt.includes(buscar.toLowerCase())
  })

  const BADGE: Record<string, string> = {
    abierto: 'badge-green', cerrado: 'badge-yellow', exportado: 'badge-blue',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Grupos SIREEX — Administración</div>
          <div className="text-xs text-gray-400">{filtrados.length} grupo(s) · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          📋 Los técnicos crean grupos desde su panel. El código SIREEX es asignado por MINEDUC y el técnico lo ingresa manualmente.
          El Excel incluye notas finales por área y estado de promoción.
        </div>

        <div className="card mb-4">
          <input className="inp" placeholder="🔍 Buscar por código, técnico, etapa o sede..."
            value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📤</div>
              <div className="font-semibold">Sin grupos para el ciclo {ciclo}</div>
              <div className="text-sm mt-1">Los técnicos crean grupos desde su panel</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  {/* FIX: colores verdes como en la vista del director */}
                  <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-left">
                    {['#','Código Interno','Código MINEDUC','Técnico','Etapa','Sede','Nombre','Estudiantes','Estado','Exportar Excel'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-green-600 last:border-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((g: any, idx: number) => (
                    <tr key={g.id}
                      className={`border-b hover:bg-green-50 transition-colors ${idx%2===0?'bg-white':'bg-emerald-50/30'}`}>
                      <td className="px-3 py-2.5 text-xs text-gray-400">{idx+1}</td>
                      <td className="px-3 py-2.5 font-mono font-bold text-sm text-green-700">{g.codigo}</td>
                      <td className="px-3 py-2.5 font-mono text-sm">
                        {g.codigo_mineduc
                          ? <span className="text-blue-600 font-bold">{g.codigo_mineduc}</span>
                          : <span className="text-gray-300 text-xs italic">Sin asignar</span>}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="text-sm font-semibold">
                          {(g.tecnico as any)?.primer_nombre} {(g.tecnico as any)?.primer_apellido}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{(g.tecnico as any)?.codigo_tecnico}</div>
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold whitespace-nowrap">{(g.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{(g.sede as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{g.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-xl">{g._count?.estudiantes ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${BADGE[g.estado] ?? 'badge-gray'}`}>{g.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          className="btn btn-p btn-sm whitespace-nowrap"
                          onClick={() => exportarExcel(g.id, g.codigo)}
                          disabled={descargando === g.id}
                        >
                          {descargando === g.id
                            ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                            : '⬇️ Excel + Notas'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-50 font-bold">
                    <td colSpan={7} className="px-3 py-2 text-right text-sm text-gray-600">Total grupos:</td>
                    <td className="px-3 py-2 text-center text-green-700">{filtrados.length}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
