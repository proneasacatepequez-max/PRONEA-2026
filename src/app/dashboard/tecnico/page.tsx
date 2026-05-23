'use client'
// src/app/dashboard/tecnico/page.tsx
// Dashboard principal del técnico — muestra todo lo que necesita
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function TecnicoDashboard() {
  const [perfil,      setPerfil]      = useState<any>(null)
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [ciclo,       setCiclo]       = useState('2026')

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const [p, i] = await Promise.all([
        fetch('/api/tecnicos?mi_perfil=1').then(r => r.json()).catch(() => null),
        fetch(`/api/inscripciones?ciclo=${ciclo}&estado=en_curso`).then(r => r.json()).catch(() => ({ data: [] })),
      ])
      setPerfil(p)
      setInscripciones(i.data ?? [])
      setLoading(false)
    }
    cargar()
  }, [ciclo])

  // Estadísticas
  const porEtapa: Record<string, number> = {}
  const porSede:  Record<string, number> = {}
  inscripciones.forEach((i: any) => {
    const etapa = (i.etapa as any)?.nombre ?? '—'
    const sede  = (i.sede  as any)?.nombre ?? '—'
    porEtapa[etapa] = (porEtapa[etapa] ?? 0) + 1
    porSede[sede]   = (porSede[sede]   ?? 0) + 1
  })

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📊 Mi Dashboard</div></header>
      <div className="pc flex justify-center py-20">
        <div className="w-10 h-10 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">
            👋 Bienvenido, {perfil?.primer_nombre ?? 'Técnico'}
          </div>
          <div className="text-xs text-gray-400">
            Código: {perfil?.codigo_tecnico ?? '—'} · Ciclo {ciclo}
          </div>
        </div>
        <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
          <option value="2026">2026</option>
          <option value="2025">2025</option>
        </select>
      </header>

      <div className="pc">
        {/* KPIs */}
        <div className="g4 mb-5">
          {[
            { label: 'Estudiantes activos', valor: inscripciones.length, icon: '🎓', color: 'blue' },
            { label: 'Sedes',               valor: Object.keys(porSede).length, icon: '🏫', color: 'green' },
            { label: 'Etapas',              valor: Object.keys(porEtapa).length, icon: '📚', color: 'purple' },
            { label: 'Ciclo escolar',        valor: ciclo, icon: '📅', color: 'yellow' },
          ].map(s => (
            <div key={s.label} className={`sc ${s.color} text-center`}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Menú de módulos */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-5">
          {[
            { href: '/dashboard/tecnico/estudiantes', icon: '🎓', title: 'Mis Estudiantes', desc: 'Ver listado, datos e historial de inscripciones', color: 'border-blue-200 hover:border-blue-400' },
            { href: '/dashboard/tecnico/inscribir',  icon: '📋', title: 'Inscribir Estudiante', desc: 'Registrar nuevo estudiante en el sistema', color: 'border-green-200 hover:border-green-400' },
            { href: '/dashboard/tecnico/notas',      icon: '📝', title: 'Ingresar Notas', desc: 'Notas de tareas y exámenes por libro', color: 'border-purple-200 hover:border-purple-400' },
            { href: '/dashboard/tecnico/escalas',    icon: '📊', title: 'Escalas Numéricas', desc: 'Generar y visualizar escalas de calificación', color: 'border-orange-200 hover:border-orange-400' },
            { href: '/dashboard/tecnico/ajustes',    icon: '♿', title: 'Adecuaciones Curriculares', desc: 'Ajustes para estudiantes con discapacidad', color: 'border-yellow-200 hover:border-yellow-400' },
            { href: '/dashboard/tecnico/dua',        icon: '📐', title: 'Planificación DUA', desc: 'Diseño Universal para el Aprendizaje', color: 'border-teal-200 hover:border-teal-400' },
            { href: '/dashboard/tecnico/sireex',     icon: '📤', title: 'Grupos SIREEX', desc: 'Gestión de grupos para exportación SIREEX', color: 'border-red-200 hover:border-red-400' },
            { href: '/dashboard/tecnico/sesiones',   icon: '🗓️', title: 'Sesiones de Tutoría', desc: 'Planificar y registrar sesiones de clase', color: 'border-indigo-200 hover:border-indigo-400' },
            { href: '/dashboard/tecnico/recursos',   icon: '🎬', title: 'Recursos de Apoyo', desc: 'Material didáctico y videos educativos', color: 'border-pink-200 hover:border-pink-400' },
          ].map(m => (
            <Link key={m.href} href={m.href}
              className={`card border-2 ${m.color} hover:shadow-md transition-all cursor-pointer block`}>
              <div className="flex items-start gap-3">
                <div className="text-3xl flex-shrink-0">{m.icon}</div>
                <div>
                  <div className="font-bold text-gray-800 text-sm">{m.title}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Distribución por etapa */}
        {inscripciones.length > 0 && (
          <div className="g2">
            <div className="card">
              <div className="card-title">📚 Estudiantes por etapa</div>
              {Object.entries(porEtapa).map(([etapa, count]) => (
                <div key={etapa} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-36 truncate">{etapa}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-pronea-secondary h-2 rounded-full"
                      style={{ width: `${inscripciones.length > 0 ? (count/inscripciones.length*100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-title">🏫 Estudiantes por sede</div>
              {Object.entries(porSede).map(([sede, count]) => (
                <div key={sede} className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-600 w-36 truncate">{sede}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full"
                      style={{ width: `${inscripciones.length > 0 ? (count/inscripciones.length*100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold w-5 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sin estudiantes */}
        {inscripciones.length === 0 && !loading && (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <div className="font-semibold text-gray-600">Sin estudiantes inscritos en {ciclo}</div>
            <Link href="/dashboard/tecnico/inscribir" className="btn btn-p mt-4 inline-block">
              ＋ Inscribir primer estudiante
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
