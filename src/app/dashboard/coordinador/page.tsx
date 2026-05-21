'use client'
// src/app/dashboard/coordinador/page.tsx
// FIX: Listado por municipio, etapa, edad + comparación residencia vs inscripción
import { useState, useEffect } from 'react'

export default function CoordinadorPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filtro,  setFiltro]  = useState({ municipio: '', etapa: '' })

  useEffect(() => {
    Promise.all([
      fetch('/api/estudiantes?ciclo=2026&detalle=1').then(r => r.json()).catch(() => ({ data: [], total: 0 })),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ]).then(([est, tec]) => {
      setData({ estudiantes: est.data ?? [], tecnicos: Array.isArray(tec) ? tec : [] })
    }).finally(() => setLoading(false))
  }, [])

  if (loading || !data) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📋 Coordinador DIGEEX</div></header>
      <div className="pc flex justify-center py-20"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
    </div>
  )

  const { estudiantes, tecnicos } = data

  // Cálculos
  const municipiosAtendidos = new Set(
    tecnicos.flatMap((t: any) => []).length > 0 ? [] :
    estudiantes.map((i: any) => (i.estudiante as any)?.municipio_id).filter(Boolean)
  ).size

  const municipioResidencia  = new Set(estudiantes.map((i: any) => (i.estudiante as any)?.municipio_id).filter(Boolean)).size
  const municipioInscripcion = new Set(estudiantes.map((i: any) => i.sede?.municipio_id).filter(Boolean)).size

  // Estadísticas por municipio (inscripción)
  const porMunicipio: Record<string, number> = {}
  estudiantes.forEach((i: any) => {
    const mun = i.sede?.municipio?.nombre ?? i.sede?.municipio ?? 'Sin municipio'
    porMunicipio[mun] = (porMunicipio[mun] ?? 0) + 1
  })

  // Por etapa
  const porEtapa: Record<string, number> = {}
  estudiantes.forEach((i: any) => {
    const etapa = (i.etapa as any)?.nombre ?? 'Sin etapa'
    porEtapa[etapa] = (porEtapa[etapa] ?? 0) + 1
  })

  // Por edad aproximada (año actual - año nacimiento)
  const anioActual = new Date().getFullYear()
  const porEdad: Record<string, number> = { '13-17':0, '18-25':0, '26-35':0, '36-45':0, '46+':0, 'Sin dato':0 }
  estudiantes.forEach((i: any) => {
    const fn = (i.estudiante as any)?.fecha_nacimiento
    if (!fn) { porEdad['Sin dato']++; return }
    const edad = anioActual - new Date(fn).getFullYear()
    if (edad < 18)      porEdad['13-17']++
    else if (edad < 26) porEdad['18-25']++
    else if (edad < 36) porEdad['26-35']++
    else if (edad < 46) porEdad['36-45']++
    else                porEdad['46+']++
  })

  const filtrados = estudiantes.filter((i: any) => {
    const mun   = i.sede?.municipio?.nombre ?? i.sede?.municipio ?? ''
    const etapa = (i.etapa as any)?.nombre ?? ''
    return (!filtro.municipio || mun.toLowerCase().includes(filtro.municipio.toLowerCase()))
        && (!filtro.etapa     || etapa.toLowerCase().includes(filtro.etapa.toLowerCase()))
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📋 Coordinador DIGEEX — Sacatepéquez</div>
          <div className="text-xs text-gray-400">Vista de solo lectura · Ciclo 2026</div>
        </div>
      </header>
      <div className="pc">

        {/* KPIs */}
        <div className="g4 mb-5">
          {[
            { label: 'Estudiantes inscritos', valor: estudiantes.length, icon: '🎓', color: 'blue' },
            { label: 'Técnicos activos',      valor: tecnicos.length,    icon: '👨‍🏫', color: 'green' },
            { label: 'Municipios (inscripción)', valor: municipioInscripcion, icon: '📍', color: 'purple' },
            { label: 'Municipios (residencia)',  valor: municipioResidencia,  icon: '🏠', color: 'yellow' },
          ].map(s => (
            <div key={s.label} className={`sc ${s.color} text-center`}>
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Gráficas rápidas */}
        <div className="g2 mb-5">
          {/* Por etapa */}
          <div className="card">
            <div className="card-title">📚 Por etapa</div>
            {Object.entries(porEtapa).map(([etapa, count]) => (
              <div key={etapa} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600 w-32 truncate">{etapa}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-pronea-secondary h-2 rounded-full" style={{ width: `${estudiantes.length > 0 ? (count/estudiantes.length*100) : 0}%` }} />
                </div>
                <span className="text-xs font-bold w-6 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Por edad */}
          <div className="card">
            <div className="card-title">🎂 Por rango de edad</div>
            {Object.entries(porEdad).filter(([,v]) => v > 0).map(([rango, count]) => (
              <div key={rango} className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-600 w-16">{rango} años</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${estudiantes.length > 0 ? (count/estudiantes.length*100) : 0}%` }} />
                </div>
                <span className="text-xs font-bold w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Técnicos y municipios */}
        <div className="card mb-5">
          <div className="card-title">👨‍🏫 Técnicos activos y municipios que atienden</div>
          {tecnicos.length === 0 ? (
            <div className="text-center py-6 text-gray-400">Sin técnicos</div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Técnico</th><th>Código</th><th>Estudiantes activos</th><th>Sedes</th></tr></thead>
                <tbody>
                  {tecnicos.map((t: any) => (
                    <tr key={t.id}>
                      <td className="font-semibold">{t.primer_nombre} {t.primer_apellido}</td>
                      <td className="font-mono text-xs">{t.codigo_tecnico ?? '—'}</td>
                      <td className="text-center"><span className="badge badge-green">{t.total_estudiantes}</span></td>
                      <td className="text-center"><span className="badge badge-blue">{t.total_sedes}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Listado estudiantes con filtros */}
        <div className="card">
          <div className="card-title">🎓 Listado de estudiantes</div>
          <div className="flex gap-3 mb-4 flex-wrap">
            <input className="inp flex-1 min-w-40" placeholder="Filtrar por municipio..." value={filtro.municipio} onChange={e => setFiltro(f => ({ ...f, municipio: e.target.value }))} />
            <input className="inp flex-1 min-w-40" placeholder="Filtrar por etapa..." value={filtro.etapa} onChange={e => setFiltro(f => ({ ...f, etapa: e.target.value }))} />
            <button className="btn btn-g" onClick={() => setFiltro({ municipio:'', etapa:'' })}>Limpiar</button>
          </div>
          <div className="text-xs text-gray-400 mb-2">{filtrados.length} resultado(s)</div>
          {filtrados.length === 0 ? (
            <div className="text-center py-6 text-gray-400">Sin resultados</div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Código</th><th>Estudiante</th><th>Etapa</th>
                    <th>Mun. inscripción</th><th>Mun. residencia</th>
                    <th>Edad aprox.</th><th>Técnico</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.slice(0, 100).map((i: any) => {
                    const e   = i.estudiante as any
                    const edad = e?.fecha_nacimiento
                      ? `${anioActual - new Date(e.fecha_nacimiento).getFullYear()} años`
                      : '—'
                    const munInsc = i.sede?.municipio?.nombre ?? i.sede?.municipio ?? '—'
                    const munRes  = e?.municipio?.nombre ?? e?.municipio ?? '—'
                    const mismaMun = munInsc === munRes && munInsc !== '—'
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs">{e?.codigo_estudiante}</td>
                        <td className="font-semibold text-sm">{e?.primer_nombre} {e?.primer_apellido}</td>
                        <td className="text-xs">{(i.etapa as any)?.nombre}</td>
                        <td className="text-xs">{munInsc}</td>
                        <td className="text-xs">
                          <span className={mismaMun ? 'text-green-600' : 'text-orange-600 font-semibold'}>
                            {munRes}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">{edad}</td>
                        <td className="text-xs">{(i.tecnico as any)?.primer_nombre} {(i.tecnico as any)?.primer_apellido}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtrados.length > 100 && (
                <div className="text-center text-xs text-gray-400 mt-2 py-2 border-t">
                  Mostrando primeros 100 de {filtrados.length}. Usa los filtros para reducir resultados.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
