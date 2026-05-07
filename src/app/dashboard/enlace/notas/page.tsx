'use client'
// src/app/dashboard/enlace/notas/page.tsx
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { useState, useEffect, useCallback } from 'react'

function EnlaceNotasContent() {
  const sp      = useSearchParams()
  const inscId  = sp.get('id') ?? ''
  const [tab, setTab]       = useState('tareas')
  const [libro, setLibro]   = useState<any>(null)
  const [tareas, setTareas] = useState<any[]>([])
  const [examenes, setExamenes] = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [numLibro, setNumLibro] = useState('1')

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const res = await fetch(`/api/notas?inscripcion_id=${inscId}&numero_libro=${numLibro}&tipo=${tab}`)
    const d = await res.json()
    if (!res.ok) { setMsg('❌ ' + (d.error ?? 'Error')); setLoading(false); return }
    setLibro(d.libro)
    if (tab === 'tareas') setTareas(d.tareas ?? [])
    else setExamenes(d.examenes ?? [])
    setLoading(false)
  }, [inscId, numLibro, tab])

  useEffect(() => { if (inscId) cargar() }, [inscId, numLibro])
  useEffect(() => { if (inscId) cargar() }, [tab])

  const guardar = async (tipo: 'tarea'|'examen', id: string, val: number) => {
    const body = tipo === 'tarea'
      ? { tipo, inscripcion_id: inscId, tarea_id: id, nota: val }
      : { tipo, inscripcion_id: inscId, examen_id: id, nota_original: val }
    const res = await fetch('/api/notas', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) })
    const d = await res.json()
    if (!res.ok) { setMsg('❌ ' + d.error); return }
    setMsg('✅ Guardado')
    setTimeout(() => setMsg(''), 1500)
    if (tipo === 'tarea') setTareas(t => t.map(tt => tt.id === id ? { ...tt, nota: val } : tt))
    else setExamenes(e => e.map(ee => ee.id === id ? { ...ee, nota_original: val } : ee))
  }

  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc">
        <div className="alert al-w">Ve a la lista de estudiantes y selecciona un estudiante para ingresar notas.</div>
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📝 Ingresar Notas</div>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span>}
          {libro && <span className={`badge ${libro.version === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{libro.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}</span>}
          <select className="inp w-28" value={numLibro} onChange={e => setNumLibro(e.target.value)}>
            <option value="1">Libro 1</option>
            <option value="2">Libro 2</option>
          </select>
        </div>
      </header>
      <div className="pc">
        <div className="tabs mb-4">
          <div className={`tab ${tab === 'tareas' ? 'act' : ''}`} onClick={() => setTab('tareas')}>📋 Tareas</div>
          <div className={`tab ${tab === 'examenes' ? 'act' : ''}`} onClick={() => setTab('examenes')}>📊 Exámenes</div>
        </div>
        <div className="card">
          {loading ? <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          : tab === 'tareas' ? (
            tareas.length === 0 ? <div className="text-center py-8 text-gray-400">Sin tareas configuradas</div>
            : <div className="tw"><table className="tbl">
                <thead><tr><th>#</th><th>Tarea</th><th>Nota (0-5)</th><th>Estado</th></tr></thead>
                <tbody>
                  {tareas.map((t: any) => (
                    <tr key={t.id}>
                      <td className="text-gray-400 text-xs">{t.numero_tarea}</td>
                      <td className="font-semibold">{t.nombre}</td>
                      <td>
                        <input type="number" min={0} max={5} step={0.5}
                          defaultValue={t.nota ?? ''}
                          onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== t.nota) guardar('tarea', t.id, v) }}
                          className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary"
                        />
                      </td>
                      <td>{t.nota === null ? <span className="badge badge-yellow">Pendiente</span> : <span className="badge badge-green">✓ {t.nota}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
          ) : (
            examenes.length === 0 ? <div className="text-center py-8 text-gray-400">Sin exámenes configurados</div>
            : <div className="tw"><table className="tbl">
                <thead><tr><th>Área</th><th>Examen</th><th>Nota (0-100)</th><th>Estado</th></tr></thead>
                <tbody>
                  {examenes.map((ex: any) => (
                    <tr key={ex.id}>
                      <td>{(ex.area as any)?.nombre}</td>
                      <td>{ex.nombre}</td>
                      <td>
                        <input type="number" min={0} max={100}
                          defaultValue={ex.nota_original ?? ''}
                          onBlur={e => { const v = parseFloat(e.target.value); if (!isNaN(v) && v !== ex.nota_original) guardar('examen', ex.id, v) }}
                          className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary"
                        />
                      </td>
                      <td>{ex.nota_original === null ? <span className="badge badge-yellow">Pendiente</span> : <span className="badge badge-green">{ex.nota_original}%</span>}</td>
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

export default function EnlaceNotasPage() {
  return (
    <Suspense fallback={<div className="ap"><header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header><div className="pc text-center py-12 text-gray-400">Cargando...</div></div>}>
      <EnlaceNotasContent />
    </Suspense>
  )
}
