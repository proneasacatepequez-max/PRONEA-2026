'use client'
// src/app/dashboard/tecnico/estudiantes/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EstudiantesTecnicoPage() {
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [buscar, setBuscar]           = useState('')
  const [total, setTotal]             = useState(0)

  const cargar = async () => {
    setLoading(true)
    const p = new URLSearchParams({ ciclo: '2026' })
    if (buscar) p.set('buscar', buscar)
    const d = await fetch(`/api/estudiantes?${p}`).then(r => r.json()).catch(() => ({ data: [], total: 0 }))
    setEstudiantes(d.data ?? [])
    setTotal(d.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Mis Estudiantes</div>
          <div className="text-xs text-gray-400">Ciclo 2026 — {total} estudiante(s)</div>
        </div>
        <Link href="/dashboard/tecnico/inscribir" className="btn btn-p">＋ Inscribir estudiante</Link>
      </header>
      <div className="pc">
        <div className="card mb-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="lbl">Buscar por nombre, código o CUI</label>
              <input className="inp" value={buscar} onChange={e => setBuscar(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && cargar()} placeholder="Buscar..." />
            </div>
            <div className="flex items-end gap-2">
              <button className="btn btn-p" onClick={cargar}>Buscar</button>
              <button className="btn btn-g" onClick={() => { setBuscar(''); setTimeout(cargar, 50) }}>Limpiar</button>
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold">Sin estudiantes</div>
              <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-flex">＋ Inscribir el primero</Link>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr><th>Código</th><th>Estudiante</th><th>CUI</th><th>Etapa</th><th>Libro</th><th>Estado</th><th>Acciones</th></tr>
                </thead>
                <tbody>
                  {estudiantes.map((i: any) => {
                    const e = i.estudiante
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs text-gray-500">{e?.codigo_estudiante}</td>
                        <td>
                          <div className="font-semibold text-gray-800">{e?.primer_nombre} {e?.primer_apellido}</div>
                          <div className="text-xs text-gray-400">{e?.telefono}</div>
                        </td>
                        <td className="text-xs text-gray-500">{e?.cui_pendiente ? 'Pendiente' : (e?.cui ?? '—')}</td>
                        <td className="text-sm">{(i.etapa as any)?.nombre}</td>
                        <td>
                          <span className={`badge ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {i.version_libro === 'nuevo' ? '📗' : '📙'} {i.version_libro}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${i.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>{i.estado}</span>
                        </td>
                        <td>
                          <Link href={`/dashboard/tecnico/notas?id=${i.id}`} className="btn btn-p btn-sm">📝 Notas</Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
