'use client'
// src/app/dashboard/enlace/notas/page.tsx
// CORRECCIONES:
// 1. Misma UX que el técnico: vista por página, sin tabs
// 2. Exámenes al final bloqueados hasta completar tareas
// 3. Columna "Páginas" visible
// 4. Verificación de permiso al cargar — redirige si no tiene autorización
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function EnlaceNotasContent() {
  const sp     = useSearchParams()
  const router = useRouter()
  const inscId = sp.get('id') ?? ''

  const [permChecked, setPermChecked] = useState(false)
  const [tienePermiso, setTienePermiso] = useState(false)
  const [numLibro,  setNumLibro]  = useState('1')
  const [datos,     setDatos]     = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [saving,    setSaving]    = useState<string | null>(null)
  const [msg,       setMsg]       = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  // Verificar permiso primero
  useEffect(() => {
    fetch('/api/permisos').then(r => r.json()).then(perms => {
      const tiene = Array.isArray(perms) &&
        perms.some((p: any) => p.permiso === 'ingresar_notas_enlace' && p.activo)
      setTienePermiso(tiene)
      setPermChecked(true)
    }).catch(() => { setTienePermiso(false); setPermChecked(true) })
  }, [])

  const cargar = useCallback(async () => {
    if (!inscId || !tienePermiso) return
    setLoading(true)
    const res = await fetch(`/api/notas?inscripcion_id=${inscId}&numero_libro=${numLibro}`)
    const d   = await res.json()
    if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al cargar')); setLoading(false); return }
    setDatos(d)
    setLoading(false)
  }, [inscId, numLibro, tienePermiso])

  useEffect(() => { if (permChecked && tienePermiso) cargar() }, [cargar, permChecked])

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

  // Sin inscId
  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc">
        <div className="alert al-w">
          Selecciona un estudiante desde{' '}
          <Link href="/dashboard/enlace/estudiantes" className="underline font-bold">
            Mis Estudiantes
          </Link>{' '}
          para ingresar notas.
        </div>
      </div>
    </div>
  )

  // Verificando permiso
  if (!permChecked) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  // Sin permiso
  if (!tienePermiso) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
      <div className="pc max-w-lg">
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔒</div>
          <div className="font-extrabold text-gray-700 text-lg mb-2">Sin autorización</div>
          <div className="text-sm text-gray-500 mb-5">
            No tienes permiso para ingresar notas.<br />
            Solicita al técnico que gestione la autorización con el director.
          </div>
          <Link href="/dashboard/enlace/estudiantes" className="btn btn-g">
            ← Volver a estudiantes
          </Link>
        </div>
      </div>
    </div>
  )

  const libro       = datos?.libro
  const tareas      = datos?.tareas   ?? []
  const examenes    = datos?.examenes ?? []
  const todasListas = datos?.todas_tareas_listas ?? false
  const ingresadas  = datos?.tareas_ingresadas ?? 0
  const total       = datos?.tareas_total ?? 0

  const puntosObt = tareas.filter((t: any) => t.nota !== null).reduce((a: number, t: any) => a + t.nota, 0)
  const puntosMax = tareas.reduce((a: number, t: any) => a + (t.puntos_max ?? 5), 0)
  const zonaPct   = puntosMax > 0 ? ((puntosObt / puntosMax) * 100).toFixed(1) : '0.0'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📝 Ingresar Notas</div>
          {libro && (
            <div className="text-xs text-gray-400">
              {libro.nombre} · {libro.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}
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
          <Link href="/dashboard/enlace/estudiantes" className="btn btn-g">← Volver</Link>
        </div>
      </header>

      <div className="pc">
        {/* Barra de progreso */}
        {total > 0 && (
          <div className="card mb-4 border-l-4 border-l-blue-400">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">
                Progreso: {ingresadas} / {total} tareas
              </span>
              <span className="text-sm font-bold text-blue-700">
                {puntosObt} / {puntosMax} pts ({zonaPct}%)
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
                ✅ Tareas completas — puedes registrar los exámenes abajo
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
            {/* TAREAS */}
            <div className="card mb-5">
              <div className="card-title">📋 Tareas — ordenadas por página</div>
              {tareas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Sin tareas configuradas para este libro
                </div>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th className="w-10">#</th>
                        <th className="w-20">Páginas</th>
                        <th>Descripción</th>
                        <th className="w-28">Área</th>
                        <th className="w-16 text-center">Máx.</th>
                        <th className="w-24 text-center">Nota (0–5)</th>
                        <th className="w-20 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tareas.map((t: any) => (
                        <tr key={t.id} className={t.nota === null ? 'bg-yellow-50/60' : ''}>
                          <td className="text-gray-400 text-xs font-mono">{t.numero_tarea}</td>
                          <td className="text-xs text-gray-500 font-mono">{t.paginas ?? '—'}</td>
                          <td className="font-semibold text-sm">{t.nombre}</td>
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
                              type="number" min={0} max={5} step={0.5}
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
                            {saving === t.id
                              ? <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                              : t.nota === null
                              ? <span className="badge badge-yellow">Pendiente</span>
                              : <span className="badge badge-green">✓ {t.nota}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* EXÁMENES */}
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
                  Sin exámenes configurados para este libro
                </div>
              ) : (
                <div className="tw">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Área</th>
                        <th>Examen</th>
                        <th className="w-28 text-center">Nota (0–100%)</th>
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
                              type="number" min={0} max={100} step={1}
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
                            {saving === ex.id
                              ? <span className="w-4 h-4 border-2 border-pronea border-t-transparent rounded-full animate-spin inline-block" />
                              : ex.nota_original === null
                              ? <span className="badge badge-yellow">Pendiente</span>
                              : <span className="badge badge-green">{ex.nota_original}%</span>}
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

export default function EnlaceNotasPage() {
  return (
    <Suspense fallback={
      <div className="ap">
        <header className="topbar"><div className="page-title">📝 Ingresar Notas</div></header>
        <div className="pc text-center py-12 text-gray-400">Cargando...</div>
      </div>
    }>
      <EnlaceNotasContent />
    </Suspense>
  )
}
