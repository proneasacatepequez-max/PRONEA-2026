'use client'
// src/app/dashboard/estudiante/calificaciones/page.tsx
import { useState, useEffect } from 'react'

export default function CalificacionesPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mi-progreso').then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="ap"><header className="topbar"><div className="page-title">📝 Mis Calificaciones</div></header>
      <div className="pc flex justify-center py-16"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
    </div>
  )

  const resumen = data?.resumen_etapa
  const libros  = data?.libros ?? []

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Mis Calificaciones</div></header>
      <div className="pc">
        {/* Resumen etapa */}
        {resumen && (
          <div className={`card mb-5 border-l-4 ${resumen.promovido ? 'border-l-green-500' : resumen.promovido === false ? 'border-l-red-500' : 'border-l-yellow-400'}`}>
            <div className="card-title">📊 Resumen de Etapa</div>
            <div className="g3">
              <div className="text-center">
                <div className={`text-4xl font-extrabold ${resumen.nota_final_etapa >= 70 ? 'text-green-600' : resumen.nota_final_etapa >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {resumen.nota_final_etapa?.toFixed(1) ?? '—'}%
                </div>
                <div className="text-sm text-gray-500 mt-1">Nota final</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-700">{resumen.calificacion_cualitativa ?? '—'}</div>
                <div className="text-sm text-gray-500 mt-1">Calificación</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-extrabold ${resumen.promovido ? 'text-green-600' : resumen.promovido === false ? 'text-red-600' : 'text-gray-400'}`}>
                  {resumen.promovido ? '✓ PROMOVIDO' : resumen.promovido === false ? '✗ NO PROMOVIDO' : '⏳ En progreso'}
                </div>
                <div className="text-sm text-gray-500 mt-1">Estado</div>
              </div>
            </div>
          </div>
        )}

        {/* Por libro */}
        <div className="g2">
          {libros.filter(Boolean).map((l: any) => (
            <div key={l.id} className="card">
              <div className="card-title">
                {l.nombre ?? `Libro ${l.numero}`}
                <span className={`badge ${l.version === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{l.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}</span>
              </div>
              {l.resumen ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tareas completadas</span>
                    <span className="font-bold">{l.resumen.tareas_completadas}/{l.resumen.tareas_total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-pronea-secondary h-2 rounded-full transition-all"
                      style={{ width: `${l.resumen.tareas_total > 0 ? (l.resumen.tareas_completadas/l.resumen.tareas_total*100) : 0}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Zona (tareas)</span>
                    <span className="font-bold">{l.resumen.zona?.toFixed(1) ?? '—'}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Nota final del libro</span>
                    <span className={`text-xl font-extrabold ${l.resumen.nota_final >= 70 ? 'text-green-600' : l.resumen.nota_final >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                      {l.resumen.nota_final?.toFixed(1) ?? '—'}%
                    </span>
                  </div>
                  <div>
                    {l.resumen.promovido === true && <span className="badge badge-green">✓ Promovido</span>}
                    {l.resumen.promovido === false && <span className="badge badge-red">✗ No promovido</span>}
                    {l.resumen.promovido === null && <span className="badge badge-yellow">En progreso</span>}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400 text-sm">Sin notas registradas aún</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
