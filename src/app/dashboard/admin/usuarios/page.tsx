'use client'
// src/app/dashboard/admin/usuarios/page.tsx
// Gestión completa de usuarios: crear técnicos, enlaces, directores, coordinadores
// Los usuarios NO se registran solos — el admin los crea aquí
import { useState, useEffect } from 'react'

const ROLES = [
  { value: 'tecnico',               label: '👨‍🏫 Técnico Docente' },
  { value: 'director',              label: '🏫 Director de Sede' },
  { value: 'coordinador_digeex',    label: '📋 Coordinador DIGEEX' },
  { value: 'enlace_institucional',  label: '🔗 Enlace Institucional' },
  { value: 'administrador',         label: '⚙️ Administrador' },
]

const ROL_COLOR: Record<string, string> = {
  administrador:        'bg-purple-100 text-purple-800',
  tecnico:              'bg-blue-100 text-blue-800',
  director:             'bg-green-100 text-green-800',
  coordinador_digeex:   'bg-yellow-100 text-yellow-800',
  enlace_institucional: 'bg-orange-100 text-orange-800',
  estudiante:           'bg-gray-100 text-gray-700',
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]   = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState({ text: '', ok: true })
  const [buscar, setBuscar]       = useState('')
  const [filtroRol, setFiltroRol] = useState('')
  const [form, setForm] = useState({
    correo: '', contrasena: '', rol: 'tecnico',
    primer_nombre: '', primer_apellido: '', telefono: '',
  })

  const cargar = async () => {
    setLoading(true)
    const res = await fetch('/api/usuarios').then(r => r.json())
    setUsuarios(Array.isArray(res) ? res : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (text: string, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg({ text: '', ok: true }), 4000)
  }

  const crear = async () => {
    if (!form.correo || !form.contrasena || !form.primer_nombre || !form.primer_apellido) {
      flash('Correo, contraseña, nombre y apellido son requeridos', false); return
    }
    if (form.contrasena.length < 6) {
      flash('La contraseña debe tener al menos 6 caracteres', false); return
    }
    setSaving(true)
    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    if (!res.ok) { flash(d.error ?? 'Error al crear usuario', false); setSaving(false); return }
    flash(`✅ Usuario ${form.correo} creado correctamente`)
    setModal(false)
    setForm({ correo: '', contrasena: '', rol: 'tecnico', primer_nombre: '', primer_apellido: '', telefono: '' })
    cargar()
    setSaving(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo }),
    })
    flash(`Usuario ${activo ? 'desactivado' : 'activado'}`)
    cargar()
  }

  const resetPassword = async (id: string, correo: string) => {
    const nueva = prompt(`Nueva contraseña para ${correo} (mínimo 6 caracteres):`)
    if (!nueva || nueva.length < 6) return
    const res = await fetch('/api/usuarios', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reset_password: nueva }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada' : d.error, res.ok)
  }

  const filtrados = usuarios.filter(u => {
    const b = buscar.toLowerCase()
    const coincideBusqueda = !buscar ||
      u.correo?.toLowerCase().includes(b) ||
      u.perfil?.primer_nombre?.toLowerCase().includes(b) ||
      u.perfil?.primer_apellido?.toLowerCase().includes(b)
    const coincideRol = !filtroRol || u.rol === filtroRol
    return coincideBusqueda && coincideRol
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👥 Gestión de Usuarios</div>
          <div className="text-xs text-gray-400">
            Los usuarios no se registran solos — el administrador los crea aquí
          </div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>
          ＋ Nuevo usuario
        </button>
      </header>

      <div className="pc">
        {/* Mensaje */}
        {msg.text && (
          <div className={`alert mb-4 ${msg.ok ? 'al-s' : 'al-e'}`}>
            {msg.text}
          </div>
        )}

        {/* Info sobre roles */}
        <div className="alert al-i mb-5">
          <div>
            <b>📋 ¿Cómo funciona el registro de usuarios?</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>• <b>Técnicos, Directores, Coordinadores, Enlaces</b> → el Admin los crea desde aquí</div>
              <div>• <b>Estudiantes</b> → se crean automáticamente al inscribirlos (el Técnico los inscribe)</div>
              <div>• <b>Contraseña inicial</b> → el admin la define al crear el usuario y se la comunica al usuario</div>
              <div>• <b>Cambio de contraseña</b> → desde aquí con el botón "Resetear contraseña"</div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="lbl">Buscar</label>
              <input
                className="inp"
                placeholder="Nombre o correo..."
                value={buscar}
                onChange={e => setBuscar(e.target.value)}
              />
            </div>
            <div className="w-52">
              <label className="lbl">Filtrar por rol</label>
              <select className="inp" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
                <option value="">Todos los roles</option>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroRol('') }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="g4 mb-4">
          {ROLES.map(r => {
            const count = usuarios.filter(u => u.rol === r.value).length
            return (
              <div key={r.value} className="sc blue text-center py-3">
                <div className="text-2xl font-extrabold text-gray-800">{count}</div>
                <div className="text-xs text-gray-500 mt-1">{r.label}</div>
              </div>
            )
          })}
        </div>

        {/* Tabla */}
        <div className="card">
          <div className="card-title">
            Usuarios del sistema
            <span className="text-xs text-gray-400 font-normal">{filtrados.length} resultado(s)</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">👥</div>
              <div className="font-semibold">No hay usuarios</div>
              <div className="text-sm mt-1">Crea el primero con el botón "＋ Nuevo usuario"</div>
            </div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Correo</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Último acceso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-semibold text-gray-800">
                          {u.perfil?.primer_nombre
                            ? `${u.perfil.primer_nombre} ${u.perfil.primer_apellido}`
                            : '—'}
                        </div>
                        <div className="text-xs text-gray-400">{u.perfil?.telefono ?? ''}</div>
                      </td>
                      <td className="font-mono text-xs text-gray-600">{u.correo}</td>
                      <td>
                        <span className={`badge text-xs ${ROL_COLOR[u.rol] ?? 'bg-gray-100 text-gray-600'}`}>
                          {u.rol?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.activo ? 'badge-green' : 'badge-red'}`}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-xs text-gray-400">
                        {u.ultimo_acceso
                          ? new Date(u.ultimo_acceso).toLocaleDateString('es-GT')
                          : 'Nunca'}
                      </td>
                      <td>
                        <div className="flex gap-1 flex-wrap">
                          <button
                            className={`btn btn-sm ${u.activo ? 'btn-d' : 'btn-s'}`}
                            onClick={() => toggleActivo(u.id, u.activo)}
                          >
                            {u.activo ? 'Desactivar' : 'Activar'}
                          </button>
                          <button
                            className="btn btn-g btn-sm"
                            onClick={() => resetPassword(u.id, u.correo)}
                          >
                            🔑 Contraseña
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
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold text-gray-800">＋ Crear nuevo usuario</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="alert al-i text-xs">
                El usuario recibirá sus credenciales (correo + contraseña) de tu parte.
                Puede cambiar su contraseña después de ingresar.
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Primer nombre *</label>
                  <input className="inp" value={form.primer_nombre} onChange={e => setForm(f => ({ ...f, primer_nombre: e.target.value }))} />
                </div>
                <div className="fg">
                  <label className="lbl">Primer apellido *</label>
                  <input className="inp" value={form.primer_apellido} onChange={e => setForm(f => ({ ...f, primer_apellido: e.target.value }))} />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Correo electrónico *</label>
                <input type="email" className="inp" value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} placeholder="usuario@correo.com" />
              </div>
              <div className="fg">
                <label className="lbl">Contraseña inicial *</label>
                <input type="text" className="inp" value={form.contrasena} onChange={e => setForm(f => ({ ...f, contrasena: e.target.value }))} placeholder="Mínimo 6 caracteres" />
                <p className="text-xs text-gray-400 mt-1">Comparte esta contraseña con el usuario para su primer ingreso.</p>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Rol *</label>
                  <select className="inp" value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="5555-1234" />
                </div>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creando...</span>
                  : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
