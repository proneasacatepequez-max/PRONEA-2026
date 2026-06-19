'use client'
// src/app/dashboard/admin/visibilidad/page.tsx
// FIX: terminología "Sede" en lugar de "Institución" — usa /api/sedes
// el dropdown vacío se debía a que pedía instituciones (tabla en desuso)
import { useState, useEffect, useCallback } from 'react'

export default function VisibilidadPage() {
  const [configs, setConfigs] = useState<any[]>([])
  const [sedes,   setSedes]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [form, setForm] = useState({
    sede_id: '', visible_para_coordinador: true,
    ocultar_enlace: false, razon_ocultamiento: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [cfg, se] = await Promise.all([
      fetch('/api/visibilidad').then(r => r.json()).catch(() => []),
      fetch('/api/sedes?todas=1').then(r => r.json()).catch(() => []),
    ])
    setConfigs(Array.isArray(cfg) ? cfg : [])
    setSedes(Array.isArray(se) ? se : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirNuevo = () => {
    setForm({ sede_id: '', visible_para_coordinador: true, ocultar_enlace: false, razon_ocultamiento: '' })
    setModal(true)
  }

  const guardar = async () => {
    if (!form.sede_id) { flash('❌ Selecciona una sede'); return }
    setSaving(true)
    const res = await fetch('/api/visibilidad', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Configuración guardada' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); await cargar() }
    setSaving(false)
  }

  const toggleCampo = async (id: string, campo: string, valorActual: boolean) => {
    const res = await fetch('/api/visibilidad', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, [campo]: !valorActual }),
    })
    if (res.ok) await cargar()
    else flash('❌ Error al actualizar')
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👁️ Visibilidad para Coordinador</div>
          <div className="text-xs text-gray-400">Controla qué sedes ve el coordinador y si oculta el nombre del enlace</div>
        </div>
        <button className="btn btn-p" onClick={abrirNuevo}>＋ Configurar sede</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : configs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👁️</div>
              <div className="font-semibold">Sin configuraciones — por defecto todas las sedes son visibles</div>
              <button className="btn btn-p mt-4" onClick={abrirNuevo}>＋ Configurar primera sede</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50 text-left border-b">
                    {['Sede','Visible para coordinador','Ocultar nombre de enlace','Razón'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-extrabold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c: any, idx: number) => (
                    <tr key={c.id} className={`border-b ${idx%2===0?'bg-white':'bg-gray-50/30'}`}>
                      <td className="px-3 py-2.5 font-semibold">{(c.sede as any)?.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleCampo(c.id, 'visible_para_coordinador', c.visible_para_coordinador)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${c.visible_para_coordinador ? 'bg-green-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.visible_para_coordinador ? 'translate-x-5' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => toggleCampo(c.id, 'ocultar_enlace', c.ocultar_enlace)}
                          className={`relative w-11 h-6 rounded-full transition-colors ${c.ocultar_enlace ? 'bg-orange-500' : 'bg-gray-300'}`}>
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${c.ocultar_enlace ? 'translate-x-5' : ''}`} />
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{c.razon_ocultamiento ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">👁️ Configurar visibilidad</h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="fg">
                  <label className="lbl">Sede *</label>
                  <select className="inp" value={form.sede_id} onChange={e => setForm(p => ({ ...p, sede_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                  {sedes.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">⚠️ No hay sedes registradas — créalas primero en Admin → Sedes.</div>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.visible_para_coordinador}
                    onChange={e => setForm(p => ({ ...p, visible_para_coordinador: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">Visible para coordinador</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.ocultar_enlace}
                    onChange={e => setForm(p => ({ ...p, ocultar_enlace: e.target.checked }))} className="w-4 h-4" />
                  <span className="text-sm">El coordinador verá "Oculto" en lugar del nombre del enlace</span>
                </label>
                <div className="fg">
                  <label className="lbl">Razón del ocultamiento (solo interna, el coordinador no la ve)</label>
                  <textarea className="inp" rows={2} value={form.razon_ocultamiento}
                    onChange={e => setForm(p => ({ ...p, razon_ocultamiento: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>{saving ? '...' : '💾 Guardar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
