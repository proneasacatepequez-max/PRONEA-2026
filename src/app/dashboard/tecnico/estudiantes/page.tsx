'use client'
// src/app/dashboard/tecnico/estudiantes/page.tsx
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TecnicoEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [buscar,     setBuscar]     = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [ciclo,      setCiclo]      = useState('2026')
  const [etapas,     setEtapas]     = useState<any[]>([])

  const cargar = async () => {
    setLoading(true)
    const [ins, et] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
    ])
    setInscripciones(ins.data ?? [])
    setEtapas(Array.isArray(et) ? et : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [ciclo])

  const filtrados = inscripciones.filter(i => {
    const e = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''}`.toLowerCase()
    return (!buscar || nom.includes(buscar.toLowerCase()))
        && (!filtroEtapa || (i.etapa as any)?.id === parseInt(filtroEtapa))
  })

  const calcularEdad = (fn?: string) => {
    if (!fn) return '—'
    const edad = new Date().getFullYear() - new Date(fn).getFullYear()
    return `${edad} años`
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Mis Estudiantes</div>
          <div className="text-xs text-gray-400">{filtrados.length} estudiante(s) · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <Link href="/dashboard/tecnico/inscribir" className="btn btn-p">＋ Inscribir</Link>
        </div>
      </header>

      <div className="pc">
        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-40">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre o código..." value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-48">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
                <option value="">Todas las etapas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroEtapa('') }}>Limpiar</button>
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold">Sin estudiantes</div>
              <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-block">＋ Inscribir estudiante</Link>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Código</th><th>Estudiante</th><th>Edad</th>
                    <th>Etapa</th><th>Versión</th><th>Sede</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((i: any) => {
                    const e = i.estudiante as any
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs">{e?.codigo_estudiante}</td>
                        <td>
                          <div className="font-semibold">{e?.primer_nombre} {e?.primer_apellido}</div>
                          <div className="text-xs text-gray-400">{e?.telefono} · {(e?.municipio as any)?.nombre}</div>
                          {i.tiene_ajuste_discapacidad && <span className="badge badge-yellow text-xs">♿ Con ajuste</span>}
                        </td>
                        <td className="text-sm text-gray-500">{calcularEdad(e?.fecha_nacimiento)}</td>
                        <td className="text-sm">{(i.etapa as any)?.nombre}</td>
                        <td><span className={`badge text-xs ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{i.version_libro}</span></td>
                        <td className="text-sm text-gray-600">{(i.sede as any)?.nombre}</td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            <Link href={`/dashboard/tecnico/notas?id=${i.id}`} className="btn btn-p btn-sm">📝 Notas</Link>
                            <Link href={`/dashboard/tecnico/escalas?id=${i.id}`} className="btn btn-g btn-sm">📊</Link>
                            <Link href={`/dashboard/tecnico/ajustes?id=${i.id}`} className="btn btn-g btn-sm">♿</Link>
                          </div>
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
