'use client'
// src/app/dashboard/admin/recursos/page.tsx
// COMPLETO: guarda etapa_id, area_id, libro_id correctamente
// Tipo "examen" con campo para Libro 1 o Libro 2 (viejo o nuevo)
// El enlace de examen aparece al estudiante en sus avances
import { useState, useEffect, useCallback } from 'react'

const TIPO_ICON: Record<string, string> = {
  video:   '🎬',
  pdf:     '📄',
  link:    '🔗',
  examen:  '📝',
  audio:   '🎧',
  imagen:  '🖼️',
  material:'📚',
}

const TIPO_LABELS: Record<string, string> = {
  video:   'Video educativo',
  pdf:     'Documento PDF',
  link:    'Enlace externo',
  examen:  'Examen / Evaluación',
  audio:   'Audio',
  imagen:  'Imagen',
  material:'Material didáctico',
}

export default function AdminRecursosPage() {
  const [recursos,  setRecursos]  = useState<any[]>([])
  const [etapas,    setEtapas]    = useState<any[]>([])
  const [areas,     setAreas]     = useState<any[]>([])
  const [libros,    setLibros]    = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<any>(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [filtro,    setFiltro]    = useState({ tipo: '', etapa: '', buscar: '' })

  const [form, setForm] = useState({
    titulo: '', url: '', descripcion: '',
    tipo_contenido: 'link',
    etapa_id: '', area_id: '', libro_id: '',
    es_publico: true, destacado: false, orden: '0',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [r, et, ar, li] = await Promise.all([
      fetch('/api/recursos').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
      fetch('/api/libros').then(r => r.json()).catch(() => []),
    ])
    setRecursos(Array.isArray(r) ? r : [])
    setEtapas(Array.isArray(et) ? et : [])
    setAreas(Array.isArray(ar) ? ar : [])
    setLibros(Array.isArray(li) ? li : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Libros filtrados por etapa seleccionada
  const librosFiltrados = form.etapa_id
    ? libros.filter((l: any) => String(l.etapa_id) === form.etapa_id)
    : libros

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const abrirCrear = () => {
    setEditando(null)
    setForm({ titulo:'', url:'', descripcion:'', tipo_contenido:'link', etapa_id:'', area_id:'', libro_id:'', es_publico:true, destacado:false, orden:'0' })
    setModal(true)
  }

  const abrirEditar = (r: any) => {
    setEditando(r)
    setForm({
      titulo:         r.titulo         ?? '',
      url:            r.url            ?? '',
      descripcion:    r.descripcion    ?? '',
      tipo_contenido: r.tipo_contenido ?? 'link',
      etapa_id:       r.etapa_id       ? String(r.etapa_id) : '',
      area_id:        r.area_id        ? String(r.area_id)  : '',
      libro_id:       r.libro_id       ? String(r.libro_id) : '',
      es_publico:     r.es_publico     ?? true,
      destacado:      r.destacado      ?? false,
      orden:          String(r.orden   ?? 0),
    })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.titulo.trim()) { flash('❌ Título requerido'); return }
    if (!form.url.trim())    { flash('❌ URL requerida'); return }
    if (form.tipo_contenido === 'examen' && !form.libro_id) {
      flash('❌ Para examenes debes seleccionar el libro al que pertenece'); return
    }
    setSaving(true)

    const payload = {
      titulo:         form.titulo.trim(),
      url:            form.url.trim(),
      descripcion:    form.descripcion    || null,
      tipo_contenido: form.tipo_contenido,
      etapa_id:       form.etapa_id       ? parseInt(form.etapa_id) : null,
      area_id:        form.area_id        ? parseInt(form.area_id)  : null,
      libro_id:       form.libro_id       ? form.libro_id           : null,
      es_publico:     Boolean(form.es_publico),
      destacado:      Boolean(form.destacado),
      orden:          parseInt(form.orden ?? '0') || 0,
    }

    const res = await fetch('/api/recursos', {
      method:  editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editando ? { ...payload, id: editando.id } : payload),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Recurso ${editando ? 'actualizado' : 'creado'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); await cargar() }
    setSaving(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este recurso?')) return
    const res = await fetch(`/api/recursos?id=${id}`, { method: 'DELETE' })
    if (res.ok) { await cargar(); flash('✅ Recurso eliminado') }
    else flash('❌ Error al eliminar')
  }

  const toggleDestacado = async (r: any) => {
    await fetch('/api/recursos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, destacado: !r.destacado }),
    })
    await cargar()
  }

  const filtrados = recursos.filter(r => {
    const txt = (r.titulo + ' ' + (r.descripcion ?? '')).toLowerCase()
    return (!filtro.buscar || txt.includes(filtro.buscar.toLowerCase()))
        && (!filtro.tipo   || r.tipo_contenido === filtro.tipo)
        && (!filtro.etapa  || String(r.etapa_id) === filtro.etapa)
  })

  const libroLabel = (libroId: string) => {
    const l = libros.find(li => li.id === libroId)
    if (!l) return '—'
    return `${(l.etapa as any)?.nombre ?? ''} — Libro ${l.numero} (${l.version})`
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎬 Recursos de Apoyo</div>
          <div className="text-xs text-gray-400">Videos, PDFs, materiales y enlaces de exámenes para estudiantes</div>
        </div>
        <button className="btn btn-p" onClick={abrirCrear}>＋ Nuevo recurso</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-36">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Título o descripción..."
                value={filtro.buscar} onChange={e => setFiltro(f => ({ ...f, buscar: e.target.value }))} />
            </div>
            <div className="w-40">
              <label className="lbl">Tipo</label>
              <select className="inp" value={filtro.tipo}
                onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
                <option value="">Todos los tipos</option>
                {Object.entries(TIPO_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{TIPO_ICON[k]} {v}</option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtro.etapa}
                onChange={e => setFiltro(f => ({ ...f, etapa: e.target.value }))}>
                <option value="">Todas las etapas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => setFiltro({ tipo:'', etapa:'', buscar:'' })}>Limpiar</button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {filtrados.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">🎬</div>
                <div className="font-semibold text-gray-600">Sin recursos</div>
                {!filtro.buscar && !filtro.tipo && !filtro.etapa && (
                  <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Agregar primer recurso</button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[900px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-purple-700 to-purple-800 text-white text-left">
                      {['Tipo','Título / URL','Etapa','Área','Libro','Público','★','Acciones'].map(h => (
                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-purple-600 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((r: any, idx: number) => (
                      <tr key={r.id}
                        className={`border-b hover:bg-purple-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-purple-50/20'}`}>
                        <td className="px-3 py-2.5 text-lg text-center">{TIPO_ICON[r.tipo_contenido] ?? '🔗'}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-semibold text-sm">{r.titulo}</div>
                          {r.descripcion && <div className="text-xs text-gray-400 truncate max-w-xs">{r.descripcion}</div>}
                          <a href={r.url} target="_blank" rel="noreferrer"
                            className="text-xs text-blue-500 hover:underline truncate block max-w-xs">
                            {r.url}
                          </a>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{(r.etapa as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{(r.area as any)?.nombre  ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {r.libro_id ? libroLabel(r.libro_id) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`badge text-xs ${r.es_publico ? 'badge-green' : 'badge-gray'}`}>
                            {r.es_publico ? '✓' : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button onClick={() => toggleDestacado(r)}
                            className={`text-lg ${r.destacado ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>⭐</button>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1">
                            <button className="btn btn-p btn-sm" onClick={() => abrirEditar(r)}>✏️</button>
                            <button className="btn btn-d btn-sm" onClick={() => eliminar(r.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal con margen superior */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">{editando ? '✏️ Editar recurso' : '＋ Nuevo recurso'}</h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-4">

                <div className="fg">
                  <label className="lbl">Tipo de contenido</label>
                  <select className="inp" value={form.tipo_contenido} onChange={F('tipo_contenido')}>
                    {Object.entries(TIPO_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{TIPO_ICON[k]} {v}</option>
                    ))}
                  </select>
                  {form.tipo_contenido === 'examen' && (
                    <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                      📝 Este enlace aparecerá en la pantalla del estudiante cuando llegue al libro correspondiente.
                    </div>
                  )}
                </div>

                <div className="fg">
                  <label className="lbl">Título *</label>
                  <input className="inp" value={form.titulo} onChange={F('titulo')}
                    placeholder={form.tipo_contenido === 'examen' ? 'Ej: Examen Matemáticas Libro 1 — Etapa Primaria' : 'Título del recurso'} />
                </div>

                <div className="fg">
                  <label className="lbl">URL del recurso *</label>
                  <input type="url" className="inp" value={form.url} onChange={F('url')}
                    placeholder="https://..." />
                </div>

                <div className="fg">
                  <label className="lbl">Descripción (opcional)</label>
                  <textarea className="inp" rows={2} value={form.descripcion} onChange={F('descripcion')} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Etapa {form.tipo_contenido === 'examen' ? '*' : '(opcional)'}</label>
                    <select className="inp" value={form.etapa_id}
                      onChange={e => setForm(p => ({ ...p, etapa_id: e.target.value, libro_id: '' }))}>
                      <option value="">— Todas las etapas —</option>
                      {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Área (opcional)</label>
                    <select className="inp" value={form.area_id} onChange={F('area_id')}>
                      <option value="">— Todas las áreas —</option>
                      {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                    </select>
                  </div>
                </div>

                {/* Libro — importante para examenes */}
                <div className="fg">
                  <label className="lbl">
                    Libro {form.tipo_contenido === 'examen' ? '* (requerido para exámenes)' : '(opcional)'}
                  </label>
                  <select className="inp" value={form.libro_id} onChange={F('libro_id')}>
                    <option value="">— {form.etapa_id ? 'Seleccionar libro' : 'Selecciona primero la etapa'} —</option>
                    {librosFiltrados.map((l: any) => (
                      <option key={l.id} value={l.id}>
                        Libro {l.numero} — {l.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'} ({(l.etapa as any)?.nombre})
                      </option>
                    ))}
                  </select>
                  {form.tipo_contenido === 'examen' && !form.libro_id && (
                    <div className="text-xs text-orange-600 mt-1">⚠️ Selecciona la etapa y el libro para vincular el examen correctamente</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Orden (número)</label>
                    <input type="number" className="inp" value={form.orden} onChange={F('orden')} min="0" />
                  </div>
                </div>

                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(form.es_publico)} onChange={F('es_publico')} className="w-4 h-4 accent-pronea" />
                    <span className="text-sm font-semibold">Visible para estudiantes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={Boolean(form.destacado)} onChange={F('destacado')} className="w-4 h-4 accent-yellow-500" />
                    <span className="text-sm font-semibold">⭐ Destacado</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                    : editando ? '💾 Actualizar' : '✅ Crear recurso'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
