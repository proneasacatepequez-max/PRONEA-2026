'use client'
// src/app/dashboard/admin/visibilidad/page.tsx
// FIX: UI clara para configurar visibilidad del coordinador por institución
import { useState, useEffect } from 'react'

export default function VisibilidadPage() {
  const [configs,       setConfigs]       = useState<any[]>([])
  const [instituciones, setInstituciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [msg,           setMsg]           = useState('')
  const [form, setForm] = useState({
    institucion_id: '',
    visible_para_coordinador: true,
    ocultar_enlace:           false,
    razon_ocultamiento:       '',
  })

  const cargar = async () => {
    setLoading(true)
    const [v, i] = await Promise.all([
      fetch('/api/visibilidad').then(r => r.json()).catch(() => []),
      fetch('/api/instituciones').then(r => r.json()).catch(() => []),
    ])
    setConfigs(Array.isArray(v) ? v : [])
    setInstituciones(Array.isArray(i) ? i : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const guardar = async () => {
    if (!form.institucion_id) { flash('❌ Selecciona una institución'); return }
    setSaving(true)
    const res = await fetch('/api/visibilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Configuración guardada' : '❌ ' + d.error)
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👁️ Visibilidad para Coordinador</div>
          <div className="text-xs text-gray-400">Controla qué instituciones puede ver el coordinador DIGEEX</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Configurar institución</button>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card mb-5">
          <div className="card-title">📋 Reglas de visibilidad</div>
          <div className="space-y-2 text-sm">
            {[
              { icon: '✅', color: 'text-green-700 bg-green-50', text: 'Institución visible → el coordinador ve el nombre real y el nombre del enlace' },
              { icon: '🔇', color: 'text-yellow-700 bg-yellow-50', text: 'Enlace oculto → el coordinador ve "Oculto" en lugar del nombre del enlace' },
              { icon: '❌', color: 'text-red-700 bg-red-50',    text: 'Institución oculta → el coordinador ve "No disponible" en lugar del nombre' },
            ].map(r => (
              <div key={r.icon} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${r.color}`}>
                <span className="text-lg flex-shrink-0">{r.icon}</span>
                <span>{r.text}</span>
              </div>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : configs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">👁️</div>
            <div className="font-semibold">Sin configuración especial</div>
            <div className="text-sm mt-1">Todas las instituciones son visibles para el coordinador</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Configurar institución</button>
          </div>
        ) : (
          <div className="space-y-3">
            {configs.map((c: any) => (
              <div key={c.id} className="card flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-gray-800">{c.institucion?.nombre ?? 'Institución'}</div>
                  <div className="text-xs text-gray-400">{c.institucion?.tipo ?? ''}</div>
                  {c.razon_ocultamiento && <div className="text-xs text-gray-500 mt-1">Razón: {c.razon_ocultamiento}</div>}
                </div>
                <div className="flex flex-col gap-1 items-end text-xs">
                  <span className={`badge ${c.visible_para_coordinador ? 'badge-green' : 'badge-red'}`}>
                    {c.visible_para_coordinador ? '✅ Institución visible' : '❌ Institución oculta'}
                  </span>
                  <span className={`badge ${c.ocultar_enlace ? 'badge-yellow' : 'badge-green'}`}>
                    {c.ocultar_enlace ? '🔇 Enlace oculto' : '✅ Enlace visible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">👁️ Configurar visibilidad</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-4">
              <div className="fg">
                <label className="lbl">Institución *</label>
                <select className="inp" value={form.institucion_id} onChange={e => setForm(f => ({ ...f, institucion_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {instituciones.map((i: any) => <option key={i.id} value={i.id}>{i.nombre}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-gray-700">Visible para coordinador</div>
                    <div className="text-xs text-gray-400">Si está desactivado, el coordinador verá "No disponible"</div>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${form.visible_para_coordinador ? 'bg-pronea-secondary' : 'bg-gray-300'}`}
                    onClick={() => setForm(f => ({ ...f, visible_para_coordinador: !f.visible_para_coordinador }))}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.visible_para_coordinador ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <div className="text-sm font-bold text-gray-700">Ocultar enlace institucional</div>
                    <div className="text-xs text-gray-400">El coordinador verá "Oculto" en lugar del nombre del enlace</div>
                  </div>
                  <div
                    className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${form.ocultar_enlace ? 'bg-pronea-secondary' : 'bg-gray-300'}`}
                    onClick={() => setForm(f => ({ ...f, ocultar_enlace: !f.ocultar_enlace }))}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.ocultar_enlace ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </div>
                </div>
              </div>

              <div className="fg">
                <label className="lbl">Razón del ocultamiento (solo interna, el coordinador no la ve)</label>
                <textarea className="inp" rows={2} value={form.razon_ocultamiento}
                  onChange={e => setForm(f => ({ ...f, razon_ocultamiento: e.target.value }))}
                  placeholder="Razón administrativa del ocultamiento..." />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
