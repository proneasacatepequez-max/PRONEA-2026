'use client'
// src/app/dashboard/director/tecnicos/page.tsx
import { useState, useEffect } from 'react'
export default function DirectorTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  useEffect(() => {
    fetch('/api/mis-tecnicos').then(r => r.json()).then(d => setTecnicos(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👨‍🏫 Mis Técnicos</div></header>
      <div className="pc">
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : tecnicos.length === 0 ? <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">👨‍🏫</div><div>Sin técnicos asignados a esta sede</div></div>
          : (
            <div className="tw"><table className="tbl">
              <thead><tr><th>Técnico</th><th>Código</th><th>Teléfono</th><th>Estudiantes activos</th></tr></thead>
              <tbody>
                {tecnicos.map((t: any) => (
                  <tr key={t.id}>
                    <td className="font-semibold">{t.primer_nombre} {t.primer_apellido}</td>
                    <td className="font-mono text-xs">{t.codigo_tecnico ?? '—'}</td>
                    <td>{t.telefono ?? '—'}</td>
                    <td className="text-center font-bold">{t.total_estudiantes ?? 0}</td>
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
