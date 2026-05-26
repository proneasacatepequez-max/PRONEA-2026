'use client'
// src/app/dashboard/director/page.tsx
// FIX: Muestra TODOS los técnicos sin importar sede_id del director
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DirectorDashboard() {
  const [tecnicos,      setTecnicos]      = useState<any[]>([])
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [tab,           setTab]           = useState<'resumen'|'tecnicos'|'estudiantes'>('resumen')

  useEffect(() => {
    Promise.all([
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
      fetch('/api/inscripciones?ciclo=2026&estado=en_curso&detalle=1').then(r => r.json()).catch(() => ({ data:[] })),
    ]).then(([tec, est]) => {
      setTecnicos(Array.isArray(tec) ? tec : [])
      setInscripciones(est.data ?? [])
    }).finally(() => setLoading(false))
  }, [])

  const porEtapa: Record<string, number> = {}
  inscripciones.forEach((i: any) => {
    const e = (i.etapa as any)?.nombre ?? '—'
    porEtapa[e] = (porEtapa[e] ?? 0) + 1
  })

  const porTecnico: Record<string, number> = {}
  inscripciones.forEach((i: any) => {
    const t = (i.tecnico as any)
    const nom = t ? `${t.primer_nombre} ${t.primer_apellido}` : '—'
    porTecnico[nom] = (porTecnico[nom] ?? 0) + 1
  })

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📊 Dashboard Director</div></header>
      <div className="pc flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📊 Dashboard Director</div>
      </header>
      <div className="pc">

        {/* KPIs */}
        <div className="g4 mb-5">
          {[
            { label:'Técnicos activos',  valor: tecnicos.length,      icon:'👨‍🏫', color:'blue'   },
            { label:'Estudiantes 2026',  valor: inscripciones.length, icon:'🎓', color:'green'  },
            { label:'Sedes atendidas',   valor: new Set(inscripciones.map((i:any) => i.sede?.id).filter(Boolean)).size, icon:'🏫', color:'purple' },
            { label:'Etapas activas',    valor: Object.keys(porEtapa).length, icon:'📚', color:'yellow' },
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
          {(['resumen','tecnicos','estudiantes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${tab===t ? 'bg-white text-pronea shadow-sm' : 'text-gray-500'}`}>
              {t === 'resumen' ? '📊 Resumen' : t === 'tecnicos' ? `👨‍🏫 Técnicos (${tecnicos.length})` : `🎓 Estudiantes (${inscripciones.length})`}
            </button>
          ))}
        </div>

        {tab === 'resumen' && (
          <div className="g2">
            <div className="card">
              <div className="card-title">📚 Por etapa</div>
              {Object.entries(porEtapa).length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin inscripciones</div>
              ) : Object.entries(porEtapa).map(([etapa, count]) => (
                <div key={etapa} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 flex-1 truncate">{etapa}</span>
                  <div className="w-24 bg-gray-100 rounded-full h-2">
                    <div className="bg-pronea-secondary h-2 rounded-full" style={{ width:`${inscripciones.length>0 ? count/inscripciones.length*100 : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">👨‍🏫 Por técnico</div>
              {Object.entries(porTecnico).length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">Sin datos</div>
              ) : Object.entries(porTecnico).map(([tec, count]) => (
                <div key={tec} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 flex-1 truncate">{tec}</span>
                  <span className="badge badge-blue text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'tecnicos' && (
          <div className="card">
            <div className="card-title">👨‍🏫 Todos los técnicos del programa</div>
            {tecnicos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <div className="font-semibold">Sin técnicos registrados</div>
                <div className="text-sm mt-1 text-gray-400">El administrador debe crear los usuarios técnicos</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Técnico</th><th>Código</th><th>Correo</th><th>Último acceso</th><th>Estudiantes</th><th>Sedes</th></tr></thead>
                  <tbody>
                    {tecnicos.map((t: any) => (
                      <tr key={t.id}>
                        <td>
                          <div className="font-semibold">{t.primer_nombre} {t.primer_apellido}</div>
                          <div className="text-xs text-gray-400">{t.telefono ?? '—'}</div>
                        </td>
                        <td className="font-mono text-xs">{t.codigo_tecnico ?? '—'}</td>
                        <td className="text-xs text-gray-500">{t.usuario?.correo}</td>
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

        {tab === 'estudiantes' && (
          <div className="card">
            <div className="card-title">
              🎓 Estudiantes inscritos 2026
              <span className="text-xs text-gray-400 font-normal">{inscripciones.length} total</span>
            </div>
            {inscripciones.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🎓</div>
                <div className="font-semibold">Sin estudiantes inscritos</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Código</th><th>Estudiante</th><th>Etapa</th><th>Técnico</th><th>Sede</th><th>Versión</th></tr></thead>
                  <tbody>
                    {inscripciones.map((i: any) => {
                      const e = i.estudiante as any
                      return (
                        <tr key={i.id}>
                          <td className="font-mono text-xs text-gray-500">{e?.codigo_estudiante}</td>
                          <td>
                            <div className="font-semibold text-sm">{e?.primer_nombre} {e?.primer_apellido}</div>
                            <div className="text-xs text-gray-400">{e?.telefono}</div>
                            {i.tiene_ajuste_discapacidad && <span className="badge badge-yellow text-xs">♿</span>}
                          </td>
                          <td className="text-xs">{(i.etapa as any)?.nombre}</td>
                          <td className="text-xs">{(i.tecnico as any)?.primer_nombre} {(i.tecnico as any)?.primer_apellido}</td>
                          <td className="text-xs text-gray-500">{(i.sede as any)?.nombre}</td>
                          <td><span className={`badge text-xs ${i.version_libro==='nuevo' ? 'badge-blue' : 'badge-orange'}`}>{i.version_libro}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
