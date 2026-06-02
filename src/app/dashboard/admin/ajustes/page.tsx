'use client'
// src/app/dashboard/admin/ajustes/page.tsx
// CORRECCIÓN: modal con margen superior visible, tabla horizontal, CRUD funcional
import { useState, useEffect, useCallback } from 'react'

export default function AjustesAdminPage() {
  const [tipos,          setTipos]          = useState<any[]>([])
  const [discapacidades, setDiscapacidades] = useState<any[]>([])
  const [loading,        setLoading]        = useState(true)
  const [modal,          setModal]          = useState(false)
  const [editando,       setEditando]       = useState<any>(null)
  const [saving,         setSaving]         = useState(false)
  const [msg,            setMsg]            = useState('')
  const [form, setForm]  = useState({ nombre: '', descripcion: '' })

  const flash   = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [t, d] = await Promise.all([
      fetch('/api/tipos-ajuste').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
    ])
    setTipos(Array.isArray(t) ? t : [])
    setDiscapacidades(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirModal = (tipo?: any) => {
    if (tipo) {
      setEditando(tipo)
      setForm({ nombre: tipo.nombre ?? '', descripcion: tipo.descripcion ?? '' })
    } else {
      setEditando(null)
      setForm({ nombre: '', descripcion: '' })
    }
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { flash('❌ Nombre requerido'); return }
    setSaving(true)

    const url    = '/api/tipos-ajuste'
    const method = editando ? 'PATCH' : 'POST'
    const body   = editando
      ? JSON.stringify({ id: editando.id, nombre: form.nombre.trim(), descripcion: form.descripcion || null })
      : JSON.stringify({ nombre: form.nombre.trim(), descripcion: form.descripcion || null })

    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body })
    const d   = await res.json()
    flash(res.ok ? `✅ Tipo de ajuste ${editando ? 'actualizado' : 'creado'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); await cargar() }
    setSaving(false)
  }

  const toggleActivo = async (tipo: any) => {
    const res = await fetch('/api/tipos-ajuste', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tipo.id, activo: !tipo.activo }),
    })
    if (res.ok) { await cargar(); flash(tipo.activo ? '⚠️ Tipo desactivado' : '✅ Tipo activado') }
    else flash('❌ Error')
  }

  const eliminar = async (id: number, nombre: string) => {
    if (!confirm(`¿Desactivar el tipo de ajuste "${nombre}"?`)) return
    const res = await fetch(`/api/tipos-ajuste?id=${id}`, { method: 'DELETE' })
    if (res.ok) { await cargar(); flash('✅ Desactivado') }
    else flash('❌ Error al eliminar')
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">♿ Tipos de Ajuste por Discapacidad</div>
          <div className="text-xs text-gray-400">Categorías de adecuación curricular para estudiantes con discapacidad</div>
        </div>
        <button className="btn btn-p" onClick={() => abrirModal()}>＋ Nuevo tipo</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : msg.startsWith('⚠️') ? 'al-w' : 'al-e'}`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {tipos.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-5xl mb-3">♿</div>
                <div className="font-semibold text-gray-600">Sin tipos de ajuste registrados</div>
                <div className="text-sm mt-1">Crea categorías de adecuación curricular para usarlas en las inscripciones</div>
                <button className="btn btn-p mt-4" onClick={() => abrirModal()}>＋ Crear primer tipo</button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-amber-600 to-amber-700 text-white text-left">
                      {['#', 'Código', 'Nombre del Tipo', 'Descripción', 'Estado', 'Acciones'].map(h => (
                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-amber-500 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tipos.map((t: any, idx: number) => (
                      <tr key={t.id}
                        className={`border-b hover:bg-amber-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'} ${!t.activo ? 'opacity-60' : ''}`}>
                        <td className="px-3 py-2.5 text-xs text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{t.codigo}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800">{t.nombre}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 max-w-xs">{t.descripcion ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`badge text-xs ${t.activo ? 'badge-green' : 'badge-gray'}`}>
                            {t.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-nowrap">
                            <button onClick={() => abrirModal(t)} className="btn btn-p btn-sm" title="Editar">✏️</button>
                            <button onClick={() => toggleActivo(t)} className={`btn btn-sm ${t.activo ? 'btn-d' : 'btn-s'}`}
                              title={t.activo ? 'Desactivar' : 'Activar'}>
                              {t.activo ? '🔴' : '🟢'}
                            </button>
                            <button onClick={() => eliminar(t.id, t.nombre)} className="btn btn-d btn-sm" title="Eliminar">🗑️</button>
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

      {/* Modal con margen superior visible */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {editando ? '✏️ Editar tipo de ajuste' : '＋ Nuevo tipo de ajuste'}
                </h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="fg">
                  <label className="lbl">Nombre del tipo de ajuste *</label>
                  <input className="inp" value={form.nombre}
                    onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Tiempo extendido, Material en braille, Evaluación oral..." />
                </div>
                <div className="fg">
                  <label className="lbl">Descripción</label>
                  <textarea className="inp" rows={3} value={form.descripcion}
                    onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    placeholder="Describe en qué consiste este tipo de adecuación..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Guardando...
                      </span>
                    : editando ? '💾 Actualizar' : '✅ Crear tipo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

