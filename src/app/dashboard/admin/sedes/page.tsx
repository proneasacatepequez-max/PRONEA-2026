'use client'
// src/app/dashboard/admin/sedes/page.tsx
// FIX: Gestión de sedes con asignación de técnicos
import { useState, useEffect } from 'react'

export default function SedesPage() {
  const [sedes,      setSedes]      = useState<any[]>([])
  const [municipios, setMunicipios] = useState<any[]>([])
  const [tecnicos,   setTecnicos]   = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(false)
  const [modalAsig,  setModalAsig]  = useState<any>(null)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [form, setForm] = useState({
    nombre: '', direccion: '', telefono: '', horario: '', municipio_id: '',
  })

  const cargar = async () => {
    setLoading(true)
    const [s, m, t] = await Promise.all([
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/municipios').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setSedes(Array.isArray(s) ? s : [])
    setMunicipios(Array.isArray(m) ? m : [])
    setTecnicos(Array.isArray(t) ? t : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const crear = async () => {
    if (!form.nombre.trim()) { flash('❌ Nombre de sede requerido'); return }
    setSaving(true)
    const res = await fetch('/api/sedes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, municipio_id: form.municipio_id ? parseInt(form.municipio_id) : null }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Sede creada' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); cargar(); setForm({ nombre:'', direccion:'', telefono:'', horario:'', municipio_id:'' }) }
    setSaving(false)
  }

  const asignarTecnico = async (sedeId: string, tecnicoId: string) => {
    setSaving(true)
    const res = await fetch('/api/sedes/asignar-tecnico', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sede_id: sedeId, tecnico_id: tecnicoId }),
    })
    flash(res.ok ? '✅ Técnico asignado a la sede' : '❌ Error al asignar')
    setModalAsig(null)
    cargar()
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
        ) : sedes.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏫</div>
            <div className="font-semibold">Sin sedes registradas</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Crear primera sede</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sedes.map((s: any) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-extrabold text-gray-800">{s.nombre}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{s.municipio?.nombre ?? 'Sin municipio'}</div>
                  </div>
                  <span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>{s.activo ? 'Activa' : 'Inactiva'}</span>
                </div>
                {s.direccion && <div className="text-xs text-gray-500 mb-1">📍 {s.direccion}</div>}
                {s.telefono   && <div className="text-xs text-gray-500 mb-1">📞 {s.telefono}</div>}
                {s.horario    && <div className="text-xs text-gray-500 mb-2">🕐 {s.horario}</div>}
                <button className="btn btn-g btn-sm w-full" onClick={() => setModalAsig(s)}>
                  👨‍🏫 Asignar técnico
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear sede */}
      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nueva sede</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg"><label className="lbl">Nombre *</label>
                <input className="inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Escuela..." />
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

      {/* Modal asignar técnico */}
      {modalAsig && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModalAsig(null)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">👨‍🏫 Asignar técnico a {modalAsig.nombre}</h3>
              <button onClick={() => setModalAsig(null)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd">
              {tecnicos.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No hay técnicos disponibles. Crea técnicos desde Usuarios.</div>
              ) : (
                <div className="space-y-2">
                  {tecnicos.map((t: any) => (
                    <button key={t.id}
                      className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
                      onClick={() => asignarTecnico(modalAsig.id, t.id)}
                      disabled={saving}>
                      <div className="w-9 h-9 rounded-full bg-pronea-light flex items-center justify-center text-pronea font-bold">
                        {t.primer_nombre?.[0]}{t.primer_apellido?.[0]}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{t.primer_nombre} {t.primer_apellido}</div>
                        <div className="text-xs text-gray-400">Código: {t.codigo_tecnico ?? '—'} · Tel: {t.telefono ?? '—'}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="mf"><button className="btn btn-g" onClick={() => setModalAsig(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
