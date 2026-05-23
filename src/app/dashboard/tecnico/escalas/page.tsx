'use client'
// src/app/dashboard/tecnico/escalas/page.tsx
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function EscalasContent() {
  const sp     = useSearchParams()
  const inscId = sp.get('id') ?? ''
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [msg,     setMsg]     = useState('')
  const [generando, setGenerando] = useState<string|null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const res = await fetch(`/api/escalas?inscripcion_id=${inscId}`)
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + (d.error ?? 'Error')); setLoading(false); return }
    setData(d); setLoading(false)
  }, [inscId])

  useEffect(() => { cargar() }, [cargar])

  const generarEscala = async (libroId: string) => {
    setGenerando(libroId)
    const res = await fetch('/api/escalas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inscripcion_id: inscId, libro_id: libroId }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) } else {
      flash(d.ya_existia ? `ℹ️ Escala ya existe: ${d.numero_escala}` : `✅ Escala generada: ${d.numero_escala}`)
    }
    setGenerando(null)
  }

  const nota2color = (n: number|null) => {
    if (n === null) return 'text-gray-400'
    if (n >= 70) return 'text-green-600'
    if (n >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📊 Escalas Numéricas</div></header>
      <div className="pc"><div className="alert al-w">Selecciona un estudiante desde <Link href="/dashboard/tecnico/estudiantes" className="underline">Mis Estudiantes</Link>.</div></div>
    </div>
  )

  const est  = data?.inscripcion?.estudiante as any
  const insc = data?.inscripcion as any

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Escalas Numéricas</div>
          {est && <div className="text-xs text-gray-400">{est.primer_nombre} {est.primer_apellido} · {est.codigo_estudiante}</div>}
        </div>
        <Link href="/dashboard/tecnico/estudiantes" className="btn btn-g">← Volver</Link>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') || msg.startsWith('ℹ️') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Info estudiante */}
        {insc && (
          <div className="card mb-5 border-l-4 border-l-pronea">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div><div className="lbl">Estudiante</div><div className="font-bold">{est?.primer_nombre} {est?.primer_apellido}</div></div>
              <div><div className="lbl">Etapa</div><div className="font-bold">{(insc.etapa as any)?.nombre}</div></div>
              <div><div className="lbl">Sede</div><div className="font-bold">{(insc.sede as any)?.nombre}</div></div>
              <div><div className="lbl">Versión libro</div><div className="font-bold">{insc.version_libro === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}</div></div>
              <div><div className="lbl">CUI</div><div className="font-bold font-mono text-xs">{est?.cui || 'Pendiente'}</div></div>
              <div><div className="lbl">Código</div><div className="font-bold font-mono text-xs">{est?.codigo_estudiante}</div></div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : (data?.libros ?? []).length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">📊</div>
            <div>Sin libros configurados. El administrador debe crear los libros.</div>
          </div>
        ) : (
          (data?.libros ?? []).map((libro: any) => (
            <div key={libro.id} className="card mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="card-title mb-0">
                    {libro.version === 'nuevo' ? '📗' : '📙'} {libro.nombre}
                    <span className="text-xs text-gray-400 font-normal ml-2">Libro {libro.numero}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{libro.tareas_ingresadas}/{(libro.tareas ?? []).length} tareas ingresadas</div>
                </div>
                <button
                  className="btn btn-p btn-sm"
                  onClick={() => generarEscala(libro.id)}
                  disabled={generando === libro.id}>
                  {generando === libro.id ? '...' : '📋 Generar escala'}
                </button>
              </div>

              {/* Cálculo zona / examen / nota final */}
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Zona (tareas)',    valor: libro.zona !== null ? `${libro.zona}` : '—', sub: 'máx 40 pts' },
                  { label: 'Prom. examen',     valor: libro.promedio_examen !== null ? `${libro.promedio_examen}%` : '—', sub: '' },
                  { label: 'Examen (60%)',      valor: libro.nota_examen_final !== null ? `${libro.nota_examen_final}` : '—', sub: 'máx 60 pts' },
                  { label: 'Nota final',        valor: libro.nota_final !== null ? `${libro.nota_final}` : '—', sub: 'máx 100 pts' },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <div className={`text-xl font-extrabold ${nota2color(libro.nota_final ? parseFloat(libro.nota_final) : null)}`}>{s.valor}</div>
                    <div className="text-xs text-gray-500">{s.label}</div>
                    {s.sub && <div className="text-[10px] text-gray-400">{s.sub}</div>}
                  </div>
                ))}
              </div>

              {/* Tareas agrupadas por área */}
              {(libro.tareas ?? []).length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-500 mb-2">DETALLE DE TAREAS:</div>
                  <div className="tw">
                    <table className="tbl">
                      <thead><tr><th>#</th><th>Tarea</th><th>Área</th><th>Nota</th></tr></thead>
                      <tbody>
                        {libro.tareas.map((t: any) => (
                          <tr key={t.id} className={t.nota === null ? 'bg-yellow-50/50' : ''}>
                            <td className="text-gray-400 text-xs">{t.numero_tarea}</td>
                            <td className="text-sm">{t.nombre}</td>
                            <td className="text-xs text-gray-500">{(t.area as any)?.nombre}</td>
                            <td>
                              {t.nota !== null
                                ? <span className={`font-bold ${t.nota >= 3 ? 'text-green-600' : t.nota >= 2 ? 'text-yellow-600' : 'text-red-500'}`}>{t.nota}</span>
                                : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function EscalasPage() {
  return (
    <Suspense fallback={<div className="ap"><header className="topbar"><div className="page-title">📊 Escalas</div></header><div className="pc text-center py-12 text-gray-400">Cargando...</div></div>}>
      <EscalasContent />
    </Suspense>
  )
}
