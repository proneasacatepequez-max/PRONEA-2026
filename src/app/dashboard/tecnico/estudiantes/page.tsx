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
  const [modalEditarInsc, setModalEditarInsc] = useState<any>(null)
  const [formEditInsc,    setFormEditInsc]    = useState({ etapa_id: '', version_libro: 'nuevo' })
  const [guardandoInsc,   setGuardandoInsc]   = useState(false)

  const [filtro, setFiltro] = useState({
    buscar: '', etapa_id: '', sede_id: '', estado: 'en_curso',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const abrirEditarInsc = (insc: any) => {
    setFormEditInsc({
      etapa_id: String((insc.etapa as any)?.id ?? ''),
      version_libro: insc.version_libro ?? 'nuevo',
    })
    setModalEditarInsc(insc)
  }

  const guardarEditarInsc = async () => {
    if (!modalEditarInsc) return
    setGuardandoInsc(true)
    try {
      const res = await fetch('/api/inscripciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalEditarInsc.id,
          etapa_id: parseInt(formEditInsc.etapa_id),
          version_libro: formEditInsc.version_libro,
        }),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al actualizar')); return }
      flash('✅ Etapa/versión actualizada correctamente')
      setModalEditarInsc(null)
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setGuardandoInsc(false) }
  }

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

  // Estadística: hombres/mujeres por etapa, sobre lo que está filtrado actualmente
  const statsPorEtapa = (() => {
    const mapa = new Map<string, { nombre: string; masculino: number; femenino: number; otro: number }>()
    for (const i of filtrados) {
      const e = i.estudiante as any
      const nombreEtapa = (i.etapa as any)?.nombre ?? 'Sin etapa'
      if (!mapa.has(nombreEtapa)) mapa.set(nombreEtapa, { nombre: nombreEtapa, masculino: 0, femenino: 0, otro: 0 })
      const fila = mapa.get(nombreEtapa)!
      const g = (e?.genero ?? '').toLowerCase()
      if (g === 'masculino') fila.masculino++
      else if (g === 'femenino') fila.femenino++
      else fila.otro++
    }
    return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre))
  })()
  const totalMasc = statsPorEtapa.reduce((a, s) => a + s.masculino, 0)
  const totalFem  = statsPorEtapa.reduce((a, s) => a + s.femenino, 0)
  const totalOtro = statsPorEtapa.reduce((a, s) => a + s.otro, 0)

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
            {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
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

        {/* Estadística: hombres/mujeres por etapa */}
        {!loading && filtrados.length > 0 && (
          <div className="card mb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm text-gray-700">📊 Estudiantes por etapa y género</div>
              <div className="flex gap-3 text-xs font-bold">
                <span className="text-blue-600">♂ {totalMasc} hombres</span>
                <span className="text-pink-600">♀ {totalFem} mujeres</span>
                {totalOtro > 0 && <span className="text-gray-400">— {totalOtro} sin especificar</span>}
                <span className="text-gray-500">Total: {filtrados.length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 text-xs font-bold uppercase">Etapa</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center text-blue-600">♂ Hombres</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center text-pink-600">♀ Mujeres</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {statsPorEtapa.map(fila => (
                    <tr key={fila.nombre} className="border-b">
                      <td className="px-3 py-1.5 font-semibold">{fila.nombre}</td>
                      <td className="px-3 py-1.5 text-center text-blue-600 font-bold">{fila.masculino}</td>
                      <td className="px-3 py-1.5 text-center text-pink-600 font-bold">{fila.femenino}</td>
                      <td className="px-3 py-1.5 text-center font-bold">{fila.masculino + fila.femenino + fila.otro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

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
                            <button
                              className="btn btn-s btn-sm" title="Editar etapa / versión de libro"
                              onClick={() => abrirEditarInsc(insc)}>
                              ✏️
                            </button>
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

      {/* Modal editar etapa/versión de libro */}
      {modalEditarInsc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">✏️ Editar etapa / versión de libro</h3>
              <button onClick={() => setModalEditarInsc(null)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-600">
                {(modalEditarInsc.estudiante as any)?.primer_nombre} {(modalEditarInsc.estudiante as any)?.primer_apellido}
              </div>
              <div className="fg">
                <label className="lbl">Etapa correcta</label>
                <select className="inp" value={formEditInsc.etapa_id}
                  onChange={e => setFormEditInsc(f => ({ ...f, etapa_id: e.target.value }))}>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Versión de libro</label>
                <select className="inp" value={formEditInsc.version_libro}
                  onChange={e => setFormEditInsc(f => ({ ...f, version_libro: e.target.value }))}>
                  <option value="nuevo">📗 Nuevo</option>
                  <option value="viejo">📙 Viejo</option>
                </select>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                ⚠️ Solo corrige esto si el estudiante fue inscrito por error en una etapa o versión equivocada — no crea una nueva inscripción.
              </p>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalEditarInsc(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardarEditarInsc} disabled={guardandoInsc}>
                {guardandoInsc ? '⏳ Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

