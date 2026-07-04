'use client'
// src/app/dashboard/tecnico/estudiantes/page.tsx
// FIX: muestra estudiantes propios + los de enlaces vinculados
// Tabla horizontal completa con filtros por etapa, sede, municipio
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function TecnicoEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [sedes,         setSedes]         = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')

  const [filtro, setFiltro] = useState({
    buscar: '', etapa_id: '', sede_id: '', estado: 'en_curso',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ ciclo, estado: filtro.estado || 'en_curso' })
    if (filtro.etapa_id) params.set('etapa_id', filtro.etapa_id)
    if (filtro.sede_id)  params.set('sede_id',  filtro.sede_id)

    const [insRes, et, se] = await Promise.all([
      fetch(`/api/inscripciones?${params}`)
        .then(async r => ({ ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) }))
        .catch(() => ({ ok: false, status: 0, body: { error: 'Error de conexión' } })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
    ])

    if (!insRes.ok) {
      flash('❌ ' + (insRes.body?.error ?? `Error al cargar estudiantes (${insRes.status})`))
      setInscripciones([])
    } else {
      setInscripciones(insRes.body?.data ?? [])
    }
    setEtapas(Array.isArray(et) ? et : [])
    setSedes(Array.isArray(se) ? se : [])
    setLoading(false)
  }, [ciclo, filtro.etapa_id, filtro.sede_id, filtro.estado])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscripciones.filter(i => {
    if (!filtro.buscar.trim()) return true
    const e   = i.estudiante as any
    const txt = `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.segundo_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    return txt.includes(filtro.buscar.toLowerCase())
  })

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      const res = await fetch(`/api/tecnico/exportar-estudiantes?ciclo=${ciclo}`)
      if (!res.ok) {
        const text = await res.text()
        let d: any = {}
        try { d = JSON.parse(text) } catch {}
        flash('❌ ' + (d.error ?? `Error al exportar (${res.status})`))
        return
      }
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `Estudiantes-${ciclo}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      flash('✅ Excel descargado')
    } catch (e: any) {
      flash('❌ Error: ' + (e?.message ?? ''))
    } finally {
      setDescargando(false)
    }
  }

  const limpiar = () => setFiltro(p => ({ ...p, buscar:'', etapa_id:'', sede_id:'' }))

  const edad = (fn?: string) => {
    if (!fn) return '—'
    return String(new Date().getFullYear() - new Date(fn).getFullYear()) + ' a.'
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Mis Estudiantes</div>
          <div className="text-xs text-gray-400">
            {filtrados.length} de {inscripciones.length} inscripciones · ciclo {ciclo}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {msg && <span className={`text-xs font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
          <Link href="/dashboard/tecnico/inscribir" className="btn btn-p">＋ Inscribir</Link>
        </div>
      </header>

      <div className="pc">
        {/* Filtros */}
        <div className="card mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-2">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre, código, CUI..."
                value={filtro.buscar} onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtro.etapa_id}
                onChange={e => setFiltro(f => ({ ...f, etapa_id: e.target.value }))}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Sede</label>
              <select className="inp" value={filtro.sede_id}
                onChange={e => setFiltro(f => ({ ...f, sede_id: e.target.value }))}>
                <option value="">Todas</option>
                {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Estado</label>
              <select className="inp" value={filtro.estado}
                onChange={e => setFiltro(f => ({ ...f, estado: e.target.value }))}>
                <option value="en_curso">En curso</option>
                <option value="completado">Completado</option>
                <option value="todos">Todos</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-g btn-sm" onClick={limpiar}>Limpiar filtros</button>
          </div>
        </div>

        {/* Tabla horizontal */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold text-gray-600">
                {filtro.buscar || filtro.etapa_id || filtro.sede_id
                  ? 'Sin resultados para los filtros aplicados'
                  : 'Sin inscripciones en este ciclo'}
              </div>
              {!filtro.buscar && !filtro.etapa_id && !filtro.sede_id && (
                <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-block">
                  ＋ Inscribir primer estudiante
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-left">
                    {[
                      'Código MINEDUC','Nombre completo','CUI','Edad',
                      'Teléfono','Etapa','Versión','Municipio','Sede',
                      'Técnico','Estado','Acciones'
                    ].map(h => (
                      <th key={h}
                        className="px-3 py-2.5 text-xs font-bold uppercase whitespace-nowrap border-r border-blue-700 last:border-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((insc: any, idx: number) => {
                    const e = insc.estudiante as any
                    return (
                      <tr key={insc.id}
                        className={`border-b hover:bg-blue-50/40 transition-colors ${idx%2===0?'bg-white':'bg-sky-50/20'}`}>
                        <td className="px-3 py-2 font-mono text-xs font-bold text-blue-700 whitespace-nowrap">
                          {e?.codigo_estudiante ?? <span className="text-gray-300 italic">Sin código</span>}
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre} {e?.segundo_nombre}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {e?.cui ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {edad(e?.fecha_nacimiento)}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">
                          {e?.telefono ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">
                          {(insc.etapa as any)?.nombre}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>
                            {insc.version_libro==='nuevo'?'📗 Nuevo':'📙 Viejo'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(e?.municipio as any)?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(insc.sede as any)?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                          <div className="text-gray-400 font-mono text-xs">{(insc.tecnico as any)?.codigo_tecnico}</div>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado==='en_curso'?'badge-green':insc.estado==='completado'?'badge-blue':'badge-gray'}`}>
                            {insc.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-nowrap">
                            <Link href={`/dashboard/tecnico/notas?id=${insc.id}`}
                              className="btn btn-p btn-sm" title="Registrar notas">
                              📝
                            </Link>
                            <Link href={`/dashboard/tecnico/ajustes?id=${insc.id}`}
                              className="btn btn-g btn-sm" title="Adecuaciones curriculares">
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

