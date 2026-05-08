'use client'
// src/app/dashboard/admin/ajustes/page.tsx
import { useState, useEffect } from 'react'

export default function AjustesAdminPage() {
  const [tipos, setTipos]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseAdmin_dummy()
  }, [])

  const supabaseAdmin_dummy = async () => {
    // Cargar tipos de ajuste de discapacidad
    const res = await fetch('/api/tipos-ajuste').then(r => r.json()).catch(() => [])
    setTipos(Array.isArray(res) ? res : [])
    setLoading(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">♿ Ajustes por Discapacidad</div>
          <div className="text-xs text-gray-400">Configuración de tipos de ajuste curricular</div>
        </div>
      </header>
      <div className="pc">
        <div className="alert al-i mb-4">
          <div>
            <b>📋 ¿Cómo funciona?</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>• El <b>Técnico</b> aplica ajustes a un estudiante específico al inscribirlo</div>
              <div>• Los ajustes modifican el cálculo de notas (tareas requeridas, puntaje máximo)</div>
              <div>• La tabla muestra los tipos de ajuste disponibles en el sistema</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Tipos de ajuste registrados</div>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tipos.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">♿</div>
              <div className="font-semibold">Sin tipos de ajuste configurados</div>
              <div className="text-xs mt-2 text-gray-400">
                Ejecuta el SQL de migración v3 en Supabase para cargar los tipos de ajuste.
              </div>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Nombre</th><th>Descripción</th><th>Activo</th></tr></thead>
                <tbody>
                  {tipos.map((t: any) => (
                    <tr key={t.id}>
                      <td className="font-semibold">{t.nombre}</td>
                      <td className="text-sm text-gray-500">{t.descripcion ?? '—'}</td>
                      <td><span className={`badge ${t.activo ? 'badge-green' : 'badge-gray'}`}>{t.activo ? 'Activo' : 'Inactivo'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
