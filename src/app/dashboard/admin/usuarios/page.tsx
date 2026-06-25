'use client'
// src/app/dashboard/admin/usuarios/page.tsx
// FIX: mensajes claros de éxito/error, campo sede_id correcto para enlace
import { useState, useEffect, useCallback } from 'react'

const ROL_COLOR: Record<string, string> = {
  administrador:        'bg-purple-100 text-purple-700',
  tecnico:              'bg-blue-100 text-blue-700',
  director:             'bg-green-100 text-green-700',
  coordinador_digeex:   'bg-yellow-100 text-yellow-700',
  enlace_institucional: 'bg-orange-100 text-orange-700',
}
const ROL_LABEL: Record<string, string> = {
  administrador:        'Administrador',
  tecnico:              'Técnico',
  director:             'Director',
  coordinador_digeex:   'Coordinador DIGEEX',
  enlace_institucional: 'Enlace Institucional',
}

export default function UsuariosAdminPage() {
  const [usuarios,    setUsuarios]    = useState<any[]>([])
  const [sedes,       setSedes]       = useState<any[]>([])
  const [tecnicos,    setTecnicos]    = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [msg,         setMsg]         = useState('')
  const [msgType,     setMsgType]     = useState<'ok'|'err'>('ok')
  const [buscar,      setBuscar]      = useState('')
  const [filtroRol,   setFiltroRol]   = useState('')
  const [resetId,     setResetId]     = useState<string|null>(null)
  const [nuevaPwd,    setNuevaPwd]    = useState('')
  const [savingReset, setSavingReset] = useState(false)
  const [pwdVisible,  setPwdVisible]  = useState<{correo:string,pwd:string}|null>(null)

  const [form, setForm] = useState({
    rol: 'tecnico',
    correo:'', contrasena:'', confirmar:'',
    primer_nombre:'', segundo_nombre:'',
    primer_apellido:'', segundo_apellido:'',
    telefono:'', codigo_tecnico:'', cui:'',
    especialidad:'', cargo:'',
    sede_id:'', tecnico_id:'', departamento_id:'',
  })

  const flash = (m: string, tipo: 'ok'|'err' = 'ok') => {
    setMsg(m); setMsgType(tipo)
    setTimeout(() => setMsg(''), 6000)
  }

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

  const resetForm = () => setForm({
    rol:'tecnico', correo:'', contrasena:'', confirmar:'',
    primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
    telefono:'', codigo_tecnico:'', cui:'', especialidad:'', cargo:'',
    sede_id:'', tecnico_id:'', departamento_id:'',
  })

  const abrirCrear = () => { resetForm(); setModal(true) }

  const crear = async () => {
    // Validaciones en frontend antes de enviar
    if (!form.primer_nombre.trim())  { flash('❌ El primer nombre es requerido', 'err'); return }
    if (!form.primer_apellido.trim()){ flash('❌ El primer apellido es requerido', 'err'); return }
    if (!form.correo.trim())         { flash('❌ El correo electrónico es requerido', 'err'); return }
    if (!form.contrasena.trim())     { flash('❌ La contraseña es requerida', 'err'); return }
    if (form.contrasena !== form.confirmar) { flash('❌ Las contraseñas no coinciden', 'err'); return }
    if (form.contrasena.length < 6)  { flash('❌ La contraseña debe tener al menos 6 caracteres', 'err'); return }
    if (form.rol === 'enlace_institucional' && !form.sede_id) {
      flash('❌ La sede/institución es OBLIGATORIA para crear un enlace', 'err'); return
    }

    setSaving(true)
    const res = await fetch('/api/usuarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        sede_id:         form.sede_id        || undefined,
        tecnico_id:      form.tecnico_id     || undefined,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : undefined,
        ciclo_escolar:   2026,
      }),
    })
    const d = await res.json()

    if (res.ok) {
      setModal(false)
      resetForm()
      await cargar()
      setPwdVisible({ correo: form.correo, pwd: d.contrasena ?? form.contrasena })
      flash(d.mensaje ?? '✅ Usuario creado correctamente', 'ok')
    } else {
      flash('❌ ' + (d.error ?? 'Error al crear usuario'), 'err')
    }
    setSaving(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    const res = await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo }),
    })
    const d = await res.json()
    flash(d.mensaje ?? (res.ok ? '✅ Estado actualizado' : '❌ Error'), res.ok ? 'ok' : 'err')
    if (res.ok) await cargar()
  }

  const resetPassword = async () => {
    if (!nuevaPwd || nuevaPwd.length < 6) { flash('❌ Mínimo 6 caracteres', 'err'); return }
    setSavingReset(true)
    const res = await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: resetId, reset_password: nuevaPwd }),
    })
    const d = await res.json()
    flash(d.mensaje ?? (res.ok ? '✅ Contraseña restablecida' : '❌ Error'), res.ok ? 'ok' : 'err')
    if (res.ok) {
      setResetId(null); setNuevaPwd('')
      setPwdVisible({ correo: '(usuario)', pwd: nuevaPwd })
    }
    setSavingReset(false)
  }

  const getNombrePerfil = (u: any) => {
    const p = u.perfil
    if (!p) return <span className="text-gray-300 text-xs italic">Sin perfil configurado</span>
    const nombre = `${p.primer_nombre ?? ''} ${p.primer_apellido ?? ''}`.trim()
    const extra  = p.codigo_tecnico ? ` · ${p.codigo_tecnico}` : p.cargo ? ` · ${p.cargo}` : ''
    const sede   = p.sede?.nombre   ? ` — ${p.sede.nombre}` : ''
    const tecnico = p.tecnico ? ` [${p.tecnico.primer_nombre} ${p.tecnico.primer_apellido}]` : ''
    return (
      <span className="font-semibold">
        {nombre}
        {extra && <span className="text-gray-400 font-normal text-xs">{extra}</span>}
        {sede   && <span className="text-orange-500 text-xs"> {sede}</span>}
        {tecnico && <span className="text-blue-400 text-xs"> {tecnico}</span>}
      </span>
    )
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
        {msg && (
          <div className={`alert mb-4 ${msgType === 'ok' ? 'al-s' : 'al-e'}`}>
            {msg}
          </div>
        )}

        {/* Contraseña generada */}
        {pwdVisible && (
          <div className="alert al-w mb-4">
            <div className="font-bold text-sm">🔑 Contraseña generada — compártela con el usuario:</div>
            <div className="text-xs text-gray-600 mt-1">Correo: <b>{pwdVisible.correo}</b></div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg bg-white px-3 py-1 rounded border">{pwdVisible.pwd}</span>
              <button className="btn btn-g btn-sm"
                onClick={() => { navigator.clipboard.writeText(pwdVisible.pwd); flash('✅ Contraseña copiada') }}>
                📋 Copiar
              </button>
              <button className="btn btn-g btn-sm" onClick={() => setPwdVisible(null)}>✕</button>
            </div>
          </div>
        )}

        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <input className="inp" placeholder="🔍 Buscar por correo o nombre..."
                value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-48">
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
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-400">Sin usuarios</td>
                    </tr>
                  ) : filtrados.map((u: any, idx: number) => (
                    <tr key={u.id} className={`border-b hover:bg-gray-50 ${idx%2===0?'bg-white':'bg-gray-50/30'} ${!u.activo?'opacity-55':''}`}>
                      <td className="px-3 py-2.5">{getNombrePerfil(u)}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600">{u.correo}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ROL_COLOR[u.rol]??'bg-gray-100 text-gray-700'}`}>
                          {ROL_LABEL[u.rol] ?? u.rol}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${u.activo?'badge-green':'badge-gray'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                        {u.primer_ingreso && <span className="ml-1 badge badge-yellow text-xs">1er ingreso</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                        {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-GT') : 'Nunca'}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-g btn-sm" title="Restablecer contraseña"
                            onClick={() => { setResetId(u.id); setNuevaPwd('') }}>🔑</button>
                          <button className={`btn btn-sm ${u.activo?'btn-d':'btn-s'}`}
                            onClick={() => toggleActivo(u.id, u.activo)}>
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

      {/* Modal crear usuario */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
                <h3 className="text-base font-extrabold">＋ Crear usuario</h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>

              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
                {/* Rol */}
                <div className="fg">
                  <label className="lbl">Rol *</label>
                  <select className="inp" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value, sede_id:'', tecnico_id:'' }))}>
                    <option value="tecnico">👨‍🏫 Técnico Docente</option>
                    <option value="director">🏫 Director de Sede</option>
                    <option value="enlace_institucional">🔗 Enlace Institucional</option>
                    <option value="coordinador_digeex">📋 Coordinador DIGEEX</option>
                    <option value="administrador">⚙️ Administrador</option>
                  </select>
                </div>

                {/* Nombres */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Primer nombre *</label>
                    <input className="inp" value={form.primer_nombre} onChange={F('primer_nombre')} /></div>
                  <div className="fg"><label className="lbl">Segundo nombre</label>
                    <input className="inp" value={form.segundo_nombre} onChange={F('segundo_nombre')} /></div>
                  <div className="fg"><label className="lbl">Primer apellido *</label>
                    <input className="inp" value={form.primer_apellido} onChange={F('primer_apellido')} /></div>
                  <div className="fg"><label className="lbl">Segundo apellido</label>
                    <input className="inp" value={form.segundo_apellido} onChange={F('segundo_apellido')} /></div>
                </div>

                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={F('telefono')} placeholder="5555-1234" /></div>

                {/* Campos específicos por rol */}
                {form.rol === 'tecnico' && (
                  <div className="space-y-3 p-3 bg-blue-50 rounded-xl">
                    <div className="text-xs font-bold text-blue-700 uppercase">Datos del técnico</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="fg"><label className="lbl">CUI (13 dígitos)</label>
                        <input className="inp font-mono" value={form.cui} onChange={F('cui')}
                          placeholder="Se genera automáticamente si no ingresa" /></div>
                      <div className="fg"><label className="lbl">Código técnico</label>
                        <input className="inp font-mono" value={form.codigo_tecnico} onChange={F('codigo_tecnico')}
                          placeholder="Auto: TEC-001" /></div>
                    </div>
                    <div className="fg"><label className="lbl">Especialidad</label>
                      <input className="inp" value={form.especialidad} onChange={F('especialidad')}
                        placeholder="Ej: Educación de Jóvenes y Adultos" /></div>
                    <div className="fg"><label className="lbl">Sede principal (opcional)</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Sin asignar —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {form.rol === 'enlace_institucional' && (
                  <div className="space-y-3 p-3 bg-orange-50 rounded-xl">
                    <div className="text-xs font-bold text-orange-700 uppercase">Datos del enlace</div>
                    <div className="fg">
                      <label className="lbl">Sede / Institución a cargo *</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Seleccionar sede —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                      {sedes.length === 0 && (
                        <div className="text-xs text-red-500 mt-1">
                          ⚠️ No hay sedes registradas. Crea una en Admin → Sedes primero.
                        </div>
                      )}
                      {!form.sede_id && (
                        <div className="text-xs text-orange-600 mt-1 font-semibold">
                          ⚠️ La sede es obligatoria para que el enlace pueda inscribir estudiantes
                        </div>
                      )}
                    </div>
                    <div className="fg"><label className="lbl">Cargo</label>
                      <input className="inp" value={form.cargo} onChange={F('cargo')}
                        placeholder="Ej: Docente encargado, Director escolar..." /></div>
                    <div className="fg">
                      <label className="lbl">Técnico responsable</label>
                      <select className="inp" value={form.tecnico_id} onChange={F('tecnico_id')}>
                        <option value="">— Sin asignar técnico —</option>
                        {tecnicos.map((t: any) => (
                          <option key={t.id} value={t.id}>
                            {t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {form.rol === 'director' && (
                  <div className="space-y-3 p-3 bg-green-50 rounded-xl">
                    <div className="text-xs font-bold text-green-700 uppercase">Datos del director</div>
                    <div className="fg"><label className="lbl">Sede que dirige</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Sin asignar —</option>
                        {sedes.map((sd: any) => <option key={sd.id} value={sd.id}>{sd.nombre}</option>)}
                      </select>
                    </div>
                    <div className="fg"><label className="lbl">Cargo</label>
                      <input className="inp" value={form.cargo} onChange={F('cargo')} placeholder="Director(a)" /></div>
                  </div>
                )}

                {form.rol === 'coordinador_digeex' && (
                  <div className="fg">
                    <label className="lbl">Cargo</label>
                    <input className="inp" value={form.cargo} onChange={F('cargo')}
                      placeholder="Coordinador Departamental" />
                  </div>
                )}

                {/* Credenciales */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-gray-600 uppercase">🔒 Credenciales de acceso</div>
                  <div className="fg"><label className="lbl">Correo electrónico *</label>
                    <input type="email" className="inp" value={form.correo} onChange={F('correo')}
                      placeholder="correo@dominio.com" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="fg"><label className="lbl">Contraseña * (mín. 6 caracteres)</label>
                      <input type="password" className="inp" value={form.contrasena} onChange={F('contrasena')} /></div>
                    <div className="fg"><label className="lbl">Confirmar contraseña</label>
                      <input type="password" className="inp" value={form.confirmar} onChange={F('confirmar')} /></div>
                  </div>
                  <div className="text-xs text-amber-600">
                    💡 La contraseña aparecerá después de crear al usuario para que puedas compartirla.
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex-shrink-0">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={crear} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando...
                      </span>
                    : '✅ Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal restablecer contraseña */}
      {resetId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-extrabold mb-4">🔑 Restablecer contraseña</h3>
            <div className="fg mb-4">
              <label className="lbl">Nueva contraseña (mínimo 6 caracteres)</label>
              <input type="text" className="inp font-mono text-lg" value={nuevaPwd}
                onChange={e => setNuevaPwd(e.target.value)}
                placeholder="Escribe la nueva contraseña..." />
            </div>
            <div className="flex justify-end gap-3">
              <button className="btn btn-g" onClick={() => setResetId(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={resetPassword} disabled={savingReset}>
                {savingReset ? '...' : '🔑 Restablecer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
