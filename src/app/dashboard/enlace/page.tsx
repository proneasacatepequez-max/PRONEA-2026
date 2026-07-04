'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function EnlaceDashboard() {
  const [stats,   setStats]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ciclo,   setCiclo]   = useState('2026')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/enlace?ciclo=${ciclo}`)
      const d   = await res.json()
      if (res.ok) setStats(d)
    } catch {}
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const e   = stats?.estadisticas ?? {}
  const enl = stats?.enlace

  const porEtapa = stats?.porEtapa ?? {}

  const modulos = [
    { href:'/dashboard/enlace/estudiantes', icon:'🎓', title:'Estudiantes que he inscrito', desc:'Ver listado y datos de los estudiantes que registraste',     color:'border-blue-200 hover:border-blue-400',   permiso: null },
    { href:'/dashboard/enlace/inscribir',   icon:'➕', title:'Inscribir Estudiante',       desc:'Registrar nuevo estudiante en tu sede',            color:'border-green-200 hover:border-green-400', permiso: null },
    { href:'/dashboard/enlace/notas',       icon:'📝', title:'Ingresar Notas',             desc:'Calificaciones (requiere autorización del director)', color:'border-purple-200 hover:border-purple-400', permiso: 'ingresar_notas_enlace' },
    { href:'/dashboard/enlace/recursos',    icon:'🎬', title:'Recursos de Apoyo',          desc:'Material didáctico y videos educativos',           color:'border-orange-200 hover:border-orange-400', permiso: null },
    { href:'/dashboard/enlace/perfil',      icon:'👤', title:'Mi Perfil',                  desc:'Ver y actualizar mis datos',                       color:'border-gray-200 hover:border-gray-400',   permiso: null },
  ]

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">
            👋 {loading ? 'Cargando...' : `Bienvenido, ${enl?.primer_nombre ?? 'Enlace'}`}
          </div>
          <div className="text-xs text-gray-400">
            {enl?.cargo ? `${enl.cargo} · ` : ''}
            {enl?.sede?.nombre ? `🏫 ${enl.sede.nombre}` : ''}
            {enl?.tecnico ? ` · Técnico: ${enl.tecnico.primer_nombre} ${enl.tecnico.primer_apellido}` : ''}
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
            { label:'Estudiantes activos', valor: loading ? '…' : e.totalEstudiantes, icon:'🎓', color:'blue'   },
            { label:'Total inscritos',      valor: loading ? '…' : e.totalTodos,       icon:'📋', color:'green'  },
            { label:'Notas ingresadas',     valor: loading ? '…' : e.totalNotas,       icon:'📝', color:'purple' },
            { label:'Permisos activos',     valor: loading ? '…' : e.totalPermisos,    icon:'🔑', color:'yellow' },
          ].map(s => (
            <div key={s.label} className={`sc ${s.color} text-center`}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Alerta si no tiene sede o técnico */}
        {!loading && enl && (!enl.sede?.id || !enl.tecnico?.id) && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 text-sm text-orange-700">
            ⚠️ <strong>Configuración incompleta:</strong>{' '}
            {!enl.sede?.id && 'No tienes sede asignada. '}
            {!enl.tecnico?.id && 'No tienes técnico asignado. '}
            Contacta al administrador para completar tu perfil.
          </div>
        )}

        {/* Módulos */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 mb-5">
          {modulos.map(m => (
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
        {!loading && Object.keys(porEtapa).length > 0 && (
          <div className="card">
            <div className="card-title">📚 Estudiantes que inscribiste por etapa</div>
            <div className="space-y-2 mt-2">
              {Object.entries(porEtapa).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([etapa, count]) => (
                <div key={etapa} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-40 truncate">{etapa}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full"
                      style={{ width: `${e.totalEstudiantes > 0 ? ((count as number)/e.totalEstudiantes*100) : 0}%` }} />
                  </div>
                  <span className="text-xs font-bold w-6 text-right">{count as number}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sin estudiantes */}
        {!loading && e.totalEstudiantes === 0 && (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">🎓</div>
            <div className="font-semibold text-gray-600">Aún no has inscrito estudiantes en {ciclo}</div>
            <Link href="/dashboard/enlace/inscribir" className="btn btn-p mt-4 inline-block">
              ➕ Inscribir primer estudiante
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
