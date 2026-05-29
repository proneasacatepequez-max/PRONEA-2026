'use client'
// src/app/dashboard/director/tecnicos/page.tsx
// CORRECCIONES:
// 1. Muestra técnicos de su sede solamente
// 2. Muestra los enlaces vinculados a cada técnico
import { useState, useEffect } from 'react'

export default function DirectorTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/mis-tecnicos')
      .then(r => r.json())
      .then(d => setTecnicos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👨‍🏫 Técnicos y Enlacs de mi Sede</div>
          <div className="text-xs text-gray-400">{tecnicos.length} técnico(s) asignado(s)</div>
        </div>
      </header>

      <div className="pc">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tecnicos.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">👨‍🏫</div>
            <div className="font-semibold text-gray-600">Sin técnicos asignados a tu sede</div>
            <div className="text-sm mt-1">El administrador debe asignar técnicos a esta sede</div>
          </div>
        ) : (
          <div className="space-y-4">
            {tecnicos.map((t: any) => (
              <div key={t.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-extrabold text-sm flex-shrink-0">
                      {t.primer_nombre?.[0]}{t.primer_apellido?.[0]}
                    </div>
                    <div>
                      <div className="font-extrabold text-gray-800">
                        {t.primer_nombre} {t.segundo_nombre} {t.primer_apellido} {t.segundo_apellido}
                      </div>
                      <div className="text-xs text-gray-400 font-mono">{t.codigo_tecnico ?? '—'}</div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {t.telefono && <span>📞 {t.telefono}</span>}
                        {t.usuario?.correo && <span>✉️ {t.usuario.correo}</span>}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <span className="badge badge-green">{t.total_estudiantes} estudiantes</span>
                        <span className="badge badge-blue">{t.total_sedes} sede(s)</span>
                        {t.total_enlaces > 0 && (
                          <span className="badge badge-purple">{t.total_enlaces} enlace(s)</span>
                        )}
                        <span className="text-xs text-gray-400">
                          Último acceso: {t.usuario?.ultimo_acceso
                            ? new Date(t.usuario.ultimo_acceso).toLocaleDateString('es-GT')
                            : 'Nunca'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {t.enlaces?.length > 0 && (
                    <button
                      className="btn btn-g btn-sm flex-shrink-0"
                      onClick={() => setExpandido(expandido === t.id ? null : t.id)}
                    >
                      {expandido === t.id ? '▲ Ocultar' : `▼ Ver ${t.total_enlaces} enlace(s)`}
                    </button>
                  )}
                </div>

                {/* Sedes del técnico */}
                {t.sedes?.length > 0 && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {t.sedes.map((sede: any, i: number) => (
                      <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                        🏫 {sede?.nombre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Enlaces del técnico — expandible */}
                {expandido === t.id && t.enlaces?.length > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <div className="text-xs font-bold text-gray-500 mb-3">
                      ENLACES INSTITUCIONALES A CARGO
                    </div>
                    <div className="space-y-2">
                      {t.enlaces.map((enl: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-xs flex-shrink-0">
                            {enl?.primer_nombre?.[0]}{enl?.primer_apellido?.[0]}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold">
                              {enl?.primer_nombre} {enl?.primer_apellido}
                            </div>
                            <div className="text-xs text-gray-400">
                              {enl?.cargo ?? 'Enlace institucional'} · {enl?.institucion?.nombre ?? '—'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
