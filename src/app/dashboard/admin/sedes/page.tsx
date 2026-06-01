'use client'
// src/app/dashboard/admin/sedes/page.tsx
// CORRECCIÓN: await cargar() después de guardar para que la lista se actualice correctamente
import { useState, useEffect, useCallback } from 'react'

export default function SedesAdminPage() {
  const [sedes,    setSedes]    = useState<any[]>([])
  const [deptos,   setDeptos]   = useState<any[]>([])
  const [munis,    setMunis]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [form, setForm] = useState({
    nombre: '', departamento_id: '', municipio_id: '',
    direccion: '', telefono: '', horario: '', correo: '',
    codigo_institucional: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  // CORRECCIÓN: useCallback para poder awaitar correctamente
  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [resSedes, resDeptos] = await Promise.all([
        fetch('/api/sedes'),
        fetch('/api/departamentos'),
      ])
      const sData = await resSedes.json()
      const dData = await resDeptos.json()
      setSedes(Array.isArray(sData) ? sData : [])
      setDeptos(Array.isArray(dData) ? dData : [])
    } catch {
      setSedes([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!form.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${form.departamento_id}`)
      .then(r => r.json())
      .then(d => setMunis(Array.isArray(d) ? d : []))
      .catch(() => setMunis([]))
  }, [form.departamento_id])

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => {
    setEditando(null)
    setForm({ nombre:'', departamento_id:'', municipio_id:'', direccion:'', telefono:'', horario:'', correo:'', codigo_institucional:'' })
    setMunis([])
    setModal(true)
  }

  const abrirEditar = (s: any) => {
    setEditando(s)
    setForm({
      nombre:               s.nombre              ?? '',
      departamento_id:      s.departamento_id      ? String(s.departamento_id) : '',
      municipio_id:         s.municipio_id         ? String(s.municipio_id)    : '',
      direccion:            s.direccion            ?? '',
      telefono:             s.telefono             ?? '',
      horario:              s.horario              ?? '',
      correo:               s.correo               ?? '',
      codigo_institucional: s.codigo_institucional ?? '',
    })
    // Cargar municipios del departamento del registro que se edita
    if (s.departamento_id) {
      fetch(`/api/municipios?departamento_id=${s.departamento_id}`)
        .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
    }
    setModal(true)
  }

  const guardar = async () => {
    if (!form.nombre.trim())  { flash('❌ El nombre es requerido'); return }
    if (!form.municipio_id)   { flash('❌ Debes seleccionar departamento y municipio'); return }
    setSaving(true)
    const payload = {
      nombre:               form.nombre.trim(),
      municipio_id:         parseInt(form.municipio_id),
      departamento_id:      form.departamento_id ? parseInt(form.departamento_id) : null,
      direccion:            form.direccion    || null,
      telefono:             form.telefono     || null,
      horario:              form.horario      || null,
      correo:               form.correo       || null,
      codigo_institucional: form.codigo_institucional || null,
    }
    const res = await fetch('/api/sedes', {
      method:  editando ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(editando ? { ...payload, id: editando.id } : payload),
    })
    const d = await res.json()
    if (res.ok) {
      setModal(false)
      // CORRECCIÓN: await cargar() para que la lista se actualice ANTES de mostrar el mensaje
      await cargar()
      flash(`✅ Sede ${editando ? 'actualizada' : 'creada'} correctamente`)
    } else {
      flash('❌ ' + (d.error ?? 'Error al guardar'))
    }
    setSaving(false)
  }

  const toggleActivo = async (sede: any) => {
    await fetch('/api/sedes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sede.id, activo: !sede.activo }),
    })
    await cargar()
    flash(sede.activo ? '⚠️ Sede desactivada' : '✅ Sede activada')
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏫 Gestión de Sedes</div>
          <div className="text-xs text-gray-400">
            {sedes.length} sede(s) registrada(s)
          </div>
        </div>
        <button className="btn btn-p" onClick={abrirCrear}>＋ Nueva sede</button>
      </header>

      <div className="pc">
        {msg && (
          <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : msg.startsWith('⚠️') ? 'al-w' : 'al-e'}`}>
            {msg}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sedes.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🏫</div>
            <div className="font-semibold text-gray-600">Sin sedes registradas</div>
            <div className="text-sm mt-1">
              Crea al menos una sede para que los técnicos puedan inscribir estudiantes
            </div>
            <button className="btn btn-p mt-4" onClick={abrirCrear}>
              ＋ Crear primera sede
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sedes.map((s: any) => (
              <div
                key={s.id}
                className={`card border-l-4 ${s.activo ? 'border-l-green-400' : 'border-l-gray-300 opacity-70'}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-extrabold text-gray-800">{s.nombre}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {(s.departamento as any)?.nombre ?? '—'} · {(s.municipio as any)?.nombre ?? '—'}
                    </div>
                    {s.codigo_institucional && (
                      <div className="text-xs text-gray-400 font-mono mt-0.5">
                        Cód: {s.codigo_institucional}
                      </div>
                    )}
                  </div>
                  <span className={`badge ${s.activo ? 'badge-green' : 'badge-gray'}`}>
                    {s.activo ? 'Activa' : 'Inactiva'}
                  </span>
                </div>
                {s.direccion && <div className="text-xs text-gray-500 mb-0.5">📍 {s.direccion}</div>}
                {s.telefono  && <div className="text-xs text-gray-500 mb-0.5">📞 {s.telefono}</div>}
                {s.horario   && <div className="text-xs text-gray-500 mb-0.5">🕐 {s.horario}</div>}
                {s.correo    && <div className="text-xs text-gray-500 mb-2">✉️ {s.correo}</div>}
                <div className="flex gap-2 mt-2">
                  <button className="btn btn-g btn-sm flex-1" onClick={() => abrirEditar(s)}>
                    ✏️ Editar
                  </button>
                  <button
                    className={`btn btn-sm ${s.activo ? 'btn-d' : 'btn-s'}`}
                    onClick={() => toggleActivo(s)}
                  >
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
              <h3 className="text-base font-extrabold">
                {editando ? '✏️ Editar sede' : '＋ Nueva sede'}
              </h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>
            <div className="mbd space-y-3">

              <div className="fg">
                <label className="lbl">Nombre de la institución / sede *</label>
                <input className="inp" value={form.nombre} onChange={F('nombre')}
                  placeholder="Ej: Escuela Oficial Urbana Mixta No. 1" />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Departamento *</label>
                  <select className="inp" value={form.departamento_id}
                    onChange={e => setForm(p => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                    <option value="">— Seleccionar —</option>
                    {deptos.map((d: any) => (
                      <option key={d.id} value={String(d.id)}>{d.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Municipio *</label>
                  <select className="inp" value={form.municipio_id} onChange={F('municipio_id')}
                    disabled={!form.departamento_id}>
                    <option value="">
                      {!form.departamento_id ? '— Selecciona depto primero —' : '— Seleccionar —'}
                    </option>
                    {munis.map((m: any) => (
                      <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                    ))}
                  </select>
                </div>
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

              <div className="fg">
                <label className="lbl">Dirección</label>
                <input className="inp" value={form.direccion} onChange={F('direccion')}
                  placeholder="Calle, colonia, zona..." />
              </div>

              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Correo electrónico</label>
                  <input type="email" className="inp" value={form.correo} onChange={F('correo')} />
                </div>
                <div className="fg">
                  <label className="lbl">Código MINEDUC</label>
                  <input className="inp" value={form.codigo_institucional} onChange={F('codigo_institucional')}
                    placeholder="Código institucional" />
                </div>
              </div>

              {!form.municipio_id && form.departamento_id && (
                <div className="alert al-w text-xs">⚠️ Selecciona un municipio — es obligatorio</div>
              )}
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </span>
                  : editando ? '💾 Actualizar' : 'Crear sede'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

