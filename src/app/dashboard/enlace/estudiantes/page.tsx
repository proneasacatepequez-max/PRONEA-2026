'use client'
// src/app/dashboard/enlace/estudiantes/page.tsx
// CORRECCIONES:
// 1. Usa /api/inscripciones (que ya filtra por institución del enlace)
// 2. Botón de notas solo visible si el enlace tiene permiso activo
// 3. Muestra sede de inscripción para contexto
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EnlaceEstudiantesPage() {
  const [inscripciones,  setInscripciones]  = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [tienePermNotas, setTienePermNotas] = useState(false)
  const [buscar,         setBuscar]         = useState('')
  const [ciclo,          setCiclo]          = useState('2026')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      // inscripciones ya filtra por institución del enlace (corregido en Batch 2)
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`)
        .then(r => r.json()).catch(() => ({ data: [] })),
      // verificar permiso de notas
      fetch('/api/permisos').then(r => r.json()).catch(() => []),
    ]).then(([ins, perms]) => {
      setInscripciones(ins.data ?? [])
      const tieneNota = Array.isArray(perms) &&
        perms.some((p: any) => p.permiso === 'ingresar_notas_enlace' && p.activo)
      setTienePermNotas(tieneNota)
    }).finally(() => setLoading(false))
  }, [ciclo])

  const filtrados = inscripciones.filter(i => {
    const e = i.estudiante as any
    const txt = `${e?.primer_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''}`.toLowerCase()
    return !buscar || txt.includes(buscar.toLowerCase())
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Estudiantes de mi Institución</div>
          <div className="text-xs text-gray-400">
            {filtrados.length} estudiante(s) · ciclo {ciclo}
          </div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
        </div>
      </header>

      <div className="pc">
        {/* Aviso de permiso de notas */}
        {tienePermNotas && (
          <div className="alert al-s mb-4 text-sm">
            ✅ Tienes autorización para ingresar notas. Usa el botón 📝 en cada estudiante.
          </div>
        )}
        {!tienePermNotas && (
          <div className="alert al-i mb-4 text-sm">
            ℹ️ Solo tienes acceso de lectura. Para ingresar notas, solicita al técnico
            que gestione la autorización con el director.
          </div>
        )}

        {/* Buscador */}
        <div className="card mb-4">
          <input
            className="inp"
            placeholder="🔍 Buscar por nombre o código..."
            value={buscar}
            onChange={e => setBuscar(e.target.value)}
          />
        </div>

        <div className="card">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">🎓</div>
              <div className="font-semibold text-gray-600">
                {buscar ? 'Sin resultados para la búsqueda' : 'Sin estudiantes en tu institución'}
              </div>
              {!buscar && (
                <div className="text-sm mt-2 text-gray-400">
                  Los estudiantes aparecen cuando son inscritos en una sede de tu institución
                </div>
              )}
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-28">Código</th>
                    <th>Nombre</th>
                    <th className="w-32">Etapa</th>
                    <th className="w-20">Libro</th>
                    <th>Sede</th>
                    <th className="w-20 text-center">Estado</th>
                    {tienePermNotas && <th className="w-20 text-center">Notas</th>}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((i: any) => {
                    const e = i.estudiante as any
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs text-gray-500">
                          {e?.codigo_estudiante}
                        </td>
                        <td>
                          <div className="font-semibold text-sm">
                            {e?.primer_nombre} {e?.primer_apellido}
                          </div>
                          <div className="text-xs text-gray-400">{e?.telefono}</div>
                        </td>
                        <td className="text-sm">{(i.etapa as any)?.nombre ?? '—'}</td>
                        <td>
                          <span className={`badge text-xs ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {i.version_libro === 'nuevo' ? '📗' : '📙'} {i.version_libro}
                          </span>
                        </td>
                        <td className="text-xs text-gray-500">
                          {(i.sede as any)?.nombre ?? '—'}
                        </td>
                        <td className="text-center">
                          <span className={`badge text-xs ${i.estado === 'en_curso' ? 'badge-green' : 'badge-gray'}`}>
                            {i.estado === 'en_curso' ? 'Activo' : i.estado}
                          </span>
                        </td>
                        {tienePermNotas && (
                          <td className="text-center">
                            <Link
                              href={`/dashboard/enlace/notas?id=${i.id}`}
                              className="btn btn-p btn-sm"
                              title="Ingresar notas"
                            >
                              📝
                            </Link>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
