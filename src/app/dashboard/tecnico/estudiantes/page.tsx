'use client'
// src/app/dashboard/tecnico/estudiantes/page.tsx
// COMPLETO: tabla horizontal con filtros por etapa, municipio, departamento, sede
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function TecnicoEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [sedes,         setSedes]         = useState<any[]>([])
  const [departamentos, setDeptos]        = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')

  const [filtro, setFiltro] = useState({
    buscar: '', etapa_id: '', sede_id: '', departamento_id: '', municipio_id: '',
  })
  const [municipiosFiltro, setMunicipiosFiltro] = useState<any[]>([])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ins, et, se, dep] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`).then(r => r.json()).catch(() => ({ data:[] })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
    ])
    setInscripciones(ins.data ?? [])
    setEtapas(Array.isArray(et) ? et : [])
    setSedes(Array.isArray(se) ? se : [])
    setDeptos(Array.isArray(dep) ? dep : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!filtro.departamento_id) { setMunicipiosFiltro([]); return }
    fetch(`/api/municipios?departamento_id=${filtro.departamento_id}`)
      .then(r => r.json()).then(d => setMunicipiosFiltro(Array.isArray(d) ? d : []))
  }, [filtro.departamento_id])

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    const munId = String(e?.municipio?.id ?? '')
    const depId = String(e?.municipio?.departamento_id ?? '')
    return (!filtro.buscar         || nom.includes(filtro.buscar.toLowerCase()))
        && (!filtro.etapa_id       || String((i.etapa as any)?.id) === filtro.etapa_id)
        && (!filtro.sede_id        || (i.sede as any)?.id === filtro.sede_id)
        && (!filtro.departamento_id|| depId === filtro.departamento_id)
        && (!filtro.municipio_id   || munId === filtro.municipio_id)
  })

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      const res = await fetch(`/api/tecnico/exportar-estudiantes?ciclo=${ciclo}`)
      if (!res.ok) {
        const text = await res.text()
        let d: any = {}
        try { d = JSON.parse(text) } catch {}
        flash('❌ ' + (d.error ?? `Error al exportar (HTTP ${res.status})`))
        return
      }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `Estudiantes-${ciclo}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      flash('✅ Excel descargado')
    } catch (e: any) {
      flash('❌ Error de red al exportar: ' + (e?.message ?? ''))
    } finally {
      setDescargando(false)
    }
  }

  const edad = (fn?: string) => fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  const limpiarFiltros = () => setFiltro({ buscar:'', etapa_id:'', sede_id:'', departamento_id:'', municipio_id:'' })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Mis Estudiantes</div>
          <div className="text-xs text-gray-400">{filtrados.length} de {inscripciones.length} · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando || loading}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
          <Link href="/dashboard/tecnico/inscribir" className="btn btn-p">＋ Inscribir</Link>
        </div>
      </header>

      <div className="pc">
        {/* Filtros completos */}
        <div className="card mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase mb-2">Filtrar estudiantes</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-1">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre, código, CUI..." value={filtro.buscar}
                onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} />
            </div>
            <div>
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtro.etapa_id} onChange={e => setFiltro(f => ({ ...f, etapa_id: e.target.value }))}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Sede</label>
              <select className="inp" value={filtro.sede_id} onChange={e => setFiltro(f => ({ ...f, sede_id: e.target.value }))}>
                <option value="">Todas</option>
                {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Departamento</label>
              <select className="inp" value={filtro.departamento_id}
                onChange={e => setFiltro(f => ({ ...f, departamento_id: e.target.value, municipio_id: '' }))}>
                <option value="">Todos</option>
                {departamentos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Municipio</label>
              <select className="inp" value={filtro.municipio_id}
                onChange={e => setFiltro(f => ({ ...f, municipio_id: e.target.value }))}
                disabled={!filtro.departamento_id}>
                <option value="">{!filtro.departamento_id ? 'Elige depto' : 'Todos'}</option>
                {municipiosFiltro.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button className="btn btn-g btn-sm" onClick={limpiarFiltros}>Limpiar filtros</button>
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
              <div className="font-semibold text-gray-600">Sin estudiantes</div>
              {inscripciones.length > 0
                ? <div className="text-sm mt-1">Cambia los filtros para ver resultados</div>
                : <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-block">＋ Inscribir primer estudiante</Link>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1000px]">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    {['Código MINEDUC','Nombre completo','CUI','Edad/Género','Teléfono',
                      'Etapa','Libro','Departamento','Municipio','Sede','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-xs font-extrabold text-gray-500 uppercase tracking-wide border-b whitespace-nowrap">
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
                        className={`border-b hover:bg-blue-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/30'}`}>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {e?.codigo_estudiante ?? <span className="text-gray-300 italic">Sin código</span>}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {e?.primer_nombre} {e?.segundo_nombre} {e?.primer_apellido} {e?.segundo_apellido}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {e?.cui ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs">
                          <div>{edad(e?.fecha_nacimiento)}</div>
                          <div className="text-gray-400">{e?.genero ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{e?.telefono ?? '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-xs font-semibold">{(insc.etapa as any)?.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {insc.version_libro === 'nuevo' ? '📗' : '📙'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">Sacatepéquez</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{(e?.municipio as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{(insc.sede as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>
                            {insc.estado}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-nowrap">
                            <Link href={`/dashboard/tecnico/notas?id=${insc.id}`} className="btn btn-p btn-sm" title="Notas">📝</Link>
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
