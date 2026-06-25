// src/app/dashboard/tecnico/sedes-enlaces/page.tsx
// FIX #11: Tabla para técnico ver sus sedes y enlaces
'use client'
import { useState, useEffect } from 'react'

export default function TecnicoSedesEnlacesPage() {
  const [sedes, setSedes] = useState<any[]>([])
  const [enlaces, setEnlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)

      // Cargar sedes del técnico
      const resSedes = await fetch('/api/tecnico/sedes')
        .then(r => r.json())
        .catch(() => [])
      setSedes(Array.isArray(resSedes) ? resSedes : [])

      // Cargar enlaces del técnico
      const resEnlaces = await fetch('/api/tecnico/enlaces')
        .then(r => r.json())
        .catch(() => [])
      setEnlaces(Array.isArray(resEnlaces) ? resEnlaces : [])

      setLoading(false)
    }

    cargar()
  }, [])

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏢 Mis Sedes y Enlaces</div>
          <div className="text-xs text-gray-400">Visualiza las sedes y enlaces bajo tu responsabilidad</div>
        </div>
      </header>

      <div className="pc space-y-6">
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Sedes */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">🏢 Sedes a Cargo</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : sedes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">🏢</div>
              Sin sedes asignadas
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sedes.map((sede: any) => (
                <div
                  key={sede.id}
                  className="p-4 border-l-4 border-blue-500 bg-gradient-to-r from-blue-50 to-transparent rounded hover:shadow-md transition-shadow"
                >
                  <div className="font-bold text-sm">{sede.nombre}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    📍 {sede.municipio?.nombre || 'Municipio no especificado'}
                  </div>
                  {sede.direccion && (
                    <div className="text-xs text-gray-400 mt-1">📮 {sede.direccion}</div>
                  )}
                  {sede.telefono && (
                    <div className="text-xs text-gray-400 mt-1">📞 {sede.telefono}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Enlaces */}
        <div className="card">
          <h3 className="font-bold text-lg mb-4">🔗 Enlaces Institucionales</h3>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : enlaces.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">🔗</div>
              Sin enlaces asignados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white">
                    <th className="px-3 py-2 text-left font-bold">Nombre</th>
                    <th className="px-3 py-2 text-left font-bold">Sede</th>
                    <th className="px-3 py-2 text-left font-bold">Email</th>
                    <th className="px-3 py-2 text-left font-bold">Teléfono</th>
                  </tr>
                </thead>
                <tbody>
                  {enlaces.map((enlace: any, idx: number) => (
                    <tr
                      key={enlace.id}
                      className={`border-b hover:bg-green-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-green-50/20'}`}
                    >
                      <td className="px-3 py-2 font-semibold">
                        {enlace.primer_nombre} {enlace.primer_apellido}
                      </td>
                      <td className="px-3 py-2">{enlace.sede?.nombre || '—'}</td>
                      <td className="px-3 py-2 font-mono text-xs">{enlace.usuario?.correo || '—'}</td>
                      <td className="px-3 py-2">{enlace.telefono || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <div className="text-3xl font-bold text-blue-600">{sedes.length}</div>
            <div className="text-sm text-gray-500">Sedes a cargo</div>
          </div>
          <div className="card">
            <div className="text-3xl font-bold text-green-600">{enlaces.length}</div>
            <div className="text-sm text-gray-500">Enlaces asignados</div>
          </div>
        </div>
      </div>
    </div>
  )
}
