'use client'
// src/app/dashboard/admin/ajustes/page.tsx
// FIX: Botón editar + eliminar + activar/desactivar + dropdown discapacidades
import { useState, useEffect } from 'react'

export default function AjustesAdminPage() {
  const [tipos,         setTipos]         = useState<any[]>([])
  const [discapacidades, setDiscapacidades] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [editando,      setEditando]      = useState<any>(null)
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState('')
  const [form, setForm] = useState({ nombre: '', descripcion: '', discapacidad_id: '' })

  const cargar = async () => {
    setLoading(true)
    const [t, d] = await Promise.all([
      fetch('/api/tipos-ajuste').then(r => r.json()).catch(() => []),
      fetch('/api/discapacidades').then(r => r.json()).catch(() => []),
    ])
    setTipos(Array.isArray(t) ? t : [])
    setDiscapacidades(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const abrirModal = (tipo?: any) => {
    if (tipo) {
      setEditando(tipo)
      setForm({ nombre: tipo.nombre, descripcion: tipo.descripcion ?? '', discapacidad_id: tipo.discapacidad_id ?? '' })
    } else {
      setEditando(null)
      setForm({ nombre: '', descripcion: '', discapacidad_id: '' })
    }
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { flash('❌ Nombre requerido'); return }
    setSaving(true)
    const res = editando
      ? await fetch('/api/tipos-ajuste', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editando.id, ...form, discapacidad_id: form.discapacidad_id || null }),
        })
      : await fetch('/api/tipos-ajuste', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, discapacidad_id: form.discapacidad_id || null }),
        })
    const d = await res.json()
    flash(res.ok ? `✅ Tipo de ajuste ${editando ? 'actualizado' : 'creado'}` : '❌ ' + d.error)
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const toggleActivo = async (tipo: any) => {
    const res = await fetch('/api/tipos-ajuste', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tipo.id, activo: !tipo.activo }),
    })
    flash(res.ok ? `✅ Tipo ${tipo.activo ? 'desactivado' : 'activado'}` : '❌ Error')
    cargar()
  }

  const eliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Desactivar el tipo "${nombre}"?`)) return
    const res = await fetch(`/api/tipos-ajuste?id=${id}`, { method: 'DELETE' })
    flash(res.ok ? '✅ Tipo desactivado' : '❌ Error')
    cargar()
  }

  const discNombre = (id: number | null) => discapacidades.find((d: any) => d.id === id)?.nombre ?? null

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">♿ Ajustes por Discapacidad</div>
          <div className="text-xs text-gray-400">Tipos de ajuste curricular para estudiantes con discapacidad</div>
        </div>
        <button className="btn btn-p" onClick={() => abrirModal()}>＋ Nuevo tipo de ajuste</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4">
          <div className="text-xs">
            <b>📋 ¿Cómo funcionan?</b> El técnico aplica un ajuste a cada estudiante con discapacidad al inscribirlo.
            Los ajustes pueden modificar: número de tareas requeridas, puntaje máximo y porcentaje de exámenes.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card">
            <div className="card-title">
              Tipos de ajuste registrados
              <span className="text-xs text-gray-400 font-normal">{tipos.length} tipo(s)</span>
            </div>
            {tipos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">♿</div>
                <div className="font-semibold">Sin tipos de ajuste</div>
                <button className="btn btn-p mt-4" onClick={() => abrirModal()}>＋ Crear el primero</button>
              </div>
            ) : (
              <div className="space-y-2">
                {tipos.map((t: any) => (
                  <div key={t.id}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${t.activo ? 'border-gray-100 hover:bg-gray-50' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800">{t.nombre}</div>
                      {t.descripcion && <div className="text-xs text-gray-400 mt-0.5">{t.descripcion}</div>}
                      {t.discapacidad_id && (
                        <div className="text-xs text-blue-600 mt-0.5">
                          Discapacidad: {discNombre(t.discapacidad_id) ?? `ID ${t.discapacidad_id}`}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className={`badge ${t.activo ? 'badge-green' : 'badge-gray'}`}>
                        {t.activo ? 'Activo' : 'Inactivo'}
                      </span>
                      <button className="btn btn-g btn-sm" onClick={() => abrirModal(t)}>✏️</button>
                      <button
                        className={`btn btn-sm ${t.activo ? 'btn-d' : 'btn-s'}`}
                        onClick={() => toggleActivo(t)}>
                        {t.activo ? 'Desactivar' : 'Activar'}
                      </button>
                      <button className="btn btn-sm btn-d" onClick={() => eliminar(t.id, t.nombre)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">{editando ? '✏️ Editar tipo de ajuste' : '＋ Nuevo tipo de ajuste'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Nombre del ajuste *</label>
                <input className="inp" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Discapacidad Intelectual Leve..." />
              </div>
              <div className="fg">
                <label className="lbl">Tipo de discapacidad relacionada</label>
                <select className="inp" value={form.discapacidad_id}
                  onChange={e => setForm(f => ({ ...f, discapacidad_id: e.target.value }))}>
                  <option value="">— Sin relación específica —</option>
                  {discapacidades.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Descripción del ajuste</label>
                <textarea className="inp" rows={3} value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe qué implica este ajuste curricular..." />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : editando ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
