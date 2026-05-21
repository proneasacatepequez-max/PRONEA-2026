'use client'
// src/app/dashboard/director/page.tsx
// FIX: Muestra todos los técnicos + estudiantes + transferir + estadísticas
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DirectorPage() {
  const [tecnicos,    setTecnicos]    = useState<any[]>([])
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [tab,         setTab]         = useState<'resumen'|'tecnicos'|'estudiantes'|'enlaces'>('resumen')

  useEffect(() => {
    Promise.all([
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
      fetch('/api/estudiantes?ciclo=2026').then(r => r.json()).catch(() => ({ data: [], total: 0 })),
    ]).then(([tec, est]) => {
      setTecnicos(Array.isArray(tec) ? tec : [])
      setEstudiantes(est.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  // Estadísticas
  const totalEst  = estudiantes.length
  const totalTec  = tecnicos.length
  const totalSedes = new Set(tecnicos.map((t: any) => t.total_sedes)).size

  // Distribución por etapa
  const porEtapa: Record<string, number> = {}
  estudiantes.forEach((i: any) => {
    const etapa = i.etapa?.nombre ?? 'Sin etapa'
    porEtapa[etapa] = (porEtapa[etapa] ?? 0) + 1
  })

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📊 Dashboard Director</div></header>
      <div className="pc flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📊 Dashboard Director</div>
      </header>
      <div className="pc">

        {/* Estadísticas rápidas */}
        <div className="g4 mb-5">
          {[
            { label: 'Técnicos activos',    valor: totalTec,   icon: '👨‍🏫', color: 'blue' },
            { label: 'Estudiantes activos', valor: totalEst,   icon: '🎓', color: 'green' },
            { label: 'Sedes atendidas',     valor: tecnicos.reduce((a: number, t: any) => a + (t.total_sedes ?? 0), 0), icon: '🏫', color: 'purple' },
            { label: 'Etapas activas',      valor: Object.keys(porEtapa).length, icon: '📚', color: 'yellow' },
          ].map(s => (
            <div key={s.label} className={`sc ${s.color} text-center`}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-5">
          {([
            ['resumen',      '📊 Resumen'],
            ['tecnicos',     '👨‍🏫 Mis Técnicos'],
            ['estudiantes',  '🎓 Estudiantes'],
            ['enlaces',      '🔗 Enlaces'],
          ] as const).map(([v, l]) => (
            <button key={v} onClick={() => setTab(v)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${tab === v ? 'bg-white text-pronea shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* RESUMEN */}
        {tab === 'resumen' && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Por etapa */}
            <div className="card">
              <div className="card-title">📚 Estudiantes por etapa</div>
              {Object.keys(porEtapa).length === 0 ? (
                <div className="text-center py-6 text-gray-400">Sin estudiantes inscritos</div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(porEtapa).map(([etapa, count]) => (
                    <div key={etapa} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{etapa}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div className="bg-pronea-secondary h-2 rounded-full" style={{ width: `${totalEst > 0 ? (count / totalEst * 100) : 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-gray-700 w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Por técnico */}
            <div className="card">
              <div className="card-title">👨‍🏫 Estudiantes por técnico</div>
              {tecnicos.length === 0 ? (
                <div className="text-center py-6 text-gray-400">Sin técnicos registrados</div>
              ) : (
                <div className="space-y-2">
                  {tecnicos.map((t: any) => (
                    <div key={t.id} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{t.primer_nombre} {t.primer_apellido}</span>
                      <div className="flex items-center gap-2">
                        <span className="badge badge-blue text-xs">{t.total_estudiantes} est.</span>
                        <span className="badge badge-purple text-xs">{t.total_sedes} sedes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TÉCNICOS */}
        {tab === 'tecnicos' && (
          <div className="card">
            <div className="card-title">
              👨‍🏫 Técnicos del programa
              <span className="text-xs text-gray-400 font-normal">{tecnicos.length} técnico(s)</span>
            </div>
            {tecnicos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <div className="font-semibold">Sin técnicos registrados</div>
                <div className="text-sm mt-1">El administrador debe crear los usuarios técnicos.</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr><th>Técnico</th><th>Código</th><th>Teléfono</th><th>Último acceso</th><th>Estudiantes</th><th>Sedes</th></tr>
                  </thead>
                  <tbody>
                    {tecnicos.map((t: any) => (
                      <tr key={t.id}>
                        <td>
                          <div className="font-semibold text-gray-800">{t.primer_nombre} {t.primer_apellido}</div>
                          <div className="text-xs text-gray-400">{t.usuario?.correo}</div>
                        </td>
                        <td className="font-mono text-xs">{t.codigo_tecnico ?? '—'}</td>
                        <td className="text-sm text-gray-600">{t.telefono ?? '—'}</td>
                        <td className="text-xs text-gray-400">
                          {t.usuario?.ultimo_acceso ? new Date(t.usuario.ultimo_acceso).toLocaleDateString('es-GT') : 'Nunca'}
                        </td>
                        <td className="text-center"><span className="badge badge-green">{t.total_estudiantes}</span></td>
                        <td className="text-center"><span className="badge badge-blue">{t.total_sedes}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ESTUDIANTES */}
        {tab === 'estudiantes' && (
          <div className="card">
            <div className="card-title">
              🎓 Estudiantes inscritos
              <span className="text-xs text-gray-400 font-normal">{estudiantes.length} estudiante(s)</span>
            </div>
            {estudiantes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🎓</div>
                <div className="font-semibold">Sin estudiantes inscritos</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr><th>Código</th><th>Estudiante</th><th>Etapa</th><th>Técnico</th><th>Versión</th><th>Estado</th></tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((i: any) => {
                      const e = i.estudiante as any
                      return (
                        <tr key={i.id}>
                          <td className="font-mono text-xs text-gray-500">{e?.codigo_estudiante}</td>
                          <td>
                            <div className="font-semibold text-gray-800">{e?.primer_nombre} {e?.primer_apellido}</div>
                            <div className="text-xs text-gray-400">{e?.telefono}</div>
                          </td>
                          <td className="text-sm">{(i.etapa as any)?.nombre}</td>
                          <td className="text-sm">{(i.tecnico as any)?.primer_nombre} {(i.tecnico as any)?.primer_apellido}</td>
                          <td><span className={`badge ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{i.version_libro}</span></td>
                          <td><span className={`badge ${i.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>{i.estado}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ENLACES */}
        {tab === 'enlaces' && (
          <EnlacesPanel />
        )}
      </div>
    </div>
  )
}

function EnlacesPanel() {
  const [enlaces, setEnlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mis-enlaces').then(r => r.json())
      .then(d => setEnlaces(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>

  return (
    <div className="card">
      <div className="card-title">🔗 Enlaces institucionales</div>
      {enlaces.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">🔗</div>
          <div className="font-semibold">Sin enlaces registrados</div>
          <div className="text-sm mt-1">El administrador debe crear los usuarios tipo enlace.</div>
        </div>
      ) : (
        <div className="tw">
          <table className="tbl">
            <thead><tr><th>Enlace</th><th>Cargo</th><th>Institución</th><th>Estado</th></tr></thead>
            <tbody>
              {enlaces.map((e: any) => (
                <tr key={e.id}>
                  <td className="font-semibold">{e.primer_nombre} {e.primer_apellido}</td>
                  <td className="text-sm text-gray-600">{e.cargo ?? '—'}</td>
                  <td className="text-sm text-gray-600">{(e.institucion as any)?.nombre ?? '—'}</td>
                  <td><span className={`badge ${e.activo ? 'badge-green' : 'badge-gray'}`}>{e.activo ? 'Activo' : 'Inactivo'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
