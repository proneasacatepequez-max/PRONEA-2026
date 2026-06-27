'use client'
import { useState, useEffect, useCallback } from 'react'
import { ROL_LABELS } from '@/types'
import type { RolUsuario } from '@/types'

interface Usuario {
  id: string; correo: string; rol: RolUsuario; activo: boolean
  primer_ingreso: boolean; ultimo_acceso: string | null; creado_en: string
  perfil: {
    primer_nombre?: string; primer_apellido?: string
    codigo_tecnico?: string; telefono?: string; cargo?: string
    sede?: { id: string; nombre: string } | null
  } | null
}

interface Sede    { id: string; nombre: string }
interface Tecnico { id: string; primer_nombre: string; primer_apellido: string; codigo_tecnico: string | null }

const ROL_OPTS: { value: RolUsuario; label: string }[] = [
  { value: 'tecnico',              label: '🛠 Técnico PRONEA' },
  { value: 'director',             label: '🏫 Director' },
  { value: 'enlace_institucional', label: '🔗 Enlace Institucional' },
  { value: 'coordinador_digeex',   label: '📋 Coordinador DIGEEX' },
  { value: 'administrador',        label: '⚙️ Administrador' },
]

const FORM0 = {
  correo:'', contrasena:'', rol:'tecnico' as RolUsuario,
  primer_nombre:'', segundo_nombre:'', primer_apellido:'', segundo_apellido:'',
  telefono:'', codigo_tecnico:'', cui:'', especialidad:'',
  cargo:'', sede_id:'', tecnico_id:'',
}

const ROL_COLOR: Record<string, string> = {
  administrador:'bg-purple-100 text-purple-800', tecnico:'bg-blue-100 text-blue-800',
  director:'bg-green-100 text-green-800', enlace_institucional:'bg-yellow-100 text-yellow-800',
  coordinador_digeex:'bg-orange-100 text-orange-800',
}

