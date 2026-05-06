'use client'
// src/app/dashboard/admin/sedes/page.tsx
import { useState, useEffect } from 'react'

export default function SedesPage() {
  const [sedes, setSedes]     = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [saving, setSaving]   = useState(false)
  const [msg, setMsg]         = useState('')
  const [municipios, setMunicipios] = useState<any[]>([])
  const [form, setForm] = useState({
    nombre: '', direccion: '', telefono: '', horario: '',
    municipio_id: '', tipo: 'escuela', activo: true,
  })

  const cargar = async () => {
    setLoading(true)
    const [s, m] = await Promise.all([
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/municipios').then(r => r.json()).catch(() => []),
    ])
    setSedes(Array.isArray(s) ? s : [])
    setMunicipios(Array.isArray(m) ? m : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const crear = async () => {
    if (!form.nombre) { setMsg('❌ Nombre requerido'); return }
    setSaving(true)
    const res = await fetch('/api/sedes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, municipio_id: form.municipio_id ? parseInt(form.municipio_id) : null }),
    })
    const d = await res.json()
    setMsg(res.ok ? '✅ Sede creada' : '❌ ' + d.error)
    setTimeout(() => setMsg(''), 3000)
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏫 Sedes</div>
          <div className="text-xs text-gray-400">Centros educativos donde operan los técnicos</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nueva sede</button>
      </header>
      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="card">
            <div className="card-title">
              Sedes registradas
              <span className="text-xs text-gray-400 font-normal">{sedes.length} sede(s)</span>
            </div>
            {sedes.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">🏫</div>
                <div className="font-semibold">Sin sedes registradas</div>
                <div className="text-sm mt-1">Agrega la primera sede con el botón de arriba</div>
              </div>
            ) : (
              <div className="tw">
                <table className="tbl">
                  <thead><tr><th>Nombre</th><th>Municipio</th><th>Teléfono</th><th>Horario</th><th>Estado</th></tr></thead>
                  <tbody>
                    {sedes.map((s: any) => (
                      <tr key={s.id}>
                        <td>
                          <div className="font-semibold text-gray-800">{s.nombre}</div>
                          <div className="text-xs text-gray-400">{s.direccion ?? ''}</div>
                        </td>
                        <td className="text-sm text-gray-600">{s.municipio?.nombre ?? '—'}</td>
                        <td className="text-sm text-gray-600">{s.telefono ?? '—'}</td>
                        <td className="text-xs text-gray-500">{s.horario ?? '—'}</td>
                        <td><span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>{s.activo ? 'Activa' : 'Inactiva'}</span></td>
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
              <h3 className="text-base font-extrabold">＋ Nueva sede</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg"><label className="lbl">Nombre de la sede *</label>
                <input className="inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Escuela Primaria..." />
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Municipio</label>
                  <select className="inp" value={form.municipio_id} onChange={e => setForm(f => ({ ...f, municipio_id: e.target.value }))}>
                    <option value="">— Seleccionar —</option>
                    {municipios.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                  </select>
                </div>
                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
              </div>
              <div className="fg"><label className="lbl">Dirección</label>
                <input className="inp" value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
              </div>
              <div className="fg"><label className="lbl">Horario de atención</label>
                <input className="inp" value={form.horario} onChange={e => setForm(f => ({ ...f, horario: e.target.value }))} placeholder="Lunes a Viernes 8:00-16:00" />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>{saving ? 'Creando...' : 'Crear sede'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
