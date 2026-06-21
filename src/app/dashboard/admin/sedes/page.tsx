'use client'
// src/app/dashboard/admin/sedes/page.tsx
// FIX: tabla horizontal, modal pantalla completa, await cargar()
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
  const [buscar,   setBuscar]   = useState('')
  const [form, setForm] = useState({
    nombre:'', departamento_id:'', municipio_id:'',
    direccion:'', telefono:'', horario:'', correo:'', codigo_institucional:'',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [s, d] = await Promise.all([
      fetch('/api/sedes?todas=1').then(r => r.json()).catch(() => []),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
    ])
    setSedes(Array.isArray(s) ? s : [])
    setDeptos(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!form.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${form.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [form.departamento_id])

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
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
      nombre:               s.nombre               ?? '',
      departamento_id:      s.departamento_id      ? String(s.departamento_id) : '',
      municipio_id:         s.municipio_id         ? String(s.municipio_id)    : '',
      direccion:            s.direccion            ?? '',
      telefono:             s.telefono             ?? '',
      horario:              s.horario              ?? '',
      correo:               s.correo               ?? '',
      codigo_institucional: s.codigo_institucional ?? '',
    })
    // Cargar municipios del depto de la sede
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
    flash(res.ok ? `✅ Sede ${editando ? 'actualizada' : 'creada'}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) {
      setModal(false)
      await cargar() // FIX: await para que la tabla se actualice inmediatamente
    }
    setSaving(false)
  }

  const toggleActivo = async (sede: any) => {
    if (!sede.activo) {
      await fetch('/api/sedes', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sede.id, activo: true }),
      })
      flash('✅ Sede activada')
    } else {
      const res = await fetch(`/api/sedes?id=${sede.id}`, { method: 'DELETE' })
      const d   = await res.json()
      flash(res.ok ? '✅ Sede desactivada' : '❌ ' + (d.error ?? 'Error'))
    }
    await cargar()
  }

  const filtradas = sedes.filter(s =>
    !buscar || `${s.nombre} ${(s.municipio as any)?.nombre ?? ''} ${s.codigo_institucional ?? ''}`.toLowerCase().includes(buscar.toLowerCase())
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🏫 Gestión de Sedes</div>
          <div className="text-xs text-gray-400">{filtradas.length} sede(s) registrada(s)</div>
        </div>
        <button className="btn btn-p" onClick={abrirCrear}>＋ Nueva sede</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card mb-4">
          <input className="inp" placeholder="🔍 Buscar sede por nombre, municipio o código..."
            value={buscar} onChange={e => setBuscar(e.target.value)} />
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtradas.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">🏫</div>
              <div className="font-semibold text-gray-600">
                {buscar ? 'Sin resultados para la búsqueda' : 'Sin sedes registradas'}
              </div>
              {!buscar && <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Crear primera sede</button>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-left border-b">
                    {['#','Nombre','Departamento','Municipio','Teléfono','Horario','Código','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((s: any, idx: number) => (
                    <tr key={s.id} className={`border-b hover:bg-gray-50 ${!s.activo ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2.5 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-semibold">{s.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{(s.departamento as any)?.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{(s.municipio as any)?.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{s.telefono ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{s.horario ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs font-mono text-gray-400">{s.codigo_institucional ?? '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${s.activo ? 'badge-green' : 'badge-gray'}`}>
                          {s.activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-p btn-sm" onClick={() => abrirEditar(s)}>✏️</button>
                          <button className={`btn btn-sm ${s.activo ? 'btn-d' : 'btn-s'}`} onClick={() => toggleActivo(s)}>
                            {s.activo ? '🔴' : '🟢'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal — pantalla completa con scroll */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {editando ? '✏️ Editar sede' : '＋ Nueva sede'}
                </h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>

              <div className="px-6 py-5 space-y-4">
                <div className="fg">
                  <label className="lbl">Nombre de la sede *</label>
                  <input className="inp" value={form.nombre} onChange={F('nombre')}
                    placeholder="Ej: Escuela Oficial Urbana Mixta No. 1 — Antigua Guatemala" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="fg">
                    <label className="lbl">Departamento *</label>
                    <select className="inp" value={form.departamento_id}
                      onChange={e => setForm(p => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                      <option value="">— Seleccionar —</option>
                      {deptos.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label className="lbl">Municipio *</label>
                    <select className="inp" value={form.municipio_id} onChange={F('municipio_id')}
                      disabled={!form.departamento_id}>
                      <option value="">{!form.departamento_id ? '— Elige depto —' : '— Seleccionar —'}</option>
                      {munis.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                    </select>
                  </div>
                </div>

                <div className="fg">
                  <label className="lbl">Dirección</label>
                  <input className="inp" value={form.direccion} onChange={F('direccion')}
                    placeholder="Calle, colonia, zona..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="fg">
                    <label className="lbl">Teléfono</label>
                    <input className="inp" value={form.telefono} onChange={F('telefono')} placeholder="2222-3333" />
                  </div>
                  <div className="fg">
                    <label className="lbl">Horario de atención</label>
                    <input className="inp" value={form.horario} onChange={F('horario')} placeholder="L-V 8:00-16:00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="fg">
                    <label className="lbl">Correo electrónico</label>
                    <input type="email" className="inp" value={form.correo} onChange={F('correo')} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Código institucional MINEDUC</label>
                    <input className="inp" value={form.codigo_institucional} onChange={F('codigo_institucional')}
                      placeholder="Ej: 01-00-0001" />
                  </div>
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
                    : editando ? '💾 Actualizar' : '✅ Crear sede'}
                </button>
              </div>
            </div>
          </div>
        </div>
