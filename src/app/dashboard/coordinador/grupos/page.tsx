'use client'
// src/app/dashboard/coordinador/grupos/page.tsx
import { useState, useEffect } from 'react'

export default function CoordinadorGruposPage() {
  const [grupos, setGrupos]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ciclo, setCiclo]     = useState('2026')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sireex/grupos?ciclo=${ciclo}`).then(r => r.json())
      .then(d => setGrupos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [ciclo])

  const exportar = (grupoId: string) => window.open(`/api/sireex-v5/grupos/exportar?grupo_id=${grupoId}`, '_blank')

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📤 Grupos SIREEX — Solo lectura</div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </header>
      <div className="pc">
        <div className="alert al-w mb-4">🔒 El coordinador solo puede visualizar y exportar. No puede modificar grupos.</div>
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : grupos.length === 0 ? <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">📤</div><div>Sin grupos para el ciclo {ciclo}</div></div>
          : (
            <div className="tw"><table className="tbl">
              <thead><tr><th>Código SIREEX</th><th>Técnico</th><th>Etapa</th><th>Sede</th><th>Estudiantes</th><th>Estado</th><th>Exportar</th></tr></thead>
              <tbody>
                {grupos.map((g: any) => (
                  <tr key={g.id}>
                    <td className="font-mono font-bold">{g.codigo}</td>
                    <td>{(g.tecnico as any)?.primer_nombre} {(g.tecnico as any)?.primer_apellido}</td>
                    <td>{(g.etapa as any)?.nombre}</td>
                    <td>{(g.sede as any)?.nombre}</td>
                    <td className="text-center font-bold">{g._count?.estudiantes ?? 0}</td>
                    <td><span className={`badge ${g.estado === 'abierto' ? 'badge-green' : g.estado === 'exportado' ? 'badge-blue' : 'badge-yellow'}`}>{g.estado}</span></td>
                    <td><button className="btn btn-p btn-sm" onClick={() => exportar(g.id)}>📥 CSV</button></td>
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
