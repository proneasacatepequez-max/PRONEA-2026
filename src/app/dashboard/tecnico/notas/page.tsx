'use client'
// src/app/dashboard/tecnico/notas/page.tsx
// CORRECCIONES:
// 1. Muestra columna PÁGINA del libro
// 2. Vista única ordenada por página — sin tabs de área
// 3. Exámenes aparecen AL FINAL, habilitados solo cuando todas las tareas están ingresadas
// 4. Zona calculada correctamente sobre las tareas ingresadas
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function NotasContent() {
  const sp     = useSearchParams()
  const inscId = sp.get('id') ?? ''

  const [numLibro,  setNumLibro]  = useState('1')
  const [datos,     setDatos]     = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState<string | null>(null)   // tarea_id o examen_id guardándose
  const [msg,       setMsg]       = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const res = await fetch(`/api/notas?inscripcion_id=${inscId}&numero_libro=${numLibro}`)
    const d   = await res.json()
    if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al cargar')); setLoading(false); return }
    setDatos(d)
    setLoading(false)
  }, [inscId, numLibro])

  useEffect(() => { cargar() }, [cargar])

  const guardarTarea = async (tareaId: string, val: string) => {
    const nota = parseFloat(val)
    if (isNaN(nota) || nota < 0 || nota > 5) return
    setSaving(tareaId)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'tarea', inscripcion_id: inscId, tarea_id: tareaId, nota }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else {
      flash('✅ Guardado')
      setDatos((prev: any) => ({
        ...prev,
        tareas: prev.tareas.map((t: any) => t.id === tareaId ? { ...t, nota } : t),
        tareas_ingresadas: prev.tareas.filter((t: any) => t.id === tareaId ? true : t.nota !== null).length,
      }))
    }
    setSaving(null)
  }

  const guardarExamen = async (examenId: string, val: string) => {
    const nota_original = parseFloat(val)
    if (isNaN(nota_original) || nota_original < 0 || nota_original > 100) return
    setSaving(examenId)
    const res = await fetch('/api/notas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'examen', inscripcion_id: inscId, examen_id: examenId, nota_original }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else {
      flash('✅ Guardado')
      setDatos((prev: any) => ({
        ...prev,
        examenes: prev.examenes.map((ex: any) =>
          ex.id === examenId ? { ...ex, nota_original, puntos_obtenidos: d.puntos_obtenidos } : ex),
      }))
    }
    setSaving(null)
  }

  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Registrar Notas</div></header>
      <div className="pc">
        <div className="alert al-w">
          Selecciona un estudiante desde <Link href="/dashboard/tecnico/estudiantes" className="underline font-bold">Mis Estudiantes</Link> para registrar notas.
        </div>
      </div>
    </div>
  )

  const libro    = datos?.libro
  const tareas   = datos?.tareas   ?? []
  const examenes = datos?.examenes ?? []
  const todasListas = datos?.todas_tareas_listas ?? false
  const ingresadas  = datos?.tareas_ingresadas ?? 0
  const total       = datos?.tareas_total ?? 0

  // Zona correcta: suma de notas ingresadas / (total tareas * 5) * 30
  // Usamos 30 porque según el modelo pedagógico las tareas valen 30 pts por área en conjunto
  // Pero a nivel de progreso en pantalla mostramos % completado
  const puntosObt = tareas.filter((t: any) => t.nota !== null).reduce((a: number, t: any) => a + t.nota, 0)
  const puntosMax = tareas.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
  const zonaPct   = puntosMax > 0 ? ((puntosObt / puntosMax) * 100).toFixed(1) : '0.0'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Registrar Notas</div>
          {libro && (
            <div className="text-xs text-gray-400">
              {libro.nombre} · {libro.version === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
              {msg}
            </span>
          )}
          <select className="inp w-28" value={numLibro} onChange={e => setNumLibro(e.target.value)}>
            <option value="1">📗 Libro 1</option>
            <option value="2">📘 Libro 2</option>
          </select>
          <Link href="/dashboard/tecnico/estudiantes" className="btn btn-g">← Volver</Link>
        </div>
      </header>

      <div className="pc">
        {/* Barra de progreso */}
        {total > 0 && (
          <div className="card mb-4 border-l-4 border-l-blue-400">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                Progreso: {ingresadas} / {total} tareas ingresadas
              </span>
              <span className="text-sm font-bold text-blue-700">
                Puntos acumulados: {puntosObt} / {puntosMax} ({zonaPct}%)
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${total > 0 ? (ingresadas / total * 100) : 0}%` }}
              />
            </div>
            {todasListas && (
              <div className="mt-2 text-xs text-green-600 font-bold">
                ✅ Todas las tareas ingresadas — puedes registrar los exámenes abajo
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── TABLA DE TAREAS ordenadas por página ── */}
            <div className="card mb-5">
              <div className="card-title">📋 Tareas del Libro — ordenadas por página</div>
              {tareas.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Sin tareas configuradas. El administrador debe crearlas primero.
                </div>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th className="w-20">Páginas</th>
                        <th>Descripción de la Tarea</th>
                        <th className="w-28">Área</th>
                        <th className="w-20 text-center">Máx.</th>
                        <th className="w-24 text-center">Nota (0–5)</th>
                        <th className="w-20 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tareas.map((t: any) => (
                        <tr key={t.id} className={t.nota === null ? 'bg-yellow-50/60' : ''}>
                          <td className="text-gray-400 text-xs font-mono">{t.numero_tarea}</td>
                          <td className="text-xs text-gray-500 font-mono">{t.paginas ?? '—'}</td>
                          <td>
                            <div className="font-semibold text-sm leading-snug">{t.nombre}</div>
                          </td>
                          <td>
                            <span className="text-xs text-gray-500 bg-gray-100 rounded-md px-2 py-0.5">
                              {(t.area as any)?.nombre ?? '—'}
                            </span>
                          </td>
                          <td className="text-center text-xs font-bold text-gray-500">
                            {t.puntos_max ?? 5}
                          </td>
                          <td className="text-center">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              step={0.5}
                              defaultValue={t.nota ?? ''}
                              disabled={saving === t.id}
                              onBlur={e => {
                                const v = e.target.value.trim()
                                if (v !== '' && v !== String(t.nota)) guardarTarea(t.id, v)
                              }}
                              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              className="w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary transition-colors disabled:opacity-40"
                            />
                          </td>
                          <td className="text-center">
                            {saving === t.id ? (
                              <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                            ) : t.nota === null ? (
                              <span className="badge badge-yellow">Pendiente</span>
                            ) : (
                              <span className="badge badge-green">✓ {t.nota}</span>
                            )}
                            {t.con_ajuste && <span className="badge badge-blue ml-1">♿</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── EXÁMENES — solo se activan cuando todas las tareas están ── */}
            <div className={`card ${!todasListas && tareas.length > 0 ? 'opacity-60' : ''}`}>
              <div className="card-title flex items-center gap-2">
                📊 Exámenes por Área
                {!todasListas && tareas.length > 0 && (
                  <span className="text-xs font-normal text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                    ⚠️ Completa las tareas primero
                  </span>
                )}
              </div>
              {examenes.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  Sin exámenes configurados para este libro.
                </div>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th>Examen</th>
                        <th className="w-24 text-center">Nota (0–100%)</th>
                        <th className="w-24 text-center">Equiv. 20 pts</th>
                        <th className="w-24 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {examenes.map((ex: any) => (
                        <tr key={ex.id}>
                          <td>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">
                              {(ex.area as any)?.nombre ?? '—'}
                            </span>
                          </td>
                          <td className="font-semibold text-sm">{ex.nombre}</td>
                          <td className="text-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              defaultValue={ex.nota_original ?? ''}
                              disabled={(!todasListas && tareas.length > 0) || saving === ex.id}
                              onBlur={e => {
                                const v = e.target.value.trim()
                                if (v !== '' && v !== String(ex.nota_original)) guardarExamen(ex.id, v)
                              }}
                              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                              className="w-20 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none focus:border-pronea-secondary transition-colors disabled:opacity-40"
                            />
                          </td>
                          <td className="text-center text-sm font-bold text-gray-600">
                            {ex.puntos_obtenidos !== null
                              ? <span className="text-green-600">{ex.puntos_obtenidos}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="text-center">
                            {saving === ex.id ? (
                              <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                            ) : ex.nota_original === null ? (
                              <span className="badge badge-yellow">Pendiente</span>
                            ) : (
                              <span className="badge badge-green">{ex.nota_original}%</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function NotasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📝 Registrar Notas</div></header>
        <div className="pc text-center py-12 text-gray-400">Cargando...</div>
      </div>
    }>
      <NotasContent />
    </Suspense>
  )
}
