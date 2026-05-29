'use client'
// src/app/dashboard/admin/recursos/page.tsx — NUEVA PÁGINA
// Admin gestiona recursos: videos, PDFs, enlaces de exámenes externos
import { useState, useEffect } from 'react'

const TIPO_ICON: Record<string, string> = {
  video: '🎬', pdf: '📄', link: '🔗', examen: '📝', audio: '🎧', imagen: '🖼️',
}

export default function AdminRecursosPage() {
  const [recursos,  setRecursos]  = useState<any[]>([])
  const [etapas,    setEtapas]    = useState<any[]>([])
  const [areas,     setAreas]     = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<any>(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [filtro,    setFiltro]    = useState({ tipo: '', etapa: '', buscar: '' })

  const [form, setForm] = useState({
    titulo: '', url: '', descripcion: '', tipo_contenido: 'link',
    etapa_id: '', area_id: '', es_publico: true, destacado: false, orden: '0',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
    setLoading(true)
    const [r, et, ar] = await Promise.all([
      fetch('/api/recursos').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ])
    setRecursos(Array.isArray(r) ? r : [])
    setEtapas(Array.isArray(et) ? et : [])
    setAreas(Array.isArray(ar) ? ar : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const abrirCrear = () => {
    setEditando(null)
    setForm({ titulo: '', url: '', descripcion: '', tipo_contenido: 'link', etapa_id: '', area_id: '', es_publico: true, destacado: false, orden: '0' })
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
      es_publico:     r.es_publico     ?? true,
      destacado:      r.destacado      ?? false,
      orden:          String(r.orden   ?? 0),
    })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.titulo.trim() || !form.url.trim()) { flash('❌ Título y URL son requeridos'); return }
    setSaving(true)
    const payload = {
      titulo:         form.titulo.trim(),
      url:            form.url.trim(),
      descripcion:    form.descripcion    || null,
      tipo_contenido: form.tipo_contenido,
      etapa_id:       form.etapa_id       ? parseInt(form.etapa_id) : null,
      area_id:        form.area_id        ? parseInt(form.area_id)  : null,
      es_publico:     form.es_publico,
      destacado:      form.destacado,
      orden:          parseInt(form.orden ?? '0') || 0,
    }
    const res = await fetch('/api/recursos', {
      method:  editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editando ? { ...payload, id: editando.id } : payload),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Recurso ${editando ? 'actualizado' : 'creado'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const eliminar = async (id: string) => {
    if (!confirm('¿Eliminar este recurso?')) return
    const res = await fetch(`/api/recursos?id=${id}`, { method: 'DELETE' })
    flash(res.ok ? '✅ Recurso eliminado' : '❌ Error al eliminar')
    if (res.ok) cargar()
  }

  const toggleDestacado = async (r: any) => {
    await fetch('/api/recursos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, destacado: !r.destacado }),
    })
    cargar()
  }

  const filtrados = recursos.filter(r => {
    const txt = (r.titulo + ' ' + (r.descripcion ?? '')).toLowerCase()
    return (!filtro.buscar || txt.includes(filtro.buscar.toLowerCase()))
        && (!filtro.tipo   || r.tipo_contenido === filtro.tipo)
        && (!filtro.etapa  || String(r.etapa_id) === filtro.etapa)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎬 Recursos de Apoyo</div>
          <div className="text-xs text-gray-400">Videos, PDFs, enlaces de exámenes y materiales educativos</div>
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
            <div className="w-36">
              <label className="lbl">Tipo</label>
              <select className="inp" value={filtro.tipo}
                onChange={e => setFiltro(f => ({ ...f, tipo: e.target.value }))}>
                <option value="">Todos</option>
                {Object.entries(TIPO_ICON).map(([k, v]) => (
                  <option key={k} value={k}>{v} {k}</option>
                ))}
              </select>
            </div>
            <div className="w-40">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtro.etapa}
                onChange={e => setFiltro(f => ({ ...f, etapa: e.target.value }))}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🎬</div>
            <div className="font-semibold text-gray-600">Sin recursos registrados</div>
            <div className="text-sm mt-1">Agrega videos, PDFs o enlaces de exámenes para los estudiantes</div>
            <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Agregar primer recurso</button>
          </div>
        ) : (
          <div className="card">
            <div className="card-title">
              {filtrados.length} recurso(s)
              {filtro.buscar || filtro.tipo || filtro.etapa
                ? <span className="text-xs font-normal text-gray-400"> (filtrados)</span> : ''}
            </div>
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th className="w-10">Tipo</th>
                    <th>Título</th>
                    <th className="w-28">Etapa</th>
                    <th className="w-28">Área</th>
                    <th className="w-20 text-center">Público</th>
                    <th className="w-20 text-center">Destacado</th>
                    <th className="w-28 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((r: any) => (
                    <tr key={r.id}>
                      <td className="text-xl text-center">{TIPO_ICON[r.tipo_contenido] ?? '🔗'}</td>
                      <td>
                        <div className="font-semibold text-sm">{r.titulo}</div>
                        {r.descripcion && <div className="text-xs text-gray-400 truncate max-w-xs">{r.descripcion}</div>}
                        <a href={r.url} target="_blank" rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline truncate block max-w-xs">
                          {r.url}
                        </a>
                      </td>
                      <td className="text-xs text-gray-500">{(r.etapa as any)?.nombre ?? '— Todas —'}</td>
                      <td className="text-xs text-gray-500">{(r.area as any)?.nombre  ?? '— Todas —'}</td>
                      <td className="text-center">
                        <span className={`badge ${r.es_publico ? 'badge-green' : 'badge-gray'}`}>
                          {r.es_publico ? '✓ Sí' : 'No'}
                        </span>
                      </td>
                      <td className="text-center">
                        <button onClick={() => toggleDestacado(r)}
                          className={`text-lg ${r.destacado ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300'}`}>
                          ⭐
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1 justify-center">
                          <button className="btn btn-g btn-sm" onClick={() => abrirEditar(r)}>✏️</button>
                          <button className="btn btn-d btn-sm" onClick={() => eliminar(r.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">{editando ? '✏️ Editar recurso' : '＋ Nuevo recurso'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Título *</label>
                <input className="inp" value={form.titulo} onChange={F('titulo')}
                  placeholder="Ej: Video explicativo Matemáticas Etapa 1" />
              </div>
              <div className="fg">
                <label className="lbl">URL *</label>
                <input type="url" className="inp" value={form.url} onChange={F('url')}
                  placeholder="https://..." />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Tipo de contenido</label>
                  <select className="inp" value={form.tipo_contenido} onChange={F('tipo_contenido')}>
                    {Object.entries(TIPO_ICON).map(([k, v]) => (
                      <option key={k} value={k}>{v} {k}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Orden (número)</label>
                  <input type="number" className="inp" value={form.orden} onChange={F('orden')} />
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Etapa (opcional)</label>
                  <select className="inp" value={form.etapa_id} onChange={F('etapa_id')}>
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
              <div className="fg">
                <label className="lbl">Descripción</label>
                <textarea className="inp" rows={2} value={form.descripcion} onChange={F('descripcion')} />
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.es_publico as boolean}
                    onChange={F('es_publico')} className="w-4 h-4 accent-pronea" />
                  <span className="text-sm font-semibold">Visible para estudiantes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.destacado as boolean}
                    onChange={F('destacado')} className="w-4 h-4 accent-yellow-500" />
                  <span className="text-sm font-semibold">⭐ Destacado</span>
                </label>
              </div>
            </div>
