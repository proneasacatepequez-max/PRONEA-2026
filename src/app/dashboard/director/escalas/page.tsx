'use client'
// src/app/dashboard/director/escalas/page.tsx
// FIX: botón Editar para transferir técnico, áreas sin duplicados
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
  const [modal,        setModal]        = useState<'crear'|'editar'|null>(null)
  const [editando,     setEditando]     = useState<any>(null)
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

  // Libros filtrados por etapa
  const librosFiltrados = form.etapa_id
    ? libros.filter((l: any) => String(l.etapa_id) === form.etapa_id)
    : libros

  // Áreas ya asignadas para la etapa/libro seleccionado (para no mostrar duplicados)
  const areasYaAsignadas = new Set(
    asignaciones
      .filter((a: any) =>
        String((a.etapa as any)?.id) === form.etapa_id &&
        (!form.libro_id || (a.libro as any)?.id === form.libro_id)
      )
      .map((a: any) => String((a.area as any)?.id))
      .filter(Boolean)
  )

  // Áreas disponibles para asignar (sin las ya asignadas, excepto en edición)
  const areasDisponibles = areas.filter((a: any) =>
    modal === 'editar' ? true : !areasYaAsignadas.has(String(a.id))
  )

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => {
    setForm({ etapa_id:'', libro_id:'', area_id:'', tecnico_id:'', version_libro:'nuevo', observaciones:'' })
    setEditando(null)
    setModal('crear')
  }

  const abrirEditar = (a: any) => {
    setEditando(a)
    setForm({
      etapa_id:      (a.etapa as any)?.id ? String((a.etapa as any).id) : '',
      libro_id:      (a.libro as any)?.id ?? '',
      area_id:       (a.area  as any)?.id ? String((a.area as any).id)  : '',
      tecnico_id:    (a.tecnico as any)?.id ?? '',
      version_libro: a.version_libro ?? 'nuevo',
      observaciones: a.observaciones ?? '',
    })
    setModal('editar')
  }

  const guardar = async () => {
    if (!form.etapa_id || !form.tecnico_id) {
      flash('❌ Etapa y técnico son requeridos'); return
    }
    setSaving(true)

    if (modal === 'editar' && editando) {
      // Editar/transferir
      const res = await fetch('/api/escala-asignaciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:             editando.id,
          tecnico_id:     form.tecnico_id,
          observaciones:  form.observaciones || null,
          _tecnico_anterior: (editando.tecnico as any)?.id,
        }),
      })
      const d = await res.json()
      flash(res.ok ? '✅ ' + (d.mensaje ?? 'Asignación actualizada') : '❌ ' + (d.error ?? 'Error'))
      if (res.ok) { setModal(null); await cargar() }
    } else {
      // Crear nueva
      const res = await fetch('/api/escala-asignaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          etapa_id:      parseInt(form.etapa_id),
          libro_id:      form.libro_id   || null,
          area_id:       form.area_id    ? parseInt(form.area_id) : null,
          tecnico_id:    form.tecnico_id,
          version_libro: form.version_libro,
          ciclo_escolar: parseInt(ciclo),
          observaciones: form.observaciones || null,
        }),
      })
      const d = await res.json()
      flash(res.ok ? '✅ ' + d.mensaje : '❌ ' + (d.error ?? 'Error'))
      if (res.ok) { setModal(null); await cargar() }
    }
    setSaving(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar esta asignación? El técnico ya no verá esta escala.')) return
    const res = await fetch(`/api/escala-asignaciones?id=${id}`, { method: 'DELETE' })
    flash(res.ok ? '✅ Asignación eliminada' : '❌ Error al eliminar')
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
            El técnico asignado construye la escala y queda visible para todos
          </div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={abrirCrear}>＋ Nueva asignación</button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          <b>📋 Flujo:</b> Selecciona etapa + libro + área → asigna técnico → el técnico construye las tareas →
          la escala queda disponible para todos los técnicos del programa.
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : asignaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="font-semibold">Sin asignaciones de escala</div>
              <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Primera asignación</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
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
                        {(a.libro as any)?.numero && <div className="text-xs text-gray-400">Libro {(a.libro as any).numero}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-sm">{(a.area as any)?.nombre ?? '— Todas —'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${a.version_libro==='nuevo'?'badge-blue':'badge-orange'}`}>
                          {a.version_libro==='nuevo'?'📗 Nuevo':'📙 Viejo'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-sm">
                          {(a.tecnico as any)?.primer_nombre} {(a.tecnico as any)?.primer_apellido}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{(a.tecnico as any)?.codigo_tecnico}</div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${a.tareas_construidas>0?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                          {a.tareas_construidas}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${ESTADO_COLOR[a.estado]??'badge-gray'}`}>{a.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-p btn-sm" onClick={() => abrirEditar(a)} title="Editar / Transferir técnico">
                            ✏️
                          </button>
                          <button className="btn btn-d btn-sm" onClick={() => eliminar(a.id)} title="Eliminar asignación">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {modal === 'crear' ? '📊 Nueva asignación de escala' : '✏️ Editar / Transferir técnico'}
                </h3>
                <button onClick={() => setModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">

                {modal === 'crear' && (
                  <>
                    <div className="fg">
                      <label className="lbl">Etapa *</label>
                      <select className="inp" value={form.etapa_id}
                        onChange={e => setForm(p => ({ ...p, etapa_id: e.target.value, libro_id: '', area_id: '' }))}>
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
                        <select className="inp" value={form.libro_id}
                          onChange={e => setForm(p => ({ ...p, libro_id: e.target.value, area_id: '' }))}>
                          <option value="">— Todos los libros —</option>
                          {librosFiltrados.map((l: any) => (
                            <option key={l.id} value={l.id}>Libro {l.numero} — {l.version}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="fg">
                      <label className="lbl">Área específica (opcional)</label>
                      <select className="inp" value={form.area_id} onChange={F('area_id')}>
                        <option value="">— Todas las áreas —</option>
                        {areasDisponibles.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.nombre}</option>
                        ))}
                      </select>
                      {areasDisponibles.length === 0 && form.etapa_id && (
                        <div className="text-xs text-orange-500 mt-1">
                          ⚠️ Todas las áreas ya tienen técnico asignado para esta etapa/libro
                        </div>
                      )}
                    </div>
                  </>
                )}

                {modal === 'editar' && editando && (
                  <div className="alert al-i text-xs mb-2">
                    <b>Escala:</b> {(editando.etapa as any)?.nombre}
                    {(editando.libro as any)?.nombre && ` — ${(editando.libro as any).nombre}`}
                    {(editando.area as any)?.nombre  && ` — Área: ${(editando.area as any).nombre}`}
                    <br />
                    <b>Técnico actual:</b> {(editando.tecnico as any)?.primer_nombre} {(editando.tecnico as any)?.primer_apellido}
                  </div>
                )}

                <div className="fg">
                  <label className="lbl">
                    {modal === 'editar' ? 'Transferir a técnico *' : 'Técnico digitalizador *'}
                  </label>
                  <select className="inp" value={form.tecnico_id} onChange={F('tecnico_id')}>
                    <option value="">— Seleccionar técnico —</option>
                    {tecnicos.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="fg">
                  <label className="lbl">Observaciones (opcional)</label>
                  <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')}
                    placeholder={modal === 'editar' ? 'Razón de la transferencia...' : 'Instrucciones para el técnico...'} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    : modal === 'crear' ? '✅ Asignar técnico' : '✏️ Actualizar asignación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
