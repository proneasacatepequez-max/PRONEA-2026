'use client'
// src/app/dashboard/admin/libros/page.tsx
import { useState, useEffect } from 'react'

export default function LibrosPage() {
  const [libros, setLibros]   = useState<any[]>([])
  const [etapas, setEtapas]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [form, setForm] = useState({
    etapa_id: '', nombre: '', numero: '1', version: 'nuevo',
    total_tareas: '20', descripcion: '',
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

  const crear = async () => {
    if (!form.etapa_id || !form.nombre) { setMsg('❌ Etapa y nombre requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/libros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, etapa_id: parseInt(form.etapa_id), numero: parseInt(form.numero), total_tareas: parseInt(form.total_tareas) }),
    })
    const d = await res.json()
    setMsg(res.ok ? '✅ Libro creado' : '❌ ' + d.error)
    setTimeout(() => setMsg(''), 3000)
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📚 Libros de Trabajo</div>
          <div className="text-xs text-gray-400">Configura los libros por etapa y versión</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nuevo libro</button>
      </header>
      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}
        <div className="alert al-i mb-4">
          <div>
            <b>📋 Estructura de libros:</b>
            <div className="text-xs mt-1">Cada etapa tiene Libro 1 y Libro 2. Cada libro tiene versión (nuevo/viejo). El técnico selecciona la versión al inscribir al estudiante.</div>
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="card">
            <div className="card-title">Libros configurados</div>
            {libros.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">📚</div>
                <div className="font-semibold">Sin libros configurados</div>
                <div className="text-sm mt-1">Crea el primer libro con el botón de arriba</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Etapa</th><th>Libro</th><th>Versión</th><th>Total tareas</th><th>Estado</th></tr></thead>
                  <tbody>
                    {libros.map((l: any) => (
                      <tr key={l.id}>
                        <td className="font-semibold">{l.etapa?.nombre ?? '—'}</td>
                        <td>{l.nombre} <span className="text-xs text-gray-400">(#{l.numero})</span></td>
                        <td><span className={`badge ${l.version === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>{l.version === 'nuevo' ? '📗 Nuevo' : '📙 Viejo'}</span></td>
                        <td>{l.total_tareas ?? '—'}</td>
                        <td><span className={`badge ${l.activo ? 'badge-green' : 'badge-gray'}`}>{l.activo ? 'Activo' : 'Inactivo'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo libro</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg"><label className="lbl">Etapa *</label>
                <select className="inp" value={form.etapa_id} onChange={e => setForm(f => ({ ...f, etapa_id: e.target.value }))}>
                  <option value="">— Seleccionar —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Nombre del libro *</label>
                  <input className="inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Libro de Trabajo 1" />
                </div>
                <div className="fg"><label className="lbl">Número</label>
                  <select className="inp" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}>
                    <option value="1">Libro 1</option>
                    <option value="2">Libro 2</option>
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Versión</label>
                  <select className="inp" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}>
                    <option value="nuevo">📗 Nuevo</option>
                    <option value="viejo">📙 Viejo</option>
                  </select>
                </div>
                <div className="fg"><label className="lbl">Total de tareas</label>
                  <input type="number" className="inp" value={form.total_tareas} onChange={e => setForm(f => ({ ...f, total_tareas: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>
                {saving ? 'Creando...' : 'Crear libro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
