'use client'
// src/app/dashboard/admin/sedes/page.tsx
// FIX: Departamento + municipio en cascada. municipio_id es NOT NULL en sedes.
import { useState, useEffect } from 'react'

export default function SedesAdminPage() {
  const [sedes,     setSedes]     = useState<any[]>([])
  const [deptos,    setDeptos]    = useState<any[]>([])
  const [munis,     setMunis]     = useState<any[]>([])
  const [enlaces,   setEnlaces]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editando,  setEditando]  = useState<any>(null)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')
  const [form, setForm] = useState({
    nombre: '', departamento_id: '', municipio_id: '',
    direccion: '', telefono: '', horario: '', enlace_id: '',
  })

  const cargar = async () => {
    setLoading(true)
    const [s, d, e] = await Promise.all([
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
      fetch('/api/enlaces').then(r => r.json()).catch(() => []),
    ])
    setSedes(Array.isArray(s) ? s : [])
    setDeptos(Array.isArray(d) ? d : [])
    setEnlaces(Array.isArray(e) ? e : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // Cargar municipios cuando cambia departamento
  useEffect(() => {
    if (!form.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${form.departamento_id}`)
      .then(r => r.json())
      .then(d => setMunis(Array.isArray(d) ? d : []))
      .catch(() => setMunis([]))
  }, [form.departamento_id])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => {
    setEditando(null)
    setForm({ nombre:'', departamento_id:'', municipio_id:'', direccion:'', telefono:'', horario:'', enlace_id:'' })
    setMunis([])
    setModal(true)
  }

  const abrirEditar = (s: any) => {
    setEditando(s)
    setForm({
      nombre:         s.nombre        ?? '',
      departamento_id: s.departamento_id ? String(s.departamento_id) : '',
      municipio_id:   s.municipio_id  ? String(s.municipio_id) : '',
      direccion:      s.direccion     ?? '',
      telefono:       s.telefono      ?? '',
      horario:        s.horario       ?? '',
      enlace_id:      s.enlace_id     ?? '',
    })
    // Cargar municipios del departamento actual
    if (s.departamento_id) {
      fetch(`/api/municipios?departamento_id=${s.departamento_id}`)
        .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
    }
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim()) { flash('❌ El nombre de la institución es requerido'); return }
    if (!form.municipio_id)  { flash('❌ Debes seleccionar un departamento y municipio'); return }

    setSaving(true)
    const payload = {
      nombre:       form.nombre.trim(),
      municipio_id: parseInt(form.municipio_id),
      direccion:    form.direccion    || null,
      telefono:     form.telefono     || null,
      horario:      form.horario      || null,
      enlace_id:    form.enlace_id    || null,
      // También guardamos departamento_id para referencia
      departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
    }

    const res = await fetch('/api/sedes', {
      method:  editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editando ? { ...payload, id: editando.id } : payload),
    })
    const d = await res.json()
    flash(res.ok
      ? `✅ Sede ${editando ? 'actualizada' : 'creada'} correctamente`
      : '❌ ' + (d.error ?? 'Error al guardar'))
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const toggleActivo = async (sede: any) => {
    const res = await fetch('/api/sedes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sede.id, activo: !sede.activo }),
    })
    flash(res.ok ? `✅ Sede ${sede.activo ? 'desactivada' : 'activada'}` : '❌ Error')
    cargar()
  }

  // Encontrar nombre del municipio
  const muni = (m: any) => m?.municipio_rel?.nombre ?? m?.municipio ?? '—'
  const depto = (s: any) => s?.departamento?.nombre ?? '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏫 Gestión de Sedes</div>
          <div className="text-xs text-gray-400">Centros educativos donde operan los técnicos</div>
        </div>
        <button className="btn btn-p" onClick={abrirCrear}>＋ Nueva sede</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : sedes.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏫</div>
            <div className="font-semibold text-gray-600">Sin sedes registradas</div>
            <div className="text-sm mt-1">Crea al menos una sede para que los técnicos puedan inscribir estudiantes</div>
            <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Crear primera sede</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sedes.map((s: any) => (
              <div key={s.id} className={`card border-l-4 ${s.activo ? 'border-l-green-400' : 'border-l-gray-300'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-extrabold text-gray-800">{s.nombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {depto(s)} · {muni(s)}
                    </div>
                  </div>
                  <span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>
                    {s.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {s.direccion && <div className="text-xs text-gray-500 mb-0.5">📍 {s.direccion}</div>}
                {s.telefono  && <div className="text-xs text-gray-500 mb-0.5">📞 {s.telefono}</div>}
                {s.horario   && <div className="text-xs text-gray-500 mb-2">🕐 {s.horario}</div>}
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-g btn-sm flex-1" onClick={() => abrirEditar(s)}>✏️ Editar</button>
                  <button className={`btn btn-sm ${s.activo ? 'btn-d' : 'btn-s'}`} onClick={() => toggleActivo(s)}>
                    {s.activo ? 'Desact.' : 'Activar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">{editando ? '✏️ Editar sede' : '＋ Nueva sede'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">

              <div className="fg">
                <label className="lbl">Nombre de la institución *</label>
                <input className="inp" value={form.nombre} onChange={F('nombre')}
                  placeholder="Ej: Escuela Oficial Urbana Mixta No. 1" />
              </div>

              {/* CASCADA DEPARTAMENTO → MUNICIPIO */}
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Departamento *</label>
                  <select className="inp" value={form.departamento_id}
                    onChange={e => setForm(p => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                    <option value="">— Seleccionar —</option>
                    {deptos.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Municipio *</label>
                  <select className="inp" value={form.municipio_id} onChange={F('municipio_id')}
                    disabled={!form.departamento_id}>
                    <option value="">
                      {!form.departamento_id ? '— Selecciona departamento primero —' : '— Seleccionar —'}
                    </option>
                    {munis.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="fg">
                <label className="lbl">Dirección</label>
                <input className="inp" value={form.direccion} onChange={F('direccion')}
                  placeholder="Calle, colonia, zona..." />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={F('telefono')} placeholder="2222-3333" />
                </div>
                <div className="fg">
                  <label className="lbl">Horario</label>
                  <input className="inp" value={form.horario} onChange={F('horario')} placeholder="L-V 8:00-16:00" />
                </div>
              </div>

              {enlaces.length > 0 && (
                <div className="fg">
                  <label className="lbl">Enlace institucional (opcional)</label>
                  <select className="inp" value={form.enlace_id} onChange={F('enlace_id')}>
                    <option value="">— Sin enlace asignado —</option>
                    {enlaces.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.primer_nombre} {e.primer_apellido} {e.cargo ? `— ${e.cargo}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!form.municipio_id && form.departamento_id && (
                <div className="alert al-w text-xs">⚠️ Selecciona un municipio — es obligatorio para crear la sede</div>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                  : editando ? '💾 Actualizar' : 'Crear sede'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
