'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

export default function TecnicoDashboard() {
  const [stats,   setStats]   = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ciclo,   setCiclo]   = useState('2026')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/dashboard/tecnico?ciclo=${ciclo}`)
      const d   = await res.json()
      if (res.ok) setStats(d)
    } catch {}
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const porEtapa = stats?.porEtapa ?? {}
  const porSede  = stats?.porSede  ?? {}
  const e        = stats?.estadisticas ?? {}
  const tec      = stats?.tecnico

  const modulos = [
    { href:'/dashboard/tecnico/estudiantes', icon:'🎓', title:'Mis Estudiantes',         desc:'Ver listado con sedes y enlaces', color:'border-blue-200 hover:border-blue-400'   },
    { href:'/dashboard/tecnico/inscribir',   icon:'📋', title:'Inscribir Estudiante',     desc:'Registrar nuevo estudiante',      color:'border-green-200 hover:border-green-400' },
    { href:'/dashboard/tecnico/notas',       icon:'📝', title:'Ingresar Notas',           desc:'Calificaciones de tareas y exámenes', color:'border-purple-200 hover:border-purple-400' },
    { href:'/dashboard/tecnico/escalas',     icon:'📊', title:'Escalas Numéricas',        desc:'Ver y asignar escalas de calificación', color:'border-orange-200 hover:border-orange-400' },
    { href:'/dashboard/tecnico/sedes-enlaces',icon:'🏫',title:'Mis Sedes y Enlaces',      desc:'Ver sedes y enlaces a tu cargo',  color:'border-teal-200 hover:border-teal-400'   },
    { href:'/dashboard/tecnico/ajustes',     icon:'♿', title:'Adecuaciones Curriculares',desc:'Ajustes para discapacidad',       color:'border-yellow-200 hover:border-yellow-400'},
    { href:'/dashboard/tecnico/dua',         icon:'📐', title:'Planificación DUA',        desc:'Diseño Universal para el Aprendizaje', color:'border-indigo-200 hover:border-indigo-400'},
    { href:'/dashboard/tecnico/sireex',      icon:'📤', title:'Grupos SIREEX',            desc:'Exportación de grupos',           color:'border-red-200 hover:border-red-400'     },
    { href:'/dashboard/tecnico/sesiones',    icon:'🗓️', title:'Sesiones de Tutoría',      desc:'Planificar y registrar sesiones', color:'border-pink-200 hover:border-pink-400'   },
    { href:'/dashboard/tecnico/recursos',    icon:'🎬', title:'Recursos de Apoyo',        desc:'Material didáctico',              color:'border-gray-200 hover:border-gray-400'   },
  ]

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">
            👋 {loading ? 'Cargando...' : `Bienvenido, ${tec?.primer_nombre ?? 'Técnico'}`}
          </div>
          <div className="text-xs text-gray-400">
            Código: {tec?.codigo_tecnico ?? '—'} · Ciclo {ciclo}
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
            { label:'Sedes a cargo',        valor: loading ? '…' : e.totalSedes,       icon:'🏫', color:'green'  },
            { label:'Enlaces a cargo',      valor: loading ? '…' : e.totalEnlaces,     icon:'🔗', color:'yellow' },
            { label:'Notas registradas',    valor: loading ? '…' : e.totalNotas,       icon:'📝', color:'purple' },
          ].map(s => (
            <div key={s.label} className={`sc ${s.color} text-center`}>
              <div className="text-3xl mb-1">{s.icon}</div>
              <div className="text-2xl font-extrabold text-gray-800">{s.valor}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

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

        {/* Distribuciones */}
        {!loading && (Object.keys(porEtapa).length > 0 || Object.keys(porSede).length > 0) && (
          <div className="g2">
            {Object.keys(porEtapa).length > 0 && (
              <div className="card">
                <div className="card-title">📚 Estudiantes por etapa</div>
                {Object.entries(porEtapa).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([etapa, count]) => (
                  <div key={etapa} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-600 w-36 truncate">{etapa}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${e.totalEstudiantes > 0 ? ((count as number)/e.totalEstudiantes*100) : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold w-5 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
            {Object.keys(porSede).length > 0 && (
              <div className="card">
                <div className="card-title">🏫 Estudiantes por sede</div>
                {Object.entries(porSede).sort((a,b) => (b[1] as number)-(a[1] as number)).map(([sede, count]) => (
                  <div key={sede} className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-600 w-36 truncate">{sede}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <div className="bg-green-400 h-2 rounded-full"
                        style={{ width: `${e.totalEstudiantes > 0 ? ((count as number)/e.totalEstudiantes*100) : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold w-5 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sin estudiantes */}
        {!loading && e.totalEstudiantes === 0 && (
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
