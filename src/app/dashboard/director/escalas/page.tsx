'use client'
// src/app/dashboard/director/escalas/page.tsx — NUEVA PÁGINA
// Director asigna técnico responsable de digitalizar cada escala numérica
import { useState, useEffect, useCallback } from 'react'

export default function DirectorEscalasPage() {
  const [asignaciones, setAsignaciones] = useState<any[]>([])
  const [etapas,       setEtapas]       = useState<any[]>([])
  const [libros,       setLibros]       = useState<any[]>([])
  const [areas,        setAreas]        = useState<any[]>([])
  const [tecnicos,     setTecnicos]     = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState('')
  const [modal,        setModal]        = useState(false)
  const [ciclo,        setCiclo]        = useState('2026')

  const [form, setForm] = useState({
    etapa_id: '', libro_id: '', area_id: '',
    tecnico_id: '', version_libro: 'nuevo',
    observaciones: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [asig, et, li, ar, tec] = await Promise.all([
      fetch(`/api/escala-asignaciones?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/libros').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setAsignaciones(Array.isArray(asig) ? asig : [])
    setEtapas(Array.isArray(et) ? et : [])
    setLibros(Array.isArray(li) ? li : [])
    setAreas(Array.isArray(ar) ? ar : [])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  // Libros filtrados por etapa seleccionada
  const librosFiltrados = form.etapa_id
    ? libros.filter((l: any) => String(l.etapa_id) === form.etapa_id)
    : libros

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const asignar = async () => {
    if (!form.etapa_id || !form.tecnico_id) {
      flash('❌ Etapa y técnico son requeridos'); return
    }
    setSaving(true)
    const res = await fetch('/api/escala-asignaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etapa_id:      parseInt(form.etapa_id),
        libro_id:      form.libro_id      || null,
        area_id:       form.area_id       ? parseInt(form.area_id) : null,
        tecnico_id:    form.tecnico_id,
        version_libro: form.version_libro,
        ciclo_escolar: parseInt(ciclo),
        observaciones: form.observaciones || null,
      }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ ' + d.mensaje : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); await cargar() }
    setSaving(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta asignación?')) return
    const res = await fetch(`/api/escala-asignaciones?id=${id}`, { method: 'DELETE' })
    flash(res.ok ? '✅ Asignación eliminada' : '❌ Error')
    if (res.ok) await cargar()
  }

  const ESTADO_COLOR: Record<string, string> = {
    pendiente:   'badge-yellow',
    en_progreso: 'badge-blue',
    completado:  'badge-green',
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📊 Asignar Técnico — Escala Numérica</div>
          <div className="text-xs text-gray-400">
            El técnico asignado construirá la escala y aparecerá para todos los técnicos
          </div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={() => { setForm({ etapa_id:'', libro_id:'', area_id:'', tecnico_id:'', version_libro:'nuevo', observaciones:'' }); setModal(true) }}>
            ＋ Nueva asignación
          </button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          <b>📋 ¿Cómo funciona?</b><br />
          1. Selecciona la etapa, el libro y el área a digitalizar<br />
          2. Asigna el técnico responsable<br />
          3. El técnico verá la tarea en su panel "Escalas Numéricas"<br />
          4. Al completarlo, la escala aparece para <b>todos los técnicos</b> del programa
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="font-semibold text-gray-600">Sin asignaciones de escala</div>
              <div className="text-sm mt-1">Crea una asignación para que el técnico construya la escala</div>
              <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Primera asignación</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-green-700 to-green-800 text-white text-left">
                    {['Etapa','Libro','Área','Versión','Técnico Asignado','Tareas','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase whitespace-nowrap border-r border-green-600 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map((a: any, idx: number) => (
                    <tr key={a.id} className={`border-b hover:bg-green-50 ${idx%2===0?'bg-white':'bg-emerald-50/20'}`}>
                      <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{(a.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-sm whitespace-nowrap">
                        {(a.libro as any)?.nombre ?? '— Todos —'}
                        <div className="text-xs text-gray-400">{(a.libro as any)?.numero ? `Libro ${(a.libro as any).numero}` : ''}</div>
                      </td>
                      <td className="px-3 py-2.5 text-sm">{(a.area as any)?.nombre ?? '— Todas —'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${a.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                          {a.version_libro === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-sm">
                          {(a.tecnico as any)?.primer_nombre} {(a.tecnico as any)?.primer_apellido}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{(a.tecnico as any)?.codigo_tecnico}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${a.tareas_construidas > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                          {a.tareas_construidas}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${ESTADO_COLOR[a.estado] ?? 'badge-gray'}`}>
                          {a.estado}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <button className="btn btn-d btn-sm" onClick={() => eliminar(a.id)}>🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal nueva asignación */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">📊 Asignar técnico para escala numérica</h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="alert al-i text-xs">
                  El técnico asignado construirá el catálogo de tareas para esta escala.
                  Cuando termine, aparecerá para <b>todos los técnicos</b> del programa.
                </div>

                <div className="fg">
                  <label className="lbl">Etapa *</label>
                  <select className="inp" value={form.etapa_id}
                    onChange={e => setForm(p => ({ ...p, etapa_id: e.target.value, libro_id: '' }))}>
                    <option value="">— Seleccionar etapa —</option>
                    {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Versión del libro</label>
                    <select className="inp" value={form.version_libro} onChange={F('version_libro')}>
                      <option value="nuevo">📗 Libro Nuevo</option>
                      <option value="viejo">📙 Libro Viejo</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Libro específico (opcional)</label>
                    <select className="inp" value={form.libro_id} onChange={F('libro_id')}>
                      <option value="">— Todos los libros —</option>
                      {librosFiltrados.map((l: any) => (
                        <option key={l.id} value={l.id}>
                          Libro {l.numero} — {l.version}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="fg">
                  <label className="lbl">Área específica (opcional)</label>
                  <select className="inp" value={form.area_id} onChange={F('area_id')}>
                    <option value="">— Todas las áreas —</option>
                    {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>

                <div className="fg">
                  <label className="lbl">Técnico digitalizador *</label>
                  <select className="inp" value={form.tecnico_id} onChange={F('tecnico_id')}>
                    <option value="">— Seleccionar técnico —</option>
                    {tecnicos.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})
                      </option>
                    ))}
                  </select>
                  {tecnicos.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">⚠️ Sin técnicos disponibles</div>
                  )}
                </div>

                <div className="fg">
                  <label className="lbl">Observaciones (opcional)</label>
                  <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')}
                    placeholder="Instrucciones especiales para el técnico..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={asignar} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Asignando...
                      </span>
                    : '✅ Asignar técnico'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
