'use client'
// src/app/dashboard/tecnico/notas/page.tsx
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function NotasContent() {
  const sp = useSearchParams()
  const inscId = sp.get('id') ?? ''
  const [tab,    setTab]    = useState<'tareas'|'examenes'>('tareas')
  const [libro,  setLibro]  = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [exams,  setExams]  = useState<any[]>([])
  const [numLibro, setNumLibro] = useState('1')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const res = await fetch(`/api/notas?inscripcion_id=${inscId}&tipo=${tab}&numero_libro=${numLibro}`)
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al cargar')); setLoading(false); return }
    setLibro(d.libro)
    if (tab === 'tareas') setTareas(d.tareas ?? [])
    else setExams(d.examenes ?? [])
    setLoading(false)
  }, [inscId, tab, numLibro])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async (tipo: 'tarea'|'examen', id: string, val: number) => {
    const body = tipo === 'tarea'
      ? { tipo: 'tarea', inscripcion_id: inscId, tarea_id: id, nota: val }
      : { tipo: 'examen', inscripcion_id: inscId, examen_id: id, nota_original: val }
    const res = await fetch('/api/notas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error); return }
    flash('✅ Guardado')
    if (tipo === 'tarea') setTareas(t => t.map(tt => tt.id === id ? { ...tt, nota: val } : tt))
    else setExams(e => e.map(ee => ee.id === id ? { ...ee, nota_original: val } : ee))
  }

  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc">
        <div className="alert al-w">Selecciona un estudiante desde <Link href="/dashboard/tecnico/estudiantes" className="underline">Mis Estudiantes</Link>.</div>
      </div>
    </div>
  )

  // Calcular zona (promedio de tareas / 5 * 40)
  const tareasConNota = tareas.filter(t => t.nota !== null)
  const zonaCalc = tareas.length > 0
    ? ((tareasConNota.reduce((a, t) => a + (t.nota ?? 0), 0) / tareas.length) / 5 * 40).toFixed(1)
    : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Ingresar Notas</div>
          {libro && <div className="text-xs text-gray-400">{libro.nombre} · {libro.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}</div>}
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
          <select className="inp w-28" value={numLibro} onChange={e => setNumLibro(e.target.value)}>
            <option value="1">Libro 1</option>
            <option value="2">Libro 2</option>
          </select>
          <Link href="/dashboard/tecnico/estudiantes" className="btn btn-g">← Volver</Link>
        </div>
      </header>

      <div className="pc">
        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
          {(['tareas','examenes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${tab === t ? 'bg-white text-pronea shadow-sm' : 'text-gray-500'}`}>
              {t === 'tareas' ? '📋 Tareas (0-5)' : '📊 Exámenes (0-100%)'}
            </button>
          ))}
        </div>

        <div className="card">
          {tab === 'tareas' && tareas.length > 0 && (
            <div className="flex items-center justify-between mb-3 p-3 bg-blue-50 rounded-xl">
              <span className="text-sm font-bold text-blue-700">
                {tareasConNota.length} / {tareas.length} tareas ingresadas
              </span>
              <span className="text-sm font-bold text-blue-700">
                Zona estimada: <b>{zonaCalc}</b>
              </span>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : tab === 'tareas' ? (
            tareas.length === 0
              ? <div className="text-center py-8 text-gray-400">Sin tareas configuradas para este libro</div>
              : <div className="tw"><table className="tbl">
                  <thead><tr><th>#</th><th>Tarea</th><th>Nota (0-5)</th><th>Estado</th></tr></thead>
                  <tbody>
                    {tareas.map((t: any) => (
                      <tr key={t.id} className={t.nota !== null ? '' : 'bg-yellow-50'}>
                        <td className="text-gray-400 text-xs">{t.numero_tarea}</td>
                        <td>
                          <div className="font-semibold text-sm">{t.nombre}</div>
                          <div className="text-xs text-gray-400">{(t.area as any)?.nombre}</div>
                        </td>
                        <td>
                          <input type="number" min={0} max={5} step={0.5}
                            defaultValue={t.nota ?? ''}
                            onBlur={e => {
                              const v = parseFloat(e.target.value)
                              if (!isNaN(v) && v >= 0 && v <= 5 && v !== t.nota) guardar('tarea', t.id, v)
                            }}
                            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary transition-colors"
                          />
                        </td>
                        <td>
                          {t.nota === null
                            ? <span className="badge badge-yellow">Pendiente</span>
                            : <span className="badge badge-green">✓ {t.nota}</span>}
                          {t.con_ajuste && <span className="badge badge-blue ml-1">♿</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
          ) : (
            exams.length === 0
              ? <div className="text-center py-8 text-gray-400">Sin exámenes configurados para este libro</div>
              : <div className="tw"><table className="tbl">
                  <thead><tr><th>Área</th><th>Examen</th><th>Nota (0-100%)</th><th>Estado</th></tr></thead>
                  <tbody>
                    {exams.map((ex: any) => (
                      <tr key={ex.id}>
                        <td className="text-xs">{(ex.area as any)?.nombre}</td>
                        <td className="font-semibold text-sm">{ex.nombre}</td>
                        <td>
                          <input type="number" min={0} max={100}
                            defaultValue={ex.nota_original ?? ''}
                            onBlur={e => {
                              const v = parseFloat(e.target.value)
                              if (!isNaN(v) && v >= 0 && v <= 100 && v !== ex.nota_original) guardar('examen', ex.id, v)
                            }}
                            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary"
                          />
                        </td>
                        <td>
                          {ex.nota_original === null
                            ? <span className="badge badge-yellow">Pendiente</span>
                            : <span className="badge badge-green">{ex.nota_original}%</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table></div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function NotasPage() {
  return (
    <Suspense fallback={<div className="ap"><header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header><div className="pc text-center py-12 text-gray-400">Cargando...</div></div>}>
      <NotasContent />
    </Suspense>
  )
}
