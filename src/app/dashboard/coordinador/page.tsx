'use client'
// src/app/dashboard/coordinador/page.tsx
// FIX: conteo real de estudiantes, listado funciona con búsqueda
import { useState, useEffect, useCallback } from 'react'

export default function CoordinadorPage() {
  const [stats,     setStats]     = useState({ estudiantes: 0, tecnicos: 0, sedes: 0, municipios_insc: 0, municipios_res: 0 })
  const [tecnicos,  setTecnicos]  = useState<any[]>([])
  const [inscrips,  setInscrips]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [ciclo,     setCiclo]     = useState('2026')
  const [buscar,    setBuscar]    = useState('')
  const [filtroMun, setFiltroMun] = useState('')
  const [filtroEt,  setFiltroEt]  = useState('')
  const [etapas,    setEtapas]    = useState<any[]>([])
  const [miPerfil,  setMiPerfil]  = useState<any>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ins, tec, et, perfil] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`).then(r => r.json()).catch(() => ({ data: [] })),
      fetch(`/api/mis-tecnicos?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/mi-perfil').then(r => r.json()).catch(() => null),
    ])

    const data = ins.data ?? []
    setInscrips(data)
    setTecnicos(Array.isArray(tec) ? tec : [])
    setEtapas(Array.isArray(et) ? et : [])
    setMiPerfil(perfil?.perfil ?? null)

    // Stats reales
    const munsInsc  = new Set(data.map((i: any) => (i.sede as any)?.id).filter(Boolean))
    const munsRes   = new Set(data.map((i: any) => (i.estudiante as any)?.municipio?.nombre).filter(Boolean))
    const sedesUniq = new Set(data.map((i: any) => (i.sede as any)?.id).filter(Boolean))

    setStats({
      estudiantes:     data.length,
      tecnicos:        Array.isArray(tec) ? tec.length : 0,
      sedes:           sedesUniq.size,
      municipios_insc: munsInsc.size,
      municipios_res:  munsRes.size,
    })
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscrips.filter(i => {
    const e   = i.estudiante as any
    const txt = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    const mun = (e?.municipio as any)?.nombre ?? ''
    const et  = (i.etapa as any)?.nombre ?? ''
    return (!buscar    || txt.includes(buscar.toLowerCase()))
        && (!filtroMun || mun.toLowerCase().includes(filtroMun.toLowerCase()))
        && (!filtroEt  || et === filtroEt)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">
            📋 Coordinador DIGEEX{miPerfil?.departamento?.nombre ? ` — ${miPerfil.departamento.nombre}` : ''}
          </div>
          <div className="text-xs text-gray-400">
            Vista de solo lectura · {miPerfil?.primer_nombre ? `${miPerfil.primer_nombre} ${miPerfil.primer_apellido} · ` : ''}Ciclo {ciclo}
          </div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </header>

      <div className="pc">
        {!miPerfil?.departamento_id && !loading && (
          <div className="alert al-w mb-4 text-sm">
            ⚠️ Tu perfil no tiene departamento asignado. Contacta al administrador —
            sin esto no podrás ver datos de ninguna sede.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-5">
          {[
            { icon:'🏫', label:'Sedes con estudiantes',  val: stats.sedes,       color:'border-t-pink-400' },
            { icon:'🎓', label:'Estudiantes inscritos', val: stats.estudiantes, color:'border-t-blue-500' },
            { icon:'👨‍🏫', label:'Técnicos activos',      val: stats.tecnicos,    color:'border-t-green-500' },
            { icon:'📍', label:'Municipios (inscripción)',val: stats.municipios_insc, color:'border-t-orange-400' },
            { icon:'🏠', label:'Municipios (residencia)', val: stats.municipios_res,  color:'border-t-purple-400' },
          ].map(({ icon, label, val, color }) => (
            <div key={label} className={`card border-t-4 ${color} text-center py-4`}>
              <div className="text-4xl mb-1">{icon}</div>
              <div className="text-3xl font-extrabold text-gray-800">{val}</div>
              <div className="text-xs text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Técnicos */}
        {tecnicos.length > 0 && (
          <div className="card mb-5">
            <div className="card-title">👨‍🏫 Técnicos activos y municipios que atienden</div>
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-xs">Técnico</th>
                    <th className="px-3 py-2 text-xs">Código</th>
                    <th className="px-3 py-2 text-xs text-center">Estudiantes activos</th>
                    <th className="px-3 py-2 text-xs text-center">Sedes</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicos.map((t: any) => (
                    <tr key={t.id} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold text-sm">{t.primer_nombre} {t.primer_apellido}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{t.codigo_tecnico}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-extrabold text-sm">
                          {t.total_estudiantes ?? 0}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-extrabold text-sm">
                          {t.total_sedes ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Listado de estudiantes */}
        <div className="card">
          <div className="card-title">🎓 Listado de estudiantes — {filtrados.length} resultado(s)</div>

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap mb-4">
            <div className="flex-1 min-w-44">
              <input className="inp" placeholder="🔍 Buscar nombre, código, CUI..."
                value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-44">
              <input className="inp" placeholder="Filtrar por municipio..."
                value={filtroMun} onChange={e => setFiltroMun(e.target.value)} />
            </div>
            <div className="w-44">
              <select className="inp" value={filtroEt} onChange={e => setFiltroEt(e.target.value)}>
                <option value="">Todas las etapas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
              </select>
            </div>
            <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroMun(''); setFiltroEt('') }}>
              Limpiar
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              {buscar || filtroMun || filtroEt ? 'Sin resultados para los filtros aplicados' : 'Sin estudiantes inscritos'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl w-full min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white text-left">
                    {['Código MINEDUC','Nombre','CUI','Etapa','Municipio','Sede','Técnico'].map(h => (
                      <th key={h} className="px-3 py-2.5 text-xs font-bold uppercase whitespace-nowrap border-r border-blue-600 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((i: any, idx: number) => {
                    const e = i.estudiante as any
                    return (
                      <tr key={i.id} className={`border-b hover:bg-blue-50 ${idx%2===0?'bg-white':'bg-sky-50/20'}`}>
                        <td className="px-3 py-2 font-mono text-xs text-blue-700 font-bold">{e?.codigo_estudiante ?? '—'}</td>
                        <td className="px-3 py-2 text-sm font-semibold whitespace-nowrap">
                          {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{e?.cui ?? '—'}</td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">{(i.etapa as any)?.nombre}</td>
                        <td className="px-3 py-2 text-xs text-gray-500">{(e?.municipio as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">{(i.sede as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(i.tecnico as any)?.primer_nombre} {(i.tecnico as any)?.primer_apellido}
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

