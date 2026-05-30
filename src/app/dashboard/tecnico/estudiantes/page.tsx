'use client'
// src/app/dashboard/tecnico/estudiantes/page.tsx
// CORRECCIONES:
// 1. Botón "Descargar Excel" de todos los estudiantes
// 2. Indicador visual si el estudiante fue inscrito por un enlace
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TecnicoEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [buscar,        setBuscar]        = useState('')
  const [filtroEtapa,   setFiltroEtapa]   = useState('')
  const [filtroSede,    setFiltroSede]    = useState('')
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

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

  // Sedes únicas para el filtro
  const sedesUnicas = [...new Map(
    inscripciones.map(i => [(i.sede as any)?.id, (i.sede as any)])
  ).values()].filter(Boolean)

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''}`.toLowerCase()
    return (!buscar       || nom.includes(buscar.toLowerCase()))
        && (!filtroEtapa  || String((i.etapa as any)?.id) === filtroEtapa)
        && (!filtroSede   || (i.sede as any)?.id === filtroSede)
  })

  const descargarExcel = async () => {
    setDescargando(true)
    const res = await fetch(`/api/tecnico/exportar-estudiantes?ciclo=${ciclo}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      flash('❌ ' + (d.error ?? 'Error al descargar'))
      setDescargando(false)
      return
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `Mis-Estudiantes-${ciclo}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    setDescargando(false)
  }

  const calcularEdad = (fn?: string) => {
    if (!fn) return '—'
    const diff = new Date().getFullYear() - new Date(fn).getFullYear()
    return `${diff} años`
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Mis Estudiantes</div>
          <div className="text-xs text-gray-400">
            {filtrados.length} estudiante(s) · ciclo {ciclo}
            {filtrados.length < inscripciones.length && ` (filtrado de ${inscripciones.length})`}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando || loading}>
            {descargando
              ? <span className="flex items-center gap-1"><span className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />Descargando...</span>
              : '⬇️ Excel'}
          </button>
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
            <div className="w-44">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
                <option value="">Todas las etapas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Sede</label>
              <select className="inp" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="">Todas las sedes</option>
                {sedesUnicas.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroEtapa(''); setFiltroSede('') }}>Limpiar</button>
            </div>
          </div>
        </div>

        <div className="card">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold text-gray-600">Sin estudiantes</div>
              {inscripciones.length > 0
                ? <div className="text-sm mt-1">No hay resultados para los filtros aplicados</div>
                : <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-block">＋ Inscribir primer estudiante</Link>}
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-28">Código</th>
                    <th>Estudiante</th>
                    <th className="w-20">Edad</th>
                    <th className="w-32">Etapa</th>
                    <th className="w-20">Versión</th>
                    <th>Sede</th>
                    <th className="w-36 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((i: any) => {
                    const e       = i.estudiante as any
                    const tecnico = i.tecnico    as any
                    // Si el técnico de la inscripción no es el mismo que el usuario actual,
                    // fue inscrito por un enlace o técnico diferente
                    const esDeEnlace = i.creado_por && (i.creado_por !== i.tecnico_id)
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs text-gray-500">{e?.codigo_estudiante}</td>
                        <td>
                          <div className="font-semibold text-sm">
                            {e?.primer_nombre} {e?.primer_apellido}
                          </div>
                          <div className="text-xs text-gray-400">
                            {e?.telefono}
                            {(e?.municipio as any)?.nombre && ` · ${(e.municipio as any).nombre}`}
                          </div>
                          <div className="flex gap-1 mt-0.5 flex-wrap">
                            {i.tiene_ajuste_discapacidad && <span className="badge badge-yellow text-xs">♿ Ajuste</span>}
                            {esDeEnlace && <span className="badge badge-purple text-xs">🔗 Por enlace</span>}
                          </div>
                        </td>
                        <td className="text-sm text-gray-500">{calcularEdad(e?.fecha_nacimiento)}</td>
                        <td className="text-sm">{(i.etapa as any)?.nombre ?? '—'}</td>
                        <td>
                          <span className={`badge text-xs ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {i.version_libro === 'nuevo' ? '📗' : '📙'} {i.version_libro}
                          </span>
                        </td>
                        <td className="text-sm text-gray-500">{(i.sede as any)?.nombre ?? '—'}</td>
                        <td>
                          <div className="flex gap-1 justify-center">
                            <Link href={`/dashboard/tecnico/notas?id=${i.id}`}
                              className="btn btn-p btn-sm" title="Registrar notas">
                              📝
                            </Link>
                            <Link href={`/dashboard/tecnico/escalas?id=${i.id}`}
                              className="btn btn-g btn-sm" title="Ver escala">
                              📊
                            </Link>
                            <Link href={`/dashboard/tecnico/ajustes?id=${i.id}`}
                              className="btn btn-g btn-sm" title="Adecuaciones">
                              ♿
                            </Link>
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