export default function AdminUsuariosPage() {
  const [usuarios,     setUsuarios]     = useState<Usuario[]>([])
  const [sedes,        setSedes]        = useState<Sede[]>([])
  const [tecnicos,     setTecnicos]     = useState<Tecnico[]>([])
  const [loading,      setLoading]      = useState(true)
  const [busqueda,     setBusqueda]     = useState('')
  const [filtroRol,    setFiltroRol]    = useState('')
  const [filtroActivo, setFiltroActivo] = useState('')
  const [modalCrear,   setModalCrear]   = useState(false)
  const [modalReset,   setModalReset]   = useState<Usuario | null>(null)
  const [modalDetalle, setModalDetalle] = useState<Usuario | null>(null)
  const [form,         setForm]         = useState({ ...FORM0 })
  const [guardando,    setGuardando]    = useState(false)
  const [errorForm,    setErrorForm]    = useState('')
  const [exito,        setExito]        = useState('')
  const [nuevaPass,    setNuevaPass]    = useState('')
  const [guardandoPass,setGuardandoPass]= useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const [rU, rS, rT] = await Promise.all([
        fetch('/api/usuarios'), fetch('/api/sedes'), fetch('/api/tecnicos'),
      ])
      const [u, s, t] = await Promise.all([rU.json(), rS.json(), rT.json()])
      setUsuarios(Array.isArray(u) ? u : [])
      setSedes(Array.isArray(s) ? s : [])
      setTecnicos(Array.isArray(t) ? t : [])
    } catch { setUsuarios([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const lista = usuarios.filter(u => {
    const nombre = `${u.perfil?.primer_nombre ?? ''} ${u.perfil?.primer_apellido ?? ''}`.toLowerCase()
    const q = busqueda.toLowerCase()
    return (!q || u.correo.includes(q) || nombre.includes(q))
      && (!filtroRol    || u.rol    === filtroRol)
      && (!filtroActivo || String(u.activo) === filtroActivo)
  })

  const nombreCompleto = (u: Usuario) => {
    const p = u.perfil
    if (!p?.primer_nombre) return u.correo
    return `${p.primer_nombre} ${p.primer_apellido ?? ''}`.trim()
  }

  const crear = async () => {
    setErrorForm('')
    if (!form.correo.trim())          return setErrorForm('Correo requerido')
    if (!form.contrasena.trim())      return setErrorForm('Contraseña requerida')
    if (form.contrasena.length < 6)   return setErrorForm('Mínimo 6 caracteres')
    if (!form.primer_nombre.trim())   return setErrorForm('Primer nombre requerido')
    if (!form.primer_apellido.trim()) return setErrorForm('Primer apellido requerido')
    if (form.rol === 'enlace_institucional' && !form.sede_id)
      return setErrorForm('La sede es obligatoria para el enlace institucional')

    setGuardando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { setErrorForm(d.error ?? 'Error al crear'); return }
      setExito(`✅ Usuario creado — contraseña temporal: ${form.contrasena}`)
      setModalCrear(false); setForm({ ...FORM0 }); cargar()
    } catch { setErrorForm('Error de conexión') }
    finally { setGuardando(false) }
  }

  const toggleActivo = async (u: Usuario) => {
    if (!confirm(`¿${u.activo ? 'Desactivar' : 'Activar'} a ${u.correo}?`)) return
    await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id, activo: !u.activo }),
    })
    cargar()
  }

  const resetPass = async () => {
    if (!modalReset || nuevaPass.length < 6) return
    setGuardandoPass(true)
    const res = await fetch('/api/usuarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: modalReset.id, reset_password: nuevaPass }),
    })
    const d = await res.json()
    setGuardandoPass(false)
    if (res.ok) {
      setExito(`✅ Contraseña de ${modalReset.correo} restablecida`)
      setModalReset(null); setNuevaPass('')
    } else { alert(d.error ?? 'Error al resetear') }
  }

  const stats = {
    total:     usuarios.length,
    activos:   usuarios.filter(u => u.activo).length,
    tecnicos:  usuarios.filter(u => u.rol === 'tecnico').length,
    directores:usuarios.filter(u => u.rol === 'director').length,
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">

      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">👥 Gestión de Usuarios</h1>
          <p className="text-sm text-gray-500 mt-1">Crear, activar y administrar cuentas del sistema</p>
        </div>
        <button className="btn btn-p"
          onClick={() => { setForm({ ...FORM0 }); setErrorForm(''); setModalCrear(true) }}>
          ＋ Nuevo Usuario
        </button>
      </div>

      {exito && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex justify-between items-center">
          <span className="text-green-800 font-semibold text-sm">{exito}</span>
          <button onClick={() => setExito('')} className="text-green-600 text-xl font-bold">×</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon:'👥', value:stats.total,      label:'Total',      color:'blue'   },
          { icon:'✅', value:stats.activos,    label:'Activos',    color:'green'  },
          { icon:'🛠', value:stats.tecnicos,   label:'Técnicos',   color:'blue'   },
          { icon:'🏫', value:stats.directores, label:'Directores', color:'yellow' },
        ].map(s => (
          <div key={s.label} className="card text-center py-4">
            <div className="text-3xl mb-1">{s.icon}</div>
            <div className="text-2xl font-extrabold text-gray-800">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card flex flex-wrap gap-3 items-center">
        <input className="inp flex-1 min-w-[200px]" placeholder="🔍 Buscar nombre o correo..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <select className="inp w-48" value={filtroRol} onChange={e => setFiltroRol(e.target.value)}>
          <option value="">Todos los roles</option>
          {ROL_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select className="inp w-36" value={filtroActivo} onChange={e => setFiltroActivo(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
        <button className="btn btn-g text-sm" onClick={cargar}>🔄 Recargar</button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="ml-3 text-gray-500">Cargando usuarios...</span>
          </div>
        ) : lista.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-5xl mb-3">👥</div>
            <p className="font-semibold">No se encontraron usuarios</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Correo</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Sede / Código</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-center">1er Ingreso</th>
                  <th className="px-4 py-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((u, i) => (
                  <tr key={u.id}
                    className={`border-b hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{nombreCompleto(u)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono">{u.correo}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${ROL_COLOR[u.rol] ?? 'bg-gray-100 text-gray-700'}`}>
                        {ROL_LABELS[u.rol]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {u.perfil?.sede?.nombre ?? u.perfil?.codigo_tecnico ?? u.perfil?.cargo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {u.primer_ingreso
                        ? <span className="text-yellow-600 font-bold">⚠ Pendiente</span>
                        : <span className="text-green-600">✓ OK</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-center">
                        <button className="btn btn-g btn-sm text-xs" onClick={() => setModalDetalle(u)} title="Detalles">👁</button>
                        <button className={`btn btn-sm text-xs ${u.activo ? 'btn-red' : 'btn-green'}`}
                          onClick={() => toggleActivo(u)} title={u.activo ? 'Desactivar' : 'Activar'}>
                          {u.activo ? '🚫' : '✅'}
                        </button>
                        <button className="btn btn-g btn-sm text-xs"
                          onClick={() => { setModalReset(u); setNuevaPass('') }} title="Resetear contraseña">
                          🔑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2 text-xs text-gray-400 border-t">
              Mostrando {lista.length} de {usuarios.length} usuarios
            </div>
          </div>
        )}
      </div>

      {/* ── Modal Crear ───────────────────────────────────────── */}
      {modalCrear && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-extrabold text-lg">➕ Nuevo Usuario</h3>
              <button onClick={() => setModalCrear(false)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {errorForm && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm font-semibold">
                  ❌ {errorForm}
                </div>
              )}

              {/* Acceso */}
              <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-blue-700 uppercase">Datos de acceso</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg">
                    <label className="lbl">Correo *</label>
                    <input type="email" className="inp" placeholder="correo@ejemplo.com"
                      value={form.correo} onChange={e => setForm(f => ({ ...f, correo: e.target.value }))} />
                  </div>
                  <div className="fg">
                    <label className="lbl">Contraseña temporal *</label>
                    <input type="text" className="inp" placeholder="mínimo 6 caracteres"
                      value={form.contrasena} onChange={e => setForm(f => ({ ...f, contrasena: e.target.value }))} />
                  </div>
                </div>
                <div className="fg">
                  <label className="lbl">Rol *</label>
                  <select className="inp" value={form.rol}
                    onChange={e => setForm(f => ({ ...f, rol: e.target.value as RolUsuario, sede_id:'', tecnico_id:'' }))}>
                    {ROL_OPTS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Datos personales */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase">Datos personales</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="fg"><label className="lbl">Primer nombre *</label>
                    <input className="inp" value={form.primer_nombre} onChange={e => setForm(f => ({ ...f, primer_nombre: e.target.value }))} /></div>
                  <div className="fg"><label className="lbl">Segundo nombre</label>
                    <input className="inp" value={form.segundo_nombre} onChange={e => setForm(f => ({ ...f, segundo_nombre: e.target.value }))} /></div>
                  <div className="fg"><label className="lbl">Primer apellido *</label>
                    <input className="inp" value={form.primer_apellido} onChange={e => setForm(f => ({ ...f, primer_apellido: e.target.value }))} /></div>
                  <div className="fg"><label className="lbl">Segundo apellido</label>
                    <input className="inp" value={form.segundo_apellido} onChange={e => setForm(f => ({ ...f, segundo_apellido: e.target.value }))} /></div>
                </div>
                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" placeholder="5512-3456" value={form.telefono}
                    onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
              </div>

              {/* Técnico */}
              {form.rol === 'tecnico' && (
                <div className="bg-blue-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700 uppercase">Datos del técnico</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="fg"><label className="lbl">Código técnico</label>
                      <input className="inp" placeholder="Auto-generado" value={form.codigo_tecnico}
                        onChange={e => setForm(f => ({ ...f, codigo_tecnico: e.target.value }))} /></div>
                    <div className="fg"><label className="lbl">CUI</label>
                      <input className="inp font-mono" placeholder="Opcional" value={form.cui}
                        onChange={e => setForm(f => ({ ...f, cui: e.target.value }))} /></div>
                  </div>
                  <div className="fg"><label className="lbl">Especialidad</label>
                    <input className="inp" value={form.especialidad}
                      onChange={e => setForm(f => ({ ...f, especialidad: e.target.value }))} /></div>
                  <div className="fg"><label className="lbl">Sede principal</label>
                    <select className="inp" value={form.sede_id}
                      onChange={e => setForm(f => ({ ...f, sede_id: e.target.value }))}>
                      <option value="">— Sin sede —</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Director */}
              {form.rol === 'director' && (
                <div className="bg-green-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-green-700 uppercase">Datos del director</p>
                  <div className="fg"><label className="lbl">Sede que dirige</label>
                    <select className="inp" value={form.sede_id}
                      onChange={e => setForm(f => ({ ...f, sede_id: e.target.value }))}>
                      <option value="">— Seleccionar sede —</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Enlace */}
              {form.rol === 'enlace_institucional' && (
                <div className="bg-yellow-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-yellow-700 uppercase">Datos del enlace institucional</p>
                  <div className="fg"><label className="lbl">Sede / Institución *</label>
                    <select className="inp" value={form.sede_id}
                      onChange={e => setForm(f => ({ ...f, sede_id: e.target.value }))}>
                      <option value="">— Seleccionar sede —</option>
                      {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">Cargo</label>
                    <input className="inp" placeholder="Director de institución" value={form.cargo}
                      onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></div>
                  <div className="fg"><label className="lbl">Técnico asignado</label>
                    <select className="inp" value={form.tecnico_id}
                      onChange={e => setForm(f => ({ ...f, tecnico_id: e.target.value }))}>
                      <option value="">— Sin técnico —</option>
                      {tecnicos.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.primer_nombre} {t.primer_apellido} {t.codigo_tecnico ? `(${t.codigo_tecnico})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Coordinador */}
              {form.rol === 'coordinador_digeex' && (
                <div className="bg-orange-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-orange-700 uppercase">Datos del coordinador</p>
                  <div className="fg"><label className="lbl">Cargo</label>
                    <input className="inp" placeholder="Coordinador Departamental" value={form.cargo}
                      onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} /></div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalCrear(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={guardando}>
                {guardando ? '⏳ Creando...' : '✅ Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detalle ─────────────────────────────────────── */}
      {modalDetalle && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-base">👁 Detalle de Usuario</h3>
              <button onClick={() => setModalDetalle(null)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-2 text-sm">
              {[
                ['Nombre',        nombreCompleto(modalDetalle)],
                ['Correo',        modalDetalle.correo],
                ['Rol',           ROL_LABELS[modalDetalle.rol]],
                ['Estado',        modalDetalle.activo ? '✅ Activo' : '🚫 Inactivo'],
                ['Primer ingreso',modalDetalle.primer_ingreso ? '⚠ Pendiente' : '✓ Completado'],
                ['Teléfono',      modalDetalle.perfil?.telefono ?? '—'],
                ['Cargo',         modalDetalle.perfil?.cargo ?? '—'],
                ['Código técnico',modalDetalle.perfil?.codigo_tecnico ?? '—'],
                ['Sede',          modalDetalle.perfil?.sede?.nombre ?? '—'],
                ['Último acceso', modalDetalle.ultimo_acceso ? new Date(modalDetalle.ultimo_acceso).toLocaleString('es-GT') : 'Nunca'],
                ['Creado',        new Date(modalDetalle.creado_en).toLocaleDateString('es-GT')],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500 font-semibold">{k}</span>
                  <span className="text-gray-800 text-right max-w-[60%] break-all">{v}</span>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
              <button className="btn btn-g" onClick={() => setModalDetalle(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Reset Contraseña ─────────────────────────────── */}
      {modalReset && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">🔑 Resetear Contraseña</h3>
              <button onClick={() => setModalReset(null)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">
                Se restablecerá la contraseña de <strong>{modalReset.correo}</strong>.
                El usuario deberá cambiarla en su próximo ingreso.
              </p>
              <div className="fg">
                <label className="lbl">Nueva contraseña temporal *</label>
                <input type="text" className="inp" placeholder="mínimo 6 caracteres"
                  value={nuevaPass} onChange={e => setNuevaPass(e.target.value)} />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalReset(null)}>Cancelar</button>
              <button className="btn btn-p" onClick={resetPass}
                disabled={guardandoPass || nuevaPass.length < 6}>
                {guardandoPass ? '⏳...' : '✅ Resetear'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
