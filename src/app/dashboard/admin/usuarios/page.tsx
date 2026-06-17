'use client'
// src/app/dashboard/admin/usuarios/page.tsx
// FIX: dropdown "Institución/Sede" usa /api/sedes en lugar de /api/instituciones
import { useState, useEffect, useCallback } from 'react'

const ROL_COLOR: Record<string, string> = {
  administrador: 'bg-purple-100 text-purple-700',
  tecnico: 'bg-blue-100 text-blue-700',
  director: 'bg-green-100 text-green-700',
  coordinador_digeex: 'bg-yellow-100 text-yellow-700',
  enlace_institucional: 'bg-orange-100 text-orange-700',
}

const ROL_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  tecnico: 'Técnico',
  director: 'Director',
  coordinador_digeex: 'Coordinador DIGEEX',
  enlace_institucional: 'Enlace Institucional',
}

export default function UsuariosAdminPage() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [sedes,    setSedes]    = useState<any[]>([])
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [buscar,   setBuscar]   = useState('')
  const [filtroRol,setFiltroRol]= useState('')
  const [resetId,  setResetId]  = useState<string|null>(null)
  const [nuevaPwd, setNuevaPwd] = useState('')
  const [savingReset, setSavingReset] = useState(false)
  const [pwdVisible,  setPwdVisible]  = useState<string|null>(null)

  const [form, setForm] = useState({
    rol: 'tecnico', correo:'', contrasena:'', confirmar:'',
    primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
    telefono:'', codigo_tecnico:'', cui:'', especialidad:'',
    cargo:'', sede_id:'', tecnico_id:'', departamento_id:'',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [u, se, tec] = await Promise.all([
      fetch('/api/usuarios').then(r => r.json()).catch(() => []),
      fetch('/api/sedes?todas=1').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setUsuarios(Array.isArray(u) ? u : [])
    setSedes(Array.isArray(se) ? se : [])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => {
    setForm({ rol:'tecnico', correo:'', contrasena:'', confirmar:'', primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'', telefono:'', codigo_tecnico:'', cui:'', especialidad:'', cargo:'', sede_id:'', tecnico_id:'', departamento_id:'' })
    setModal(true)
  }

  const crear = async () => {
    if (!form.correo || !form.contrasena || !form.primer_nombre || !form.primer_apellido)
      { flash('❌ Nombre, apellido, correo y contraseña son requeridos'); return }
    if (form.contrasena !== form.confirmar) { flash('❌ Las contraseñas no coinciden'); return }
    if (form.contrasena.length < 6) { flash('❌ Contraseña mínimo 6 caracteres'); return }
    if (form.rol === 'enlace_institucional' && !form.sede_id) { flash('❌ La sede/institución es obligatoria para el enlace'); return }

    setSaving(true)
    const res = await fetch('/api/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        sede_id: form.sede_id || undefined,
        tecnico_id: form.tecnico_id || undefined,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : undefined,
        ciclo_escolar: 2026,
      }),
    })
    const d = await res.json()
    if (res.ok) {
      setModal(false)
      await cargar()
      setPwdVisible(d.contrasena ?? form.contrasena)
      flash(`✅ Usuario creado: ${form.correo}`)
    } else {
      flash('❌ ' + (d.error ?? 'Error al crear usuario'))
    }
    setSaving(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    const res = await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo }),
    })
    flash(res.ok ? `✅ Usuario ${!activo ? 'activado' : 'desactivado'}` : '❌ Error')
    if (res.ok) await cargar()
  }

  const resetPassword = async () => {
    if (!nuevaPwd || nuevaPwd.length < 6) { flash('❌ Mínimo 6 caracteres'); return }
    setSavingReset(true)
    const res = await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetId, reset_password: nuevaPwd }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña restablecida' : '❌ ' + d.error)
    if (res.ok) { setResetId(null); setNuevaPwd('') }
    setSavingReset(false)
  }

  const getNombrePerfil = (u: any) => {
    const p = u.perfil
    if (!p) return <span className="text-gray-300 text-xs italic">Sin perfil</span>
    const nombre = `${p.primer_nombre ?? ''} ${p.primer_apellido ?? ''}`.trim()
    const extra = p.codigo_tecnico ? ` · ${p.codigo_tecnico}` : p.cargo ? ` · ${p.cargo}` : ''
    const sedeNombre = p.sede?.nombre ? ` — ${p.sede.nombre}` : ''
    return <span className="font-semibold">{nombre}{extra ? <span className="text-gray-400 font-normal">{extra}</span> : ''}{sedeNombre ? <span className="text-orange-500 text-xs">{sedeNombre}</span> : ''}</span>
  }

  const filtrados = usuarios.filter(u => {
    const txt = `${u.correo} ${u.perfil?.primer_nombre ?? ''} ${u.perfil?.primer_apellido ?? ''} ${u.perfil?.codigo_tecnico ?? ''}`.toLowerCase()
    return (!buscar || txt.includes(buscar.toLowerCase())) && (!filtroRol || u.rol === filtroRol)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👥 Gestión de Usuarios</div>
          <div className="text-xs text-gray-400">{filtrados.length} usuario(s)</div>
        </div>
        <button className="btn btn-p" onClick={abrirCrear}>＋ Crear usuario</button>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {pwdVisible && (
          <div className="alert al-w mb-4">
            <div className="font-bold">🔑 Contraseña generada — compártela con el usuario:</div>
            <div className="font-mono text-lg mt-1 bg-white px-3 py-1 rounded border inline-block">{pwdVisible}</div>
            <button className="ml-3 btn btn-g btn-sm" onClick={() => { navigator.clipboard.writeText(pwdVisible); flash('✅ Copiada') }}>📋 Copiar</button>
            <button className="ml-2 btn btn-g btn-sm" onClick={() => setPwdVisible(null)}>✕</button>
          </div>
        )}

        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <input className="inp" placeholder="🔍 Buscar por correo o nombre..." value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-44">
              <select className="inp" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="">Todos los roles</option>
                {Object.entries(ROL_LABEL).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gray-50 text-left border-b">
                    {['Nombre / Perfil','Correo','Rol','Estado','Último acceso','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-extrabold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((u: any, idx: number) => (
                    <tr key={u.id} className={`border-b hover:bg-gray-50 ${idx%2===0?'bg-white':'bg-gray-50/30'} ${!u.activo?'opacity-60':''}`}>
                      <td className="px-3 py-2.5">{getNombrePerfil(u)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{u.correo}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROL_COLOR[u.rol]??'bg-gray-100 text-gray-700'}`}>
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${u.activo?'badge-green':'badge-gray'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-GT') : 'Nunca'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-g btn-sm" title="Restablecer contraseña" onClick={() => { setResetId(u.id); setNuevaPwd('') }}>🔑</button>
                          <button className={`btn btn-sm ${u.activo?'btn-d':'btn-s'}`} onClick={() => toggleActivo(u.id, u.activo)}>
                            {u.activo ? 'Desact.' : 'Activar'}
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

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-12">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">＋ Crear usuario</h3>
                <button onClick={() => setModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[70vh]">

                <div className="fg">
                  <label className="lbl">Rol *</label>
                  <select className="inp" value={form.rol} onChange={F('rol')}>
                    <option value="tecnico">👨‍🏫 Técnico Docente</option>
                    <option value="director">🏫 Director de Sede</option>
                    <option value="enlace_institucional">🔗 Enlace Institucional</option>
                    <option value="coordinador_digeex">📋 Coordinador DIGEEX</option>
                    <option value="administrador">⚙️ Administrador</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Primer nombre *</label><input className="inp" value={form.primer_nombre} onChange={F('primer_nombre')} /></div>
                  <div className="fg"><label className="lbl">Segundo nombre</label><input className="inp" value={form.segundo_nombre} onChange={F('segundo_nombre')} /></div>
                  <div className="fg"><label className="lbl">Primer apellido *</label><input className="inp" value={form.primer_apellido} onChange={F('primer_apellido')} /></div>
                  <div className="fg"><label className="lbl">Segundo apellido</label><input className="inp" value={form.segundo_apellido} onChange={F('segundo_apellido')} /></div>
                </div>

                <div className="fg"><label className="lbl">Teléfono</label><input className="inp" value={form.telefono} onChange={F('telefono')} placeholder="5555-1234" /></div>

                {form.rol === 'tecnico' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="fg"><label className="lbl">CUI del técnico (13 dígitos)</label>
                      <input className="inp font-mono" value={form.cui} onChange={F('cui')} placeholder="Se genera si no se ingresa" /></div>
                    <div className="fg"><label className="lbl">Código técnico</label>
                      <input className="inp font-mono" value={form.codigo_tecnico} onChange={F('codigo_tecnico')} placeholder="Auto: TEC-001" /></div>
                    <div className="fg col-span-2"><label className="lbl">Especialidad</label>
                      <input className="inp" value={form.especialidad} onChange={F('especialidad')} /></div>
                    <div className="fg col-span-2"><label className="lbl">Sede principal (opcional)</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Sin asignar —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {form.rol === 'enlace_institucional' && (
                  <div className="space-y-3">
                    <div className="fg">
                      <label className="lbl">Sede / Institución a cargo *</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Seleccionar sede —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                      {sedes.length === 0 && (
                        <div className="text-xs text-red-500 mt-1">⚠️ No hay sedes registradas. Crea primero una en Admin → Sedes.</div>
                      )}
                    </div>
                    <div className="fg"><label className="lbl">Cargo (opcional)</label>
                      <input className="inp" value={form.cargo} onChange={F('cargo')} placeholder="Ej: Docente encargado" /></div>
                    <div className="fg"><label className="lbl">Técnico responsable (opcional)</label>
                      <select className="inp" value={form.tecnico_id} onChange={F('tecnico_id')}>
                        <option value="">— Sin asignar técnico —</option>
                        {tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {form.rol === 'director' && (
                  <div className="space-y-3">
                    <div className="fg"><label className="lbl">Sede que dirige</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Sin asignar —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                    </div>
                    <div className="fg"><label className="lbl">Cargo</label><input className="inp" value={form.cargo} onChange={F('cargo')} placeholder="Director(a)" /></div>
                  </div>
                )}

                {form.rol === 'coordinador_digeex' && (
                  <div className="fg"><label className="lbl">Cargo</label><input className="inp" value={form.cargo} onChange={F('cargo')} placeholder="Coordinador Departamental" /></div>
                )}

                <div className="border-t pt-3">
                  <div className="text-sm font-bold text-gray-700 mb-3">🔒 Credenciales de acceso</div>
                  <div className="fg"><label className="lbl">Correo electrónico *</label><input type="email" className="inp" value={form.correo} onChange={F('correo')} /></div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="fg"><label className="lbl">Contraseña *</label><input type="password" className="inp" value={form.contrasena} onChange={F('contrasena')} /></div>
                    <div className="fg"><label className="lbl">Confirmar</label><input type="password" className="inp" value={form.confirmar} onChange={F('confirmar')} /></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={crear} disabled={saving}>{saving ? '...' : '✅ Crear usuario'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resetId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-extrabold mb-4">🔑 Restablecer contraseña</h3>
            <div className="fg mb-4">
              <label className="lbl">Nueva contraseña</label>
              <input type="text" className="inp font-mono" value={nuevaPwd} onChange={e => setNuevaPwd(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-g" onClick={() => setResetId(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={resetPassword} disabled={savingReset}>{savingReset ? '...' : '🔑 Restablecer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
