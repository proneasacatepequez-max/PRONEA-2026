'use client'
// src/app/dashboard/coordinador/exportar/page.tsx
import { useState, useEffect } from 'react'

export default function CoordinadorExportarPage() {
  const [grupos, setGrupos]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ciclo, setCiclo]     = useState('2026')
  const [exportando, setExportando] = useState<string|null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sireex/grupos?ciclo=${ciclo}`).then(r => r.json())
      .then(d => setGrupos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [ciclo])

  const exportarTodos = async () => {
    for (const g of grupos) {
      setExportando(g.codigo)
      window.open(`/api/sireex-v5/grupos/exportar?grupo_id=${g.id}`, '_blank')
      await new Promise(r => setTimeout(r, 800))
    }
    setExportando(null)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📥 Exportar CSV SIREEX</div>
        <div className="flex items-center gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          {grupos.length > 0 && (
            <button className="btn btn-p" onClick={exportarTodos} disabled={!!exportando}>
              {exportando ? `Exportando ${exportando}...` : '📥 Exportar todos'}
            </button>
          )}
        </div>
      </header>
      <div className="pc">
        <div className="alert al-i mb-4">
          Cada CSV contiene todos los estudiantes del grupo con su código SIREEX, notas finales y estado de promoción.
        </div>
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : grupos.length === 0 ? <div className="text-center py-10 text-gray-400">Sin grupos para exportar</div>
          : (
            <div className="tw"><table className="tbl">
              <thead><tr><th>Código</th><th>Técnico</th><th>Etapa</th><th>Estudiantes</th><th>Estado</th><th>Descargar</th></tr></thead>
              <tbody>
                {grupos.map((g: any) => (
                  <tr key={g.id} className={exportando === g.codigo ? 'bg-blue-50' : ''}>
                    <td className="font-mono font-bold">{g.codigo}</td>
                    <td>{(g.tecnico as any)?.primer_nombre} {(g.tecnico as any)?.primer_apellido}</td>
                    <td>{(g.etapa as any)?.nombre}</td>
                    <td className="text-center">{g._count?.estudiantes ?? 0}</td>
                    <td><span className={`badge ${g.estado === 'abierto' ? 'badge-green' : g.estado === 'exportado' ? 'badge-blue' : 'badge-yellow'}`}>{g.estado}</span></td>
                    <td>
                      <button className="btn btn-p btn-sm" onClick={() => window.open(`/api/sireex-v5/grupos/exportar?grupo_id=${g.id}`, '_blank')}>
                        📥 Descargar CSV
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  )
}
