'use client'
// src/app/dashboard/enlace/estudiantes/page.tsx
// FIX: muestra estudiantes de la sede del enlace, tabla horizontal
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function EnlaceEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [miPerfil,      setMiPerfil]      = useState<any>(null)
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')
  const [filtro, setFiltro] = useState({ buscar: '', etapa_id: '' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  useEffect(() => {
    fetch('/api/mi-perfil').then(r => r.json())
      .then(d => setMiPerfil(d?.perfil ?? null))
      .catch(() => {})
    fetch('/api/etapas').then(r => r.json())
      .then(d => setEtapas(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  const cargar = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ ciclo, estado: 'en_curso' })
    if (filtro.etapa_id) params.set('etapa_id', filtro.etapa_id)
    const d = await fetch(`/api/inscripciones?${params}`)
      .then(r => r.json()).catch(() => ({ data: [] }))
    setInscripciones(d.data ?? [])
    setLoading(false)
  }, [ciclo, filtro.etapa_id])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscripciones.filter(i => {
    if (!filtro.buscar.trim()) return true
    const e   = i.estudiante as any
    const txt = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    return txt.includes(filtro.buscar.toLowerCase())
  })

  const descargarExcel = async () => {
    setDescargando(true)
    try {
      const res = await fetch(`/api/tecnico/exportar-estudiantes?ciclo=${ciclo}`)
      if (!res.ok) { flash('❌ Error al exportar'); return }
      const blob = await res.blob()
      const a    = document.createElement('a')
      a.href     = URL.createObjectURL(blob)
      a.download = `Estudiantes-Enlace-${ciclo}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
      flash('✅ Excel descargado')
    } catch { flash('❌ Error de red') }
    finally { setDescargando(false) }
  }

  const sedeNombre   = (miPerfil?.sede as any)?.nombre ?? null
  const tecnicoNombre = (miPerfil as any)?.tecnico
    ? `${(miPerfil as any).tecnico.primer_nombre} ${(miPerfil as any).tecnico.primer_apellido}`
    : null

  const edad = (fn?: string) => fn ? String(new Date().getFullYear() - new Date(fn).getFullYear()) + ' a.' : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Estudiantes de mi Institución</div>
          <div className="text-xs text-gray-400">
            {sedeNombre ? `Sede: ${sedeNombre}` : '⚠️ Sin sede asignada'}
            {tecnicoNombre && ` · Técnico: ${tecnicoNombre}`}
            {' · '}{filtrados.length} estudiante(s) · ciclo {ciclo}
          </div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
          <Link href="/dashboard/enlace/inscribir" className="btn btn-p">＋ Inscribir</Link>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-3 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {!sedeNombre && (
          <div className="alert al-w mb-4">
            ⚠️ Tu cuenta no tiene sede asignada. Pide al director o administrador que la configure
            en <b>Director → Técnicos y Enlaces → pestaña "Enlaces"</b>.
          </div>
        )}

        <div className="alert al-i mb-4 text-sm">
          📌 Solo lectura — para ingresar notas el técnico responsable debe autorizar al enlace
          desde <b>Director → Autorizar Enlaces</b>.
        </div>

        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre, código, CUI..."
                value={filtro.buscar} onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} />
            </div>
            <div className="w-44">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtro.etapa_id} onChange={e => setFiltro(f => ({ ...f, etapa_id: e.target.value }))}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => setFiltro({ buscar:'', etapa_id:'' })}>Limpiar</button>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold text-gray-600">
                {filtro.buscar || filtro.etapa_id ? 'Sin resultados' : 'Sin estudiantes en tu institución'}
              </div>
              {!filtro.buscar && !filtro.etapa_id && (
                <Link href="/dashboard/enlace/inscribir" className="btn btn-p mt-4 inline-block">
                  ＋ Inscribir estudiante
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1700px]">
                <thead>
                  <tr className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-left">
                    {[
                      'Código MINEDUC','Nombre completo','CUI','Género','Edad','Fecha nacimiento',
                      'Teléfono','Estado civil','Etapa','Versión',
                      'Municipio inscripción','Municipio residencia','Departamento residencia',
                      'Técnico a cargo','Enlace a cargo','Estado',
                    ].map(h => (
                      <th key={h}
                        className="px-3 py-2.5 text-xs font-bold uppercase whitespace-nowrap border-r border-orange-500 last:border-0">
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
                        className={`border-b hover:bg-orange-50/40 transition-colors ${idx%2===0?'bg-white':'bg-amber-50/20'}`}>
                        <td className="px-3 py-2 font-mono text-xs font-bold text-orange-700 whitespace-nowrap">
                          {e?.codigo_estudiante ?? '—'}
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre} {e?.segundo_nombre}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500 whitespace-nowrap">
                          {e?.cui ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap capitalize">
                          {e?.genero ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{edad(e?.fecha_nacimiento)}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {e?.fecha_nacimiento ? new Date(e.fecha_nacimiento).toLocaleDateString('es-GT') : '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{e?.telefono ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(e?.estado_civil as any)?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">
                          {(insc.etapa as any)?.nombre}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>
                            {insc.version_libro==='nuevo'?'📗':'📙'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(insc.sede as any)?.municipio?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(e?.municipio as any)?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                          {(e?.municipio as any)?.departamento?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {miPerfil?.primer_nombre} {miPerfil?.primer_apellido}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.estado==='en_curso'?'badge-green':'badge-gray'}`}>
                            {insc.estado}
                          </span>
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

