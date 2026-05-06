'use client'
// src/app/dashboard/admin/sireex/page.tsx
import { useState, useEffect } from 'react'

export default function SireexAdminPage() {
  const [grupos, setGrupos]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [ciclo, setCiclo]     = useState('2026')

  const cargar = async () => {
    setLoading(true)
    const d = await fetch(`/api/sireex/grupos?ciclo=${ciclo}`).then(r => r.json()).catch(() => [])
    setGrupos(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [ciclo])

  const exportar = (grupoId: string) => {
    window.open(`/api/sireex-v5/grupos/exportar?grupo_id=${grupoId}`, '_blank')
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
          <div className="text-xs text-gray-400">Administración y exportación de grupos SIREEX</div>
        </div>
        <div className="flex items-center gap-2">
          <label className="lbl mb-0">Ciclo:</label>
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </header>
      <div className="pc">
        <div className="alert al-i mb-4">
          <div>
            <b>📋 SIREEX:</b> Los técnicos crean los grupos desde su panel.
            El código SIREEX es asignado por MINEDUC y el técnico lo ingresa manualmente.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="card">
            <div className="card-title">
              Grupos del ciclo {ciclo}
              <span className="text-xs text-gray-400 font-normal">{grupos.length} grupo(s)</span>
            </div>
            {grupos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">📤</div>
                <div className="font-semibold">Sin grupos para el ciclo {ciclo}</div>
                <div className="text-sm mt-1">Los técnicos crean grupos desde su panel</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr><th>Código SIREEX</th><th>Técnico</th><th>Etapa</th><th>Sede</th><th>Estudiantes</th><th>Estado</th><th>Acciones</th></tr>
                  </thead>
                  <tbody>
                    {grupos.map((g: any) => (
                      <tr key={g.id}>
                        <td className="font-mono font-bold text-gray-800">{g.codigo}</td>
                        <td>{g.tecnico?.primer_nombre} {g.tecnico?.primer_apellido}</td>
                        <td>{g.etapa?.nombre}</td>
                        <td>{g.sede?.nombre}</td>
                        <td className="text-center font-bold">{g._count?.estudiantes ?? 0}</td>
                        <td><span className={`badge ${ESTADO_COLOR[g.estado] ?? 'badge-gray'}`}>{g.estado}</span></td>
                        <td>
                          <button className="btn btn-p btn-sm" onClick={() => exportar(g.id)}>
                            📥 Exportar CSV
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
