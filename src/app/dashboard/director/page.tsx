'use client'
// src/app/dashboard/director/page.tsx
// FIX #8 CORREGIDO: Modal con información completa de técnico
// Muestra TODOS los técnicos sin importar sede_id del director
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function DirectorDashboard() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'resumen' | 'tecnicos' | 'estudiantes'>('resumen')
  
  // ============================================================
  // STATES PARA EL MODAL (ya existen en tu código)
  // ============================================================
  const [modalTecnico, setModalTecnico] = useState(false)
  const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<any>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
      fetch('/api/inscripciones?ciclo=2026&estado=en_curso&detalle=1').then(r => r.json()).catch(() => ({ data: [] })),
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
            { label: 'Técnicos activos', valor: tecnicos.length, icon: '👨‍🏫', color: 'blue' },
            { label: 'Estudiantes 2026', valor: inscripciones.length, icon: '🎓', color: 'green' },
            { label: 'Sedes atendidas', valor: new Set(inscripciones.map((i: any) => i.sede?.id).filter(Boolean)).size, icon: '🏫', color: 'purple' },
            { label: 'Etapas activas', valor: Object.keys(porEtapa).length, icon: '📚', color: 'yellow' },
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
          {(['resumen', 'tecnicos', 'estudiantes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-pronea shadow-sm' : 'text-gray-500'}`}
            >
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
                    <div
                      className="bg-pronea-secondary h-2 rounded-full"
                      style={{ width: `${inscripciones.length > 0 ? count / inscripciones.length * 100 : 0}%` }}
                    />
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

        {/* ============================================================
            TABLA DE TÉCNICOS CON BOTÓN "VER COMPLETO"
            ============================================================ */}
        {tab === 'tecnicos' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">👨‍🏫 Técnicos ({tecnicos.length})</h3>
            </div>

            {tecnicos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <div className="font-semibold">Sin técnicos registrados</div>
                <div className="text-sm mt-1 text-gray-400">El administrador debe crear los usuarios técnicos</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Código</th>
                      <th>Correo</th>
                      <th>Último acceso</th>
                      <th>Estudiantes</th>
                      <th>Sedes</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
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
                        <td className="text-center">
                          <span className="badge badge-green">{t.total_estudiantes || 0}</span>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-blue">{t.total_sedes || 0}</span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-p btn-sm"
                            onClick={() => {
                              setTecnicoSeleccionado(t)
                              setModalTecnico(true)
                            }}
                            title="Ver información completa"
                          >
                            ℹ️
                          </button>
                        </td>
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
              <span className="text-xs text-gray-400 font-normal ml-2">{inscripciones.length} total</span>
            </div>
            {inscripciones.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🎓</div>
                <div className="font-semibold">Sin estudiantes inscritos</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Estudiante</th>
                      <th>Etapa</th>
                      <th>Técnico</th>
                      <th>Sede</th>
                      <th>Versión</th>
                    </tr>
                  </thead>
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
                          <td>
                            <span className={`badge text-xs ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                              {i.version_libro}
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
        )}

      </div>

      {/* ============================================================
          MODAL INFORMACIÓN TÉCNICO COMPLETA
          ============================================================ */}
      {modalTecnico && tecnicoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 px-6 py-4 border-b bg-white flex justify-between items-center">
              <h3 className="font-bold text-lg">👨‍🏫 Información Técnico</h3>
              <button
                onClick={() => setModalTecnico(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Encabezado */}
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
                <div className="text-lg font-bold">
                  {tecnicoSeleccionado.primer_nombre} {tecnicoSeleccionado.segundo_nombre || ''}{' '}
                  {tecnicoSeleccionado.primer_apellido} {tecnicoSeleccionado.segundo_apellido || ''}
                </div>
                <div className="text-xs text-blue-100 mt-1">
                  Código: {tecnicoSeleccionado.codigo_tecnico || '—'}
                </div>
              </div>

              {/* Información Personal */}
              <div>
                <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Información Personal</div>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-xs font-bold text-gray-500">Teléfono</div>
                    <div className="font-mono">{tecnicoSeleccionado.telefono || '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500">Email</div>
                    <div className="font-mono text-xs break-all">
                      {tecnicoSeleccionado.usuario?.correo || '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500">Estado</div>
                    <div>
                      <span
                        className={`badge text-xs ${tecnicoSeleccionado.activo ? 'badge-green' : 'badge-red'}`}
                      >
                        {tecnicoSeleccionado.activo ? '✅ Activo' : '❌ Inactivo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Asignaciones */}
              <div className="border-t pt-4">
                <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Asignaciones</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Sedes a cargo:</span>
                    <span className="font-bold">{tecnicoSeleccionado.sedes?.length || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Estudiantes asignados:</span>
                    <span className="font-bold">{tecnicoSeleccionado.total_estudiantes || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Escalas asignadas:</span>
                    <span className="font-bold">{tecnicoSeleccionado.total_escalas || 0}</span>
                  </div>
                </div>
              </div>

              {/* Sedes */}
              {tecnicoSeleccionado.sedes && tecnicoSeleccionado.sedes.length > 0 && (
                <div className="border-t pt-4">
                  <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Sedes</div>
                  <div className="space-y-2">
                    {tecnicoSeleccionado.sedes.map((s: any) => (
                      <div
                        key={s.id}
                        className="p-2 bg-gray-50 rounded border-l-2 border-blue-400 text-sm"
                      >
                        <div className="font-semibold">{s.nombre}</div>
                        <div className="text-xs text-gray-500">{s.municipio?.nombre}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registro */}
              <div className="border-t pt-4 text-xs text-gray-500">
                <div>
                  Creado:{' '}
                  {tecnicoSeleccionado.creado_en
                    ? new Date(tecnicoSeleccionado.creado_en).toLocaleDateString('es-GT')
                    : '—'}
                </div>
                <div>
                  Último acceso:{' '}
                  {tecnicoSeleccionado.usuario?.ultimo_acceso
                    ? new Date(tecnicoSeleccionado.usuario.ultimo_acceso).toLocaleDateString('es-GT')
                    : 'Nunca'}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
              <button className="btn btn-g" onClick={() => setModalTecnico(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
