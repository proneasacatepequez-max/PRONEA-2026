'use client'
// src/app/dashboard/enlace/estudiantes/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'
export default function EnlaceEstudiantesPage() {
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [total, setTotal]             = useState(0)
  useEffect(() => {
    fetch('/api/estudiantes?ciclo=2026').then(r => r.json())
      .then(d => { setEstudiantes(d.data ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [])
  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">🎓 Estudiantes de mi institución</div>
        <span className="text-sm text-gray-400">{total} estudiante(s)</span>
      </header>
      <div className="pc">
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : estudiantes.length === 0 ? <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">🎓</div><div>Sin estudiantes</div></div>
          : (
            <div className="tw"><table className="tbl">
              <thead><tr><th>Código</th><th>Nombre</th><th>Etapa</th><th>Libro</th><th>Estado</th><th>Notas</th></tr></thead>
              <tbody>
                {estudiantes.map((i: any) => {
                  const e = i.estudiante as any
                  return (
                    <tr key={i.id}>
                      <td className="font-mono text-xs">{e?.codigo_estudiante}</td>
                      <td className="font-semibold">{e?.primer_nombre} {e?.primer_apellido}</td>
                      <td>{(i.etapa as any)?.nombre}</td>
                      <td><span className={`badge ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{i.version_libro}</span></td>
                      <td><span className={`badge ${i.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>{i.estado}</span></td>
                      <td><Link href={`/dashboard/enlace/notas?id=${i.id}`} className="btn btn-p btn-sm">📝</Link></td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          )}
        </div>
      </div>
    </div>
  )
}
