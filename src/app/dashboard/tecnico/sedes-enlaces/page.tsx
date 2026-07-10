'use client'
// src/app/dashboard/tecnico/sedes-enlaces/page.tsx
// CORREGIDO: carga sedes y enlaces con nombre completo, tabla mejorada
import { useState, useEffect } from 'react'

export default function TecnicoSedesEnlacesPage() {
  const [sedes,    setSedes]    = useState<any[]>([])
  const [enlaces,  setEnlaces]  = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [ciclo,    setCiclo]    = useState('2026')
  const [filtroEnl,setFiltroEnl]= useState('')

  const cargar = async () => {
    setLoading(true)
    const [s, e] = await Promise.all([
      fetch(`/api/tecnico/sedes?ciclo=${ciclo}`).then(r=>r.json()).catch(()=>[]),
      fetch(`/api/tecnico/enlaces?ciclo=${ciclo}`).then(r=>r.json()).catch(()=>[]),
    ])
    setSedes(Array.isArray(s) ? s : [])
    setEnlaces(Array.isArray(e) ? e : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [ciclo])

  const enlacesFiltrados = enlaces.filter(enl => {
    if (!filtroEnl.trim()) return true
    const txt = `${enl.nombre_completo} ${enl.correo??''} ${enl.sede?.nombre??''} ${enl.cargo??''}`.toLowerCase()
    return txt.includes(filtroEnl.toLowerCase())
  })

  // Total único: combina sedes propias + sedes de enlaces, evitando contar
  // dos veces la misma sede si coincide en ambas listas
  const totalEst = (() => {
    const porSede = new Map<string, number>()
    for (const se of sedes)   if (se.id) porSede.set(se.id, se.total_estudiantes ?? 0)
    for (const enl of enlaces) {
      const sedeId = enl.sede?.id
      if (sedeId && !porSede.has(sedeId)) porSede.set(sedeId, enl.total_estudiantes ?? 0)
    }
    return [...porSede.values()].reduce((a, b) => a + b, 0)
  })()

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏢 Mis Sedes y Enlaces</div>
          <div className="text-xs text-gray-400">
            {sedes.length} sedes · {enlaces.length} enlaces · {totalEst} estudiantes activos
          </div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
        </select>
      </header>

      <div className="pc space-y-5">

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon:'🏫', label:'Sedes a cargo',   value:sedes.length,   color:'blue'   },
            { icon:'🔗', label:'Enlaces asignados',value:enlaces.length, color:'green'  },
            { icon:'🎓', label:'Estudiantes activos',value:totalEst,    color:'purple' },
          ].map(k => (
            <div key={k.label} className={`sc ${k.color} text-center`}>
              <div className="text-3xl mb-1">{k.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{loading ? '…' : k.value}</div>
              <div className="text-xs text-gray-500">{k.label}</div>
            </div>
          ))}
        </div>

        {/* SEDES */}
        <div className="card">
          <div className="card-title mb-3">🏫 Sedes a Cargo</div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sedes.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🏫</div>
              <div className="text-sm">Sin sedes asignadas. El administrador debe configurarlas.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {sedes.map((sede: any) => (
                <div key={sede.id}
                  className={`p-4 rounded-xl border-l-4 ${sede.es_principal ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-gray-50'} transition-shadow hover:shadow-md`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate">{sede.nombre}</div>
                      {sede.es_principal && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
                          ⭐ Principal
                        </span>
                      )}
                      <div className="text-xs text-gray-500 mt-1.5 space-y-0.5">
                        <div>📍 {sede.municipio?.nombre ?? '—'}</div>
                        {sede.direccion  && <div>📮 {sede.direccion}</div>}
                        {sede.telefono   && <div>📞 {sede.telefono}</div>}
                        {sede.horario    && <div>🕐 {sede.horario}</div>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-extrabold text-blue-700">{sede.total_estudiantes ?? 0}</div>
                      <div className="text-xs text-gray-400">estudiantes</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ENLACES */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div className="card-title">🔗 Enlaces Institucionales a Cargo</div>
            <input className="inp w-64 text-sm" placeholder="🔍 Buscar enlace, sede, correo..."
              value={filtroEnl} onChange={e => setFiltroEnl(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : enlaces.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <div className="text-3xl mb-2">🔗</div>
              <div className="text-sm">Sin enlaces asignados. El administrador debe vincularlos.</div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[750px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-xs uppercase tracking-wide">
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Nombre completo</th>
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Cargo</th>
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Sede</th>
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Municipio</th>
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Correo</th>
                      <th className="px-3 py-2.5 text-left border-r border-green-600">Teléfono</th>
                      <th className="px-3 py-2.5 text-center border-r border-green-600">Estudiantes</th>
                      <th className="px-3 py-2.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enlacesFiltrados.map((enl: any, idx: number) => (
                      <tr key={enl.id}
                        className={`border-b hover:bg-green-50/40 transition-colors ${idx%2===0?'bg-white':'bg-green-50/20'}`}>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {enl.primer_nombre} {enl.primer_apellido}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{enl.cargo ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-blue-700 whitespace-nowrap">
                          {enl.sede?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">
                          {enl.sede?.municipio?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs font-mono text-gray-500">
                          {enl.correo ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{enl.telefono ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-green-700">
                          {enl.total_estudiantes ?? 0}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            enl.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {enl.activo ? '✓ Activo' : '✗ Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtroEnl && (
                <div className="px-4 py-2 text-xs text-gray-400 border-t bg-gray-50">
                  Mostrando {enlacesFiltrados.length} de {enlaces.length} enlaces
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

