'use client'
// src/app/dashboard/admin/firmantes-constancias/page.tsx
import { useState, useEffect } from 'react'

export default function FirmantesConstanciasPage() {
  const [lista, setLista]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [form, setForm] = useState<any>({ nombre_completo: '', cargo: '', dependencia: '', es_predeterminado: false })
  const [editandoId, setEditandoId] = useState<string | null>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/firmantes-constancias').then(r => r.json()).catch(() => [])
    setLista(Array.isArray(d) ? d : [])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    if (!form.nombre_completo.trim() || !form.cargo.trim()) { flash('❌ Nombre y cargo son requeridos'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/firmantes-constancias', {
        method: editandoId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editandoId ? { ...form, id: editandoId } : form),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al guardar')); return }
      flash(editandoId ? '✅ Firmante actualizado' : '✅ Firmante agregado')
      setForm({ nombre_completo: '', cargo: '', dependencia: '', es_predeterminado: false })
      setEditandoId(null)
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setSaving(false) }
  }

  const editar = (f: any) => {
    setEditandoId(f.id)
    setForm({ nombre_completo: f.nombre_completo, cargo: f.cargo, dependencia: f.dependencia ?? '', es_predeterminado: f.es_predeterminado })
  }

  const toggleActivo = async (f: any) => {
    await fetch('/api/firmantes-constancias', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: f.id, activo: !f.activo }),
    })
    cargar()
  }

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">✍️ Firmantes de Constancias</div></header>
      <div className="pc max-w-3xl">
        {msg && <div className={`alert ${msg.startsWith('❌') ? 'al-e' : 'al-s'} mb-4`}>{msg}</div>}

        <div className="card mb-5">
          <div className="card-title text-sm">{editandoId ? '✏️ Editar firmante' : '➕ Agregar firmante'}</div>
          <div className="fg2">
            <div className="fg"><label className="lbl">Nombre completo</label>
              <input className="inp" value={form.nombre_completo} onChange={e => setForm((f: any) => ({ ...f, nombre_completo: e.target.value }))} placeholder="Lic. Oscar Oswaldo Son Cámez" /></div>
            <div className="fg"><label className="lbl">Cargo</label>
              <input className="inp" value={form.cargo} onChange={e => setForm((f: any) => ({ ...f, cargo: e.target.value }))} placeholder="Coordinador Departamental DIGEEX" /></div>
          </div>
          <div className="fg"><label className="lbl">Dependencia (opcional, aparece en la línea de abajo de la firma)</label>
            <input className="inp" value={form.dependencia} onChange={e => setForm((f: any) => ({ ...f, dependencia: e.target.value }))} placeholder="DIDEDUC Sacatepéquez" /></div>
          <label className="flex items-center gap-2 text-sm mt-2">
            <input type="checkbox" checked={form.es_predeterminado} onChange={e => setForm((f: any) => ({ ...f, es_predeterminado: e.target.checked }))} />
            Usar como firmante predeterminado
          </label>
          <div className="flex gap-2 mt-3">
            <button className="btn btn-p" disabled={saving} onClick={guardar}>{saving ? '⏳...' : (editandoId ? '💾 Guardar cambios' : '➕ Agregar')}</button>
            {editandoId && <button className="btn btn-g" onClick={() => { setEditandoId(null); setForm({ nombre_completo: '', cargo: '', dependencia: '', es_predeterminado: false }) }}>Cancelar</button>}
          </div>
        </div>

        <div className="card">
          <div className="card-title text-sm">📋 Catálogo</div>
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : lista.length === 0 ? (
            <div className="text-sm text-gray-400 text-center py-4">Sin firmantes registrados todavía</div>
          ) : (
            <div className="space-y-2">
              {lista.map((f: any) => (
                <div key={f.id} className={`flex items-center justify-between gap-2 border rounded-xl px-3 py-2 ${f.activo ? 'border-gray-100' : 'border-gray-100 opacity-50'}`}>
                  <div>
                    <div className="font-semibold text-sm">{f.nombre_completo} {f.es_predeterminado && <span className="badge badge-blue text-xs ml-1">predeterminado</span>}</div>
                    <div className="text-xs text-gray-400">{f.cargo}{f.dependencia ? ' — ' + f.dependencia : ''}</div>
                  </div>
                  <div className="flex gap-1">
                    <button className="btn btn-g btn-sm" onClick={() => editar(f)}>✏️</button>
                    <button className="btn btn-s btn-sm" onClick={() => toggleActivo(f)}>{f.activo ? '⏸️ Desactivar' : '▶️ Activar'}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
