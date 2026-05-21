'use client'
// src/app/dashboard/admin/libros/page.tsx
// FIX: Botones editar, eliminar y activar/desactivar
import { useState, useEffect } from 'react'

export default function LibrosPage() {
  const [libros,  setLibros]  = useState<any[]>([])
  const [etapas,  setEtapas]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [form, setForm] = useState({
    etapa_id: '', nombre: '', numero: '1', version: 'nuevo', total_tareas: '20',
  })

  const cargar = async () => {
    setLoading(true)
    const [l, e] = await Promise.all([
      fetch('/api/libros').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
    ])
    setLibros(Array.isArray(l) ? l : [])
    setEtapas(Array.isArray(e) ? e : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const abrirModal = (libro?: any) => {
    if (libro) {
      setEditando(libro)
      setForm({
        etapa_id:    libro.etapa_id?.toString() ?? '',
        nombre:      libro.nombre,
        numero:      libro.numero?.toString() ?? '1',
        version:     libro.version ?? 'nuevo',
        total_tareas: libro.total_tareas?.toString() ?? '20',
      })
    } else {
      setEditando(null)
      setForm({ etapa_id:'', nombre:'', numero:'1', version:'nuevo', total_tareas:'20' })
    }
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre || (!editando && !form.etapa_id)) {
      flash('❌ Etapa y nombre requeridos'); return
    }
    setSaving(true)
    const payload = {
      nombre:       form.nombre.trim(),
      numero:       parseInt(form.numero),
      version:      form.version,
      total_tareas: parseInt(form.total_tareas),
      ...(editando ? { id: editando.id } : { etapa_id: parseInt(form.etapa_id) }),
    }
    const res = await fetch('/api/libros', {
      method:  editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Libro ${editando ? 'actualizado' : 'creado'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const toggleActivo = async (libro: any) => {
    const res = await fetch('/api/libros', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id: libro.id, activo: !libro.activo }),
    })
    flash(res.ok ? `✅ Libro ${libro.activo ? 'desactivado' : 'activado'}` : '❌ Error')
    cargar()
  }

  const eliminar = async (libro: any) => {
    if (!confirm(`¿Eliminar el libro "${libro.nombre}"? Si tiene notas, se desactivará.`)) return
    const res = await fetch(`/api/libros?id=${libro.id}`, { method: 'DELETE' })
    const d = await res.json()
    flash(res.ok ? '✅ ' + (d.mensaje ?? 'Eliminado') : '❌ Error')
    cargar()
  }

  const filtrados = libros.filter(l => !filtroEtapa || l.etapa_id === parseInt(filtroEtapa))

  // Agrupar por etapa
  const porEtapa: Record<string, any[]> = {}
  filtrados.forEach(l => {
    const k = l.etapa?.nombre ?? 'Sin etapa'
    if (!porEtapa[k]) porEtapa[k] = []
    porEtapa[k].push(l)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📚 Libros de Trabajo</div>
          <div className="text-xs text-gray-400">Configura libros por etapa y versión</div>
        </div>
        <button className="btn btn-p" onClick={() => abrirModal()}>＋ Nuevo libro</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4">
          <div className="text-xs">
            <b>📋 Estructura:</b> Cada etapa tiene Libro 1 y Libro 2.
            Cada libro tiene versión <b>Nuevo</b> o <b>Viejo</b>.
            El técnico elige la versión al inscribir al estudiante.
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <div className="w-52">
            <label className="lbl">Filtrar por etapa</label>
            <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
              <option value="">Todas las etapas</option>
              {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button className="btn btn-g" onClick={() => setFiltroEtapa('')}>Limpiar</button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <div className="font-semibold">Sin libros configurados</div>
            <button className="btn btn-p mt-4" onClick={() => abrirModal()}>＋ Crear primer libro</button>
          </div>
        ) : (
          Object.entries(porEtapa).map(([etapa, libs]) => (
            <div key={etapa} className="card mb-4">
              <div className="card-title">📖 {etapa}</div>
              <div className="space-y-2">
                {libs.map(l => (
                  <div key={l.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${l.activo ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <span className="text-2xl">{l.version === 'nuevo' ? '📗' : '📙'}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">
                        Libro {l.numero} — {l.nombre}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`badge text-xs ${l.version === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                          {l.version === 'nuevo' ? 'Versión nueva' : 'Versión vieja'}
                        </span>
                        <span className="text-xs text-gray-400">{l.total_tareas} tareas</span>
                        <span className={`badge text-xs ${l.activo ? 'badge-green' : 'badge-gray'}`}>
                          {l.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button className="btn btn-g btn-sm" onClick={() => abrirModal(l)}>✏️</button>
                      <button
                        className={`btn btn-sm ${l.activo ? 'btn-d' : 'btn-s'}`}
                        onClick={() => toggleActivo(l)}>
                        {l.activo ? 'Desact.' : 'Activar'}
                      </button>
                      <button className="btn btn-sm btn-d" onClick={() => eliminar(l)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">
                {editando ? '✏️ Editar libro' : '＋ Nuevo libro'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              {!editando && (
                <div className="fg">
                  <label className="lbl">Etapa *</label>
                  <select className="inp" value={form.etapa_id} onChange={e => setForm(f => ({ ...f, etapa_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select>
                </div>
              )}
              <div className="fg">
                <label className="lbl">Nombre del libro *</label>
                <input className="inp" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Libro de Trabajo Primaria..." />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Número</label>
                  <select className="inp" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}>
                    <option value="1">Libro 1</option>
                    <option value="2">Libro 2</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Versión</label>
                  <select className="inp" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}>
                    <option value="nuevo">📗 Nuevo</option>
                    <option value="viejo">📙 Viejo</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Total de tareas</label>
                <input type="number" className="inp" value={form.total_tareas}
                  onChange={e => setForm(f => ({ ...f, total_tareas: e.target.value }))} />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear libro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
