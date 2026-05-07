'use client'
// src/app/dashboard/estudiante/recursos/page.tsx
import { useState, useEffect } from 'react'

const TIPO_ICON: Record<string, string> = { video:'🎬', pdf:'📄', link:'🔗', imagen:'🖼️', audio:'🎧' }

export default function RecursosEstudiantePage() {
  const [recursos, setRecursos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  useEffect(() => {
    fetch('/api/recursos').then(r => r.json()).then(d => setRecursos(Array.isArray(d) ? d : [])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">🎬 Recursos de Apoyo</div></header>
      <div className="pc">
        {loading ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        : recursos.length === 0 ? <div className="text-center py-12 text-gray-400"><div className="text-4xl mb-3">🎬</div><div className="font-semibold">Sin recursos disponibles</div></div>
        : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recursos.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer"
                className="card hover:border-pronea-secondary hover:shadow-md transition-all cursor-pointer block">
                <div className="flex items-start gap-3">
                  <div className="text-3xl flex-shrink-0">{TIPO_ICON[r.tipo_contenido] ?? '📎'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm">{r.titulo}</div>
                    {r.descripcion && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.descripcion}</div>}
                    <div className="flex items-center gap-2 mt-2">
                      {r.categoria && <span className="badge badge-blue text-xs">{(r.categoria as any)?.nombre}</span>}
                      {r.duracion_minutos && <span className="text-xs text-gray-400">⏱ {r.duracion_minutos} min</span>}
                      {r.destacado && <span className="badge badge-yellow text-xs">⭐ Destacado</span>}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
