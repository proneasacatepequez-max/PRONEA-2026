'use client'
// src/app/dashboard/tecnico/dua/page.tsx
import { useState, useEffect } from 'react'

export default function DUAPage() {
  const [grupos,   setGrupos]   = useState<any[]>([])
  const [sesiones, setSesiones] = useState<any[]>([])
  const [sedes,    setSedes]    = useState<any[]>([])
  const [etapas,   setEtapas]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [ciclo,    setCiclo]    = useState('2026')
  const [selGrupo, setSelGrupo] = useState<any>(null)
  const [modalGrupo,  setModalGrupo]  = useState(false)
  const [modalSesion, setModalSesion] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [fGrupo, setFGrupo] = useState({ nombre:'', descripcion:'', sede_id:'', etapa_id:'', max_estudiantes:'10' })
  const [fSesion, setFSesion] = useState({ fecha_sesion:'', hora_inicio:'', hora_fin:'', observaciones:'' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = async () => {
    setLoading(true)
    const [g, se, et] = await Promise.all([
      fetch(`/api/dua?ciclo=${ciclo}`).then(r => r.json()).catch(() => ({ grupos:[] })),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
    ])
    setGrupos(g.grupos ?? [])
    setSedes(Array.isArray(se) ? se : [])
    setEtapas(Array.isArray(et) ? et : [])
    setLoading(false)
  }

  const cargarSesiones = async (grupoId: string) => {
    const d = await fetch(`/api/dua?ciclo=${ciclo}&grupo_id=${grupoId}`).then(r => r.json()).catch(() => ({ sesiones:[] }))
    setSesiones(d.sesiones ?? [])
  }

  useEffect(() => { cargar() }, [ciclo])

  const crearGrupo = async () => {
    if (!fGrupo.nombre || !fGrupo.sede_id) { flash('❌ Nombre y sede requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/dua', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tipo:'grupo', ...fGrupo, ciclo_escolar: ciclo, etapa_id: fGrupo.etapa_id ? parseInt(fGrupo.etapa_id) : null, max_estudiantes: parseInt(fGrupo.max_estudiantes) }) })
    const d = await res.json()
    flash(res.ok ? '✅ Grupo DUA creado' : '❌ ' + d.error)
    if (res.ok) { setModalGrupo(false); cargar() }
    setSaving(false)
  }

  const crearSesion = async () => {
    if (!selGrupo || !fSesion.fecha_sesion) { flash('❌ Fecha de sesión requerida'); return }
    setSaving(true)
    const res = await fetch('/api/dua', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ tipo:'sesion', grupo_dua_id: selGrupo.id, ...fSesion }) })
    const d = await res.json()
    flash(res.ok ? '✅ Sesión creada' : '❌ ' + d.error)
    if (res.ok) { setModalSesion(false); cargarSesiones(selGrupo.id) }
    setSaving(false)
  }

  const seleccionar = async (g: any) => {
    setSelGrupo(g)
    await cargarSesiones(g.id)
  }

  const ESTADO_COLOR: Record<string,string> = { activo:'badge-green', cerrado:'badge-gray', archivado:'badge-red', programada:'badge-yellow', realizada:'badge-green', cancelada:'badge-red' }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📐 Planificación DUA</div>
          <div className="text-xs text-gray-400">Diseño Universal para el Aprendizaje · Ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={() => setModalGrupo(true)}>＋ Nuevo grupo</button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="g2">
          {/* Lista de grupos */}
          <div className="card">
            <div className="card-title">Mis grupos DUA</div>
            {loading ? (
              <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
            ) : grupos.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">📐</div>
                <div className="text-sm">Sin grupos DUA</div>
                <button className="btn btn-p btn-sm mt-3" onClick={() => setModalGrupo(true)}>＋ Crear grupo</button>
              </div>
            ) : (
              <div className="space-y-2">
                {grupos.map((g: any) => (
                  <div key={g.id}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${selGrupo?.id === g.id ? 'border-pronea bg-pronea-light' : 'border-gray-100 hover:border-pronea/40 hover:bg-gray-50'}`}
                    onClick={() => seleccionar(g)}>
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-sm">{g.nombre}</div>
                      <span className={`badge text-xs ${ESTADO_COLOR[g.estado] ?? 'badge-gray'}`}>{g.estado}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(g.etapa as any)?.nombre} · {(g.sede as any)?.nombre}
                    </div>
                    <div className="text-xs text-gray-400">Máx. {g.max_estudiantes} estudiantes</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sesiones del grupo seleccionado */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="card-title">{selGrupo ? `Sesiones: ${selGrupo.nombre}` : 'Sesiones'}</div>
              {selGrupo && (
                <button className="btn btn-p btn-sm" onClick={() => { setFSesion({ fecha_sesion:'', hora_inicio:'', hora_fin:'', observaciones:'' }); setModalSesion(true) }}>
                  ＋ Nueva sesión
                </button>
              )}
            </div>
            {!selGrupo ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Selecciona un grupo para ver sus sesiones
              </div>
            ) : sesiones.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-3xl mb-2">🗓️</div>
                <div className="text-sm">Sin sesiones</div>
                <button className="btn btn-p btn-sm mt-3" onClick={() => { setFSesion({ fecha_sesion:'', hora_inicio:'', hora_fin:'', observaciones:'' }); setModalSesion(true) }}>
                  ＋ Programar sesión
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {sesiones.map((ses: any) => (
                  <div key={ses.id} className="p-3 border border-gray-100 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm">
                          {new Date(ses.fecha_sesion + 'T00:00:00').toLocaleDateString('es-GT', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}
                        </div>
                        {(ses.hora_inicio || ses.hora_fin) && (
                          <div className="text-xs text-gray-400">{ses.hora_inicio} – {ses.hora_fin}</div>
                        )}
                      </div>
                      <span className={`badge text-xs ${ESTADO_COLOR[ses.estado] ?? 'badge-gray'}`}>{ses.estado}</span>
                    </div>
                    {ses.observaciones && <div className="text-xs text-gray-500 mt-1">{ses.observaciones}</div>}
                    <div className="text-xs text-gray-400 mt-1">
                      {(ses.actividades_dua as any[])?.length ?? 0} actividad(es)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal crear grupo */}
      {modalGrupo && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModalGrupo(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo grupo DUA</h3>
              <button onClick={() => setModalGrupo(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg"><label className="lbl">Nombre del grupo *</label>
                <input className="inp" value={fGrupo.nombre} onChange={e => setFGrupo(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Grupo A — Primaria 2026" /></div>
              <div className="fg"><label className="lbl">Sede *</label>
                <select className="inp" value={fGrupo.sede_id} onChange={e => setFGrupo(f => ({ ...f, sede_id: e.target.value }))}>
                  <option value="">— Seleccionar sede —</option>
                  {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select></div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Etapa</label>
                  <select className="inp" value={fGrupo.etapa_id} onChange={e => setFGrupo(f => ({ ...f, etapa_id: e.target.value }))}>
                    <option value="">— Todas —</option>
                    {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                  </select></div>
                <div className="fg"><label className="lbl">Máx. estudiantes</label>
                  <input type="number" className="inp" value={fGrupo.max_estudiantes} onChange={e => setFGrupo(f => ({ ...f, max_estudiantes: e.target.value }))} /></div>
              </div>
              <div className="fg"><label className="lbl">Descripción</label>
                <textarea className="inp" rows={2} value={fGrupo.descripcion} onChange={e => setFGrupo(f => ({ ...f, descripcion: e.target.value }))} /></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalGrupo(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crearGrupo} disabled={saving}>{saving ? 'Creando...' : 'Crear grupo'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear sesión */}
      {modalSesion && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModalSesion(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nueva sesión DUA</h3>
              <button onClick={() => setModalSesion(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg"><label className="lbl">Fecha de sesión *</label>
                <input type="date" className="inp" value={fSesion.fecha_sesion} onChange={e => setFSesion(f => ({ ...f, fecha_sesion: e.target.value }))} /></div>
              <div className="fg2">
                <div className="fg"><label className="lbl">Hora inicio</label>
                  <input type="time" className="inp" value={fSesion.hora_inicio} onChange={e => setFSesion(f => ({ ...f, hora_inicio: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Hora fin</label>
                  <input type="time" className="inp" value={fSesion.hora_fin} onChange={e => setFSesion(f => ({ ...f, hora_fin: e.target.value }))} /></div>
              </div>
              <div className="fg"><label className="lbl">Observaciones</label>
                <textarea className="inp" rows={2} value={fSesion.observaciones} onChange={e => setFSesion(f => ({ ...f, observaciones: e.target.value }))} /></div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModalSesion(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crearSesion} disabled={saving}>{saving ? 'Creando...' : 'Crear sesión'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
