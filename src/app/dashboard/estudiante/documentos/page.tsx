'use client'
// src/app/dashboard/estudiante/documentos/page.tsx
import { useState, useEffect } from 'react'

const ESTADO_COLOR: Record<string, string> = {
  en_revision: 'badge-yellow',
  aprobado:    'badge-green',
  rechazado:   'badge-red',
  pendiente:   'badge-gray',
}

export default function DocumentosEstudiantePage() {
  const [docs, setDocs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/mis-documentos').then(r => r.json())
      .then(d => setDocs(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📎 Mis Documentos</div></header>
      <div className="pc">
        <div className="alert al-i mb-4">
          Los documentos son subidos por el técnico al momento de la inscripción.
          Si necesitas actualizar algún documento, contacta a tu técnico.
        </div>
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : docs.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">📎</div>
              <div className="font-semibold">Sin documentos registrados</div>
            </div>
          ) : (
            <div className="space-y-3">
              {docs.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📄</span>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{(d.tipo_documento as any)?.nombre}</div>
                      <div className="text-xs text-gray-400">
                        {d.creado_en ? new Date(d.creado_en).toLocaleDateString('es-GT') : ''}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${ESTADO_COLOR[d.estado] ?? 'badge-gray'}`}>{d.estado?.replace(/_/g, ' ')}</span>
                    {d.url_google_drive && (
                      <a href={d.url_google_drive} target="_blank" rel="noreferrer" className="btn btn-g btn-sm">
                        👁️ Ver
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
