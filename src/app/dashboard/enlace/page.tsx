'use client'
// src/app/dashboard/enlace/page.tsx
// Dashboard del Enlace Institucional
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function EnlaceDashboard() {
  const [datos,   setDatos]   = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/inscripciones?ciclo=2026&estado=en_curso').then(r => r.json()).catch(() => ({ data: [] })),
      fetch('/api/permisos').then(r => r.json()).catch(() => []),
    ]).then(([insc, perms]) => {
      setDatos({
        inscripciones: insc.data ?? [],
        permisos: Array.isArray(perms) ? perms : [],
      })
    }).finally(() => setLoading(false))
  }, [])

  const tienePermiso = (permiso: string) =>
    (datos?.permisos ?? []).some((p: any) => p.permiso === permiso && p.activo)

  const MODULOS = [
    {
      href:    '/dashboard/enlace/estudiantes',
      icon:    '🎓',
      title:   'Ver Estudiantes',
      desc:    'Consultar listado de estudiantes inscritos',
      permiso: null, // siempre disponible
      color:   'border-blue-200 hover:border-blue-400',
    },
    {
      href:    '/dashboard/enlace/notas',
      icon:    '📝',
      title:   'Ingresar Notas',
      desc:    'Registrar notas de tareas y exámenes',
      permiso: 'ingresar_notas_enlace',
      color:   'border-purple-200 hover:border-purple-400',
    },
    {
      href:    '/dashboard/enlace/documentos',
      icon:    '📎',
      title:   'Ver Documentos',
      desc:    'Consultar documentos de estudiantes',
      permiso: 'ver_documentos_enlace',
      color:   'border-green-200 hover:border-green-400',
    },
    {
      href:    '/dashboard/enlace/inscribir',
      icon:    '📋',
      title:   'Inscribir Estudiante',
      desc:    'Registrar nuevo estudiante',
      permiso: 'inscribir_estudiantes_enlace',
      color:   'border-yellow-200 hover:border-yellow-400',
    },
  ]

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">🔗 Dashboard Enlace</div></header>
      <div className="pc flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  const inscripciones = datos?.inscripciones ?? []

  // Agrupar por etapa
  const porEtapa: Record<string, number> = {}
  inscripciones.forEach((i: any) => {
    const e = (i.etapa as any)?.nombre ?? '—'
    porEtapa[e] = (porEtapa[e] ?? 0) + 1
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">🔗 Portal del Enlace Institucional</div>
      </header>

      <div className="pc">
        {/* KPIs */}
        <div className="g3 mb-5">
          <div className="sc blue text-center">
            <div className="text-3xl mb-1">🎓</div>
            <div className="text-2xl font-extrabold text-gray-800">{inscripciones.length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Estudiantes en mi institución</div>
          </div>
          <div className="sc green text-center">
            <div className="text-3xl mb-1">📚</div>
            <div className="text-2xl font-extrabold text-gray-800">{Object.keys(porEtapa).length}</div>
            <div className="text-xs text-gray-500 mt-0.5">Etapas activas</div>
          </div>
          <div className="sc purple text-center">
            <div className="text-3xl mb-1">✅</div>
            <div className="text-2xl font-extrabold text-gray-800">
              {MODULOS.filter(m => !m.permiso || tienePermiso(m.permiso)).length}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">Módulos disponibles</div>
          </div>
        </div>

        {/* Módulos disponibles */}
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          {MODULOS.map(m => {
            const disponible = !m.permiso || tienePermiso(m.permiso)
            return (
              <div key={m.href} className={`card border-2 transition-all ${disponible ? m.color + ' cursor-pointer' : 'border-gray-100 opacity-50 cursor-not-allowed'}`}>
                {disponible ? (
                  <Link href={m.href} className="flex items-start gap-3 block">
                    <div className="text-3xl flex-shrink-0">{m.icon}</div>
                    <div>
                      <div className="font-bold text-gray-800">{m.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                      <span className="badge badge-green text-xs mt-1">Disponible</span>
                    </div>
                  </Link>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="text-3xl flex-shrink-0 grayscale">{m.icon}</div>
                    <div>
                      <div className="font-bold text-gray-400">{m.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{m.desc}</div>
                      <span className="badge badge-gray text-xs mt-1">Sin permiso — solicitar al director</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Listado rápido de estudiantes */}
        {inscripciones.length > 0 && (
          <div className="card">
            <div className="card-title">
              🎓 Mis estudiantes
              <span className="text-xs text-gray-400 font-normal">{inscripciones.length} inscritos · ciclo 2026</span>
            </div>
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Código</th><th>Estudiante</th><th>Etapa</th><th>Versión</th><th>Estado</th></tr></thead>
                <tbody>
                  {inscripciones.slice(0, 15).map((i: any) => {
                    const e = i.estudiante as any
                    return (
                      <tr key={i.id}>
                        <td className="font-mono text-xs">{e?.codigo_estudiante}</td>
                        <td className="font-semibold">{e?.primer_nombre} {e?.primer_apellido}</td>
                        <td className="text-sm">{(i.etapa as any)?.nombre}</td>
                        <td><span className={`badge text-xs ${i.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{i.version_libro}</span></td>
                        <td><span className="badge badge-green text-xs">{i.estado}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {inscripciones.length > 15 && (
                <div className="text-center text-xs text-gray-400 py-2 border-t">
                  Mostrando 15 de {inscripciones.length} · <Link href="/dashboard/enlace/estudiantes" className="text-pronea underline">Ver todos</Link>
                </div>
              )}
            </div>
          </div>
        )}

        {inscripciones.length === 0 && (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <div className="font-semibold">Sin estudiantes inscritos</div>
            <div className="text-sm mt-1">Los técnicos deben inscribir estudiantes para que aparezcan aquí</div>
          </div>
        )}
      </div>
    </div>
  )
}
