'use client'
// src/app/dashboard/admin/usuarios/page.tsx
// FIX: Al crear usuario técnico se crea el perfil en tabla tecnicos correctamente
// FIX: Muestra la contraseña temporal para compartir con el usuario
// FIX: Formulario más completo con código técnico
import { useState, useEffect } from 'react'

const ROLES = [
  { value: 'tecnico',              label: '👨‍🏫 Técnico Docente' },
  { value: 'director',             label: '🏫 Director de Sede' },
  { value: 'coordinador_digeex',   label: '📋 Coordinador DIGEEX' },
  { value: 'enlace_institucional', label: '🔗 Enlace Institucional' },
  { value: 'administrador',        label: '⚙️ Administrador' },
]

const ROL_COLOR: Record<string, string> = {
  administrador:        'bg-purple-100 text-purple-800',
  tecnico:              'bg-blue-100 text-blue-800',
  director:             'bg-green-100 text-green-800',
  coordinador_digeex:   'bg-yellow-100 text-yellow-800',
  enlace_institucional: 'bg-orange-100 text-orange-800',
  estudiante:           'bg-gray-100 text-gray-600',
}

export default function UsuariosPage() {
  const [usuarios,  setUsuarios]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState({ text: '', ok: true })
  const [buscar,    setBuscar]    = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [creado,    setCreado]    = useState<any>(null) // muestra credenciales tras crear
  const [form, setForm] = useState({
    correo: '', contrasena: '', confirmar: '', rol: 'tecnico',
    primer_nombre: '', segundo_nombre: '', primer_apellido: '', segundo_apellido: '',
    telefono: '', codigo_tecnico: '',
  })

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/usuarios').then(r => r.json()).catch(() => [])
    setUsuarios(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok }); setTimeout(() => setMsg({ text: '', ok: true }), 4000)
  }

  const crear = async () => {
    if (!form.correo || !form.contrasena || !form.primer_nombre || !form.primer_apellido) {
      flash('Nombre, apellido, correo y contraseña son requeridos', false); return
    }
    if (form.contrasena.length < 6) { flash('La contraseña debe tener al menos 6 caracteres', false); return }
    if (form.contrasena !== form.confirmar) { flash('Las contraseñas no coinciden', false); return }
    setSaving(true)
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { flash(d.error ?? 'Error al crear usuario', false); setSaving(false); return }
    setCreado({ correo: form.correo, contrasena: form.contrasena, rol: form.rol, nombre: `${form.primer_nombre} ${form.primer_apellido}` })
    setModal(false)
    setForm({ correo:'', contrasena:'', confirmar:'', rol:'tecnico', primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'', telefono:'', codigo_tecnico:'' })
    cargar()
    setSaving(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    await fetch('/api/usuarios', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, activo: !activo }) })
    flash(`Usuario ${activo ? 'desactivado' : 'activado'}`)
    cargar()
  }

  const resetPassword = async (id: string, correo: string) => {
    const nueva = prompt(`Nueva contraseña para ${correo} (mínimo 6 caracteres):`)
    if (!nueva || nueva.length < 6) return
    const res = await fetch('/api/usuarios', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ id, reset_password: nueva }) })
    flash(res.ok ? `✅ Contraseña actualizada. Nueva: ${nueva}` : '❌ Error', res.ok)
  }

  const filtrados = usuarios.filter(u => {
    const b = buscar.toLowerCase()
    const nombre = `${u.perfil?.primer_nombre ?? ''} ${u.perfil?.primer_apellido ?? ''}`.toLowerCase()
    return (!buscar || u.correo?.toLowerCase().includes(b) || nombre.includes(b))
        && (!filtroRol || u.rol === filtroRol)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👥 Gestión de Usuarios</div>
          <div className="text-xs text-gray-400">Los usuarios los crea el administrador — no hay registro público</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Crear usuario</button>
      </header>

      <div className="pc">
        {msg.text && <div className={`alert mb-4 ${msg.ok ? 'al-s' : 'al-e'}`}>{msg.text}</div>}

        {/* Credenciales del usuario recién creado */}
        {creado && (
          <div className="card mb-4 border-2 border-green-300">
            <div className="card-title text-green-700">✅ Usuario creado — comparte estas credenciales</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-xs text-green-600 font-bold">Nombre</div>
                <div className="font-bold text-green-800">{creado.nombre}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-xs text-green-600 font-bold">Rol</div>
                <div className="font-bold text-green-800">{creado.rol}</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-xs text-green-600 font-bold">Correo</div>
                <div className="font-mono text-green-800 font-bold">{creado.correo}</div>
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-200">
                <div className="text-xs text-yellow-600 font-bold">Contraseña temporal</div>
                <div className="font-mono text-yellow-800 font-extrabold text-lg">{creado.contrasena}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">⚠️ Comparte estas credenciales con el usuario de forma segura. El usuario puede cambiar su contraseña desde su perfil.</p>
            <button className="btn btn-g btn-sm mt-2" onClick={() => setCreado(null)}>Cerrar</button>
          </div>
        )}

        <div className="alert al-i mb-4">
          <div className="text-xs">
            <b>👤 Roles del sistema:</b> Técnico (inscribe y califica estudiantes) · Director (autoriza enlaces) · Coordinador DIGEEX (solo lectura) · Enlace Institucional (permisos delegados) · Administrador (acceso total)<br />
            <b>🎓 Estudiantes:</b> se crean automáticamente al inscribirlos — no aparecen aquí.
          </div>
        </div>

        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre o correo..." value={buscar} onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-52">
              <label className="lbl">Filtrar por rol</label>
              <select className="inp" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="">Todos los roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroRol('') }}>Limpiar</button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="g4 mb-4">
          {ROLES.map(r => (
            <div key={r.value} className="sc blue text-center py-3">
              <div className="text-2xl font-extrabold text-gray-800">{usuarios.filter(u => u.rol === r.value).length}</div>
              <div className="text-xs text-gray-500 mt-1">{r.label}</div>
            </div>
          ))}
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-title">
            Usuarios registrados
            <span className="text-xs text-gray-400 font-normal">{filtrados.length} usuario(s)</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <div className="font-semibold">Sin usuarios</div>
              <button className="btn btn-p mt-3" onClick={() => setModal(true)}>＋ Crear el primero</button>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filtrados.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-semibold text-gray-800">
                          {u.perfil?.primer_nombre ? `${u.perfil.primer_nombre} ${u.perfil.primer_apellido}` : '—'}
                        </div>
                        <div className="text-xs text-gray-400">{u.perfil?.codigo_tecnico ? `Código: ${u.perfil.codigo_tecnico}` : u.perfil?.telefono ?? ''}</div>
                      </td>
                      <td className="font-mono text-xs text-gray-600">{u.correo}</td>
                      <td><span className={`badge text-xs ${ROL_COLOR[u.rol] ?? 'badge-gray'}`}>{u.rol?.replace(/_/g, ' ')}</span></td>
                      <td><span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                      <td className="text-xs text-gray-400">{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleDateString('es-GT') : 'Nunca'}</td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          <button className={`btn btn-sm ${u.activo ? 'btn-d' : 'btn-s'}`} onClick={() => toggleActivo(u.id, u.activo)}>
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button className="btn btn-g btn-sm" onClick={() => resetPassword(u.id, u.correo)}>🔑</button>
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

      {/* MODAL CREAR USUARIO */}
      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Crear nuevo usuario</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Rol *</label>
                <select className="inp" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Primer nombre *</label>
                  <input className="inp" value={form.primer_nombre} onChange={e => setForm(f => ({ ...f, primer_nombre: e.target.value }))} />
                </div>
                <div className="fg"><label className="lbl">Segundo nombre</label>
                  <input className="inp" value={form.segundo_nombre} onChange={e => setForm(f => ({ ...f, segundo_nombre: e.target.value }))} />
                </div>
                <div className="fg"><label className="lbl">Primer apellido *</label>
                  <input className="inp" value={form.primer_apellido} onChange={e => setForm(f => ({ ...f, primer_apellido: e.target.value }))} />
                </div>
                <div className="fg"><label className="lbl">Segundo apellido</label>
                  <input className="inp" value={form.segundo_apellido} onChange={e => setForm(f => ({ ...f, segundo_apellido: e.target.value }))} />
                </div>
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="5555-1234" />
                </div>
                {form.rol === 'tecnico' && (
                  <div className="fg"><label className="lbl">Código técnico</label>
                    <input className="inp" value={form.codigo_tecnico} onChange={e => setForm(f => ({ ...f, codigo_tecnico: e.target.value }))} placeholder="TEC-001" />
                  </div>
                )}
              </div>
              <div className="fg"><label className="lbl">Correo electrónico *</label>
                <input type="email" className="inp" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} placeholder="usuario@correo.com" />
              </div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Contraseña *</label>
                  <input type="text" className="inp font-mono" value={form.contrasena} onChange={e => setForm(f => ({ ...f, contrasena: e.target.value }))} placeholder="Mín. 6 caracteres" />
                </div>
                <div className="fg"><label className="lbl">Confirmar contraseña</label>
                  <input type="text" className="inp font-mono" value={form.confirmar} onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))} placeholder="Repite la contraseña" />
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700">
                ⚠️ La contraseña se mostrará después de crear al usuario para que puedas compartirla.
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>
                {saving ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</span> : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
