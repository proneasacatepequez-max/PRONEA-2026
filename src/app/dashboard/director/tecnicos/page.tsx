'use client'
// src/app/dashboard/director/tecnicos/page.tsx
// AGREGADO: sección para asignar sede/técnico a enlaces existentes
import { useState, useEffect, useCallback } from 'react'

export default function DirectorTecnicosPage() {
  const [tecnicos, setTecnicos] = useState<any[]>([])
  const [enlaces,  setEnlaces]  = useState<any[]>([])
  const [sedes,    setSedes]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState<'tecnicos'|'enlaces'>('tecnicos')
  const [msg,      setMsg]      = useState('')
  const [modal,    setModal]    = useState<any>(null)
  const [saving,   setSaving]   = useState(false)
  const [form, setForm] = useState({ sede_id:'', tecnico_id:'' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [tec, enl, se] = await Promise.all([
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
      fetch('/api/enlaces/asignar').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
    ])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setEnlaces(Array.isArray(enl) ? enl : [])
    setSedes(Array.isArray(se) ? se : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const abrirAsignar = (enlace: any) => {
    setForm({
      sede_id:    (enlace.sede as any)?.id ?? '',
      tecnico_id: (enlace.tecnico as any)?.id ?? '',
    })
    setModal(enlace)
  }

  const guardarAsignacion = async () => {
    if (!form.sede_id) { flash('❌ La sede es obligatoria'); return }
    setSaving(true)
    const res = await fetch('/api/enlaces/asignar', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enlace_id: modal.id,
        sede_id: form.sede_id,
        tecnico_id: form.tecnico_id || null,
      }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ ' + (d.mensaje ?? 'Asignación guardada') : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(null); await cargar() }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">👨‍🏫 Técnicos y Enlaces</div>
          <div className="text-xs text-gray-400">Gestiona técnicos y asigna sede/técnico a enlaces</div>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="flex gap-2 mb-5 border-b">
          {[{ k:'tecnicos', l:'👨‍🏫 Técnicos' }, { k:'enlaces', l:'🔗 Enlaces' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-colors ${tab===t.k?'border-pronea text-pronea bg-blue-50':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'tecnicos' ? (
          <div className="card overflow-hidden">
            {tecnicos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Sin técnicos registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white text-left">
                      {['Nombre','Código','Especialidad','Estudiantes','Sedes','Enlaces'].map(h => (
                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase whitespace-nowrap border-r border-blue-600 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tecnicos.map((t: any, idx: number) => (
                      <tr key={t.id} className={`border-b ${idx%2===0?'bg-white':'bg-sky-50/20'}`}>
                        <td className="px-3 py-2.5 font-semibold">{t.primer_nombre} {t.primer_apellido}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-gray-500">{t.codigo_tecnico}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{t.especialidad ?? '—'}</td>
                        <td className="px-3 py-2.5 text-center font-bold">{t.total_estudiantes ?? 0}</td>
                        <td className="px-3 py-2.5 text-center">{t.total_sedes ?? 0}</td>
                        <td className="px-3 py-2.5 text-center">{t.total_enlaces ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="alert al-i m-4 text-sm">
              📌 Cada enlace debe tener una sede asignada y, opcionalmente, un técnico responsable.
              Si un enlace nuevo no puede inscribir estudiantes, revisa que tenga ambos asignados aquí.
            </div>
            {enlaces.length === 0 ? (
              <div className="text-center py-10 text-gray-400">Sin enlaces registrados</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-gradient-to-r from-orange-600 to-orange-700 text-white text-left">
                      {['Nombre','Correo','Cargo','Sede asignada','Técnico responsable','Estado','Acciones'].map(h => (
                        <th key={h} className="px-3 py-3 text-xs font-bold uppercase whitespace-nowrap border-r border-orange-500 last:border-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {enlaces.map((e: any, idx: number) => (
                      <tr key={e.id} className={`border-b ${idx%2===0?'bg-white':'bg-amber-50/20'}`}>
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">{e.primer_nombre} {e.primer_apellido}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{(e.usuario as any)?.correo}</td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">{e.cargo ?? '—'}</td>
                        <td className="px-3 py-2.5">
                          {(e.sede as any)?.nombre
                            ? <span className="badge badge-green text-xs">{(e.sede as any).nombre}</span>
                            : <span className="badge badge-red text-xs">⚠️ Sin sede</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {(e.tecnico as any)?.primer_nombre
                            ? <span className="text-xs">{(e.tecnico as any).primer_nombre} {(e.tecnico as any).primer_apellido}</span>
                            : <span className="badge badge-yellow text-xs">Sin técnico</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`badge text-xs ${e.activo?'badge-green':'badge-gray'}`}>{e.activo?'Activo':'Inactivo'}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button className="btn btn-p btn-sm" onClick={() => abrirAsignar(e)}>
                            🔗 Asignar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">🔗 Asignar sede y técnico</h3>
                <button onClick={() => setModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">
                <div className="alert al-i text-xs">
                  Enlace: <b>{modal.primer_nombre} {modal.primer_apellido}</b>
                </div>
                <div className="fg">
                  <label className="lbl">Sede / Institución *</label>
                  <select className="inp" value={form.sede_id} onChange={e => setForm(p => ({ ...p, sede_id: e.target.value }))}>
                    <option value="">— Seleccionar sede —</option>
                    {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Técnico responsable</label>
                  <select className="inp" value={form.tecnico_id} onChange={e => setForm(p => ({ ...p, tecnico_id: e.target.value }))}>
                    <option value="">— Sin asignar —</option>
                    {tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.primer_nombre} {t.primer_apellido} ({t.codigo_tecnico})</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardarAsignacion} disabled={saving}>
                  {saving ? '...' : '✅ Guardar asignación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
