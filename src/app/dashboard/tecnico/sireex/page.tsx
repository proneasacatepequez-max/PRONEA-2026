'use client'
// src/app/dashboard/tecnico/sireex/page.tsx
// FIX: loading correcto, botones editar/eliminar/activar, filtro estudiantes por etapa
import { useState, useEffect, useCallback } from 'react'

export default function TecnicoSireexPage() {
  const [grupos,   setGrupos]   = useState<any[]>([])
  const [etapas,   setEtapas]   = useState<any[]>([])
  const [sedes,    setSedes]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [ciclo,    setCiclo]    = useState('2026')
  const [modal,    setModal]    = useState<'crear'|'editar'|null>(null)
  const [editGrupo,setEditGrupo]= useState<any>(null)
  const [form, setForm] = useState({ etapa_id:'', sede_id:'', nombre:'', codigo_mineduc:'', observaciones:'' })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [g, et, se] = await Promise.all([
      fetch(`/api/sireex/grupos?ciclo=${ciclo}`).then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
    ])
    setGrupos(Array.isArray(g) ? g : [])
    setEtapas(Array.isArray(et) ? et : [])
    setSedes(Array.isArray(se) ? se : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const abrirCrear = () => {
    setForm({ etapa_id:'', sede_id:'', nombre:'', codigo_mineduc:'', observaciones:'' })
    setEditGrupo(null)
    setModal('crear')
  }

  const abrirEditar = (g: any) => {
    setForm({
      etapa_id:      (g.etapa as any)?.id ? String((g.etapa as any).id) : '',
      sede_id:       (g.sede  as any)?.id ?? '',
      nombre:        g.nombre        ?? '',
      codigo_mineduc:g.codigo_mineduc ?? '',
      observaciones: g.observaciones  ?? '',
    })
    setEditGrupo(g)
    setModal('editar')
  }

  const guardar = async () => {
    if (!form.etapa_id || !form.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/sireex/grupos', {
      method: modal === 'crear' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modal === 'crear'
        ? { etapa_id: parseInt(form.etapa_id), sede_id: form.sede_id, ciclo_escolar: parseInt(ciclo), nombre: form.nombre || null, codigo_mineduc: form.codigo_mineduc || null, observaciones: form.observaciones || null }
        : { id: editGrupo.id, codigo_mineduc: form.codigo_mineduc || null, nombre: form.nombre || null, observaciones: form.observaciones || null }
      ),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Grupo ${modal === 'crear' ? 'creado' : 'actualizado'}: ${d.codigo ?? ''}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(null); await cargar() }
    setSaving(false)
  }

  const toggleEstado = async (g: any) => {
    const nuevoEstado = g.estado === 'abierto' ? 'cerrado' : 'abierto'
    const res = await fetch('/api/sireex/grupos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: g.id, estado: nuevoEstado }),
    })
    if (res.ok) { await cargar(); flash(`✅ Grupo ${nuevoEstado}`) }
    else flash('❌ Error al actualizar estado')
  }

  const exportarExcel = async (grupoId: string, codigo: string) => {
    const res = await fetch(`/api/sireex/exportar?grupo_id=${grupoId}`)
    if (!res.ok) { flash('❌ Error al exportar'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `SIREEX-${codigo}.xlsx`
    a.click()
    flash(`✅ Descargado: ${codigo}`)
  }

  const BADGE: Record<string, string> = {
    abierto: 'badge-green', cerrado: 'badge-yellow', exportado: 'badge-blue',
  }
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Mis Grupos SIREEX</div>
          <div className="text-xs text-gray-400">{grupos.length} grupo(s) · ciclo {ciclo}</div>
        </div>
        <div className="flex gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={abrirCrear}>＋ Nuevo grupo</button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          📋 Crea un grupo, agrega los estudiantes de la misma etapa y cuando MINEDUC te asigne el código SIREEX, ingrésalo aquí. Luego descarga el Excel.
        </div>

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : grupos.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📤</div>
              <div className="font-semibold text-gray-600">Sin grupos SIREEX</div>
              <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Crear primer grupo</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[900px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-left">
                    {['Código Interno','Código MINEDUC','Etapa','Sede','Nombre','Estudiantes','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase whitespace-nowrap border-r border-blue-700 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {grupos.map((g: any, idx: number) => (
                    <tr key={g.id} className={`border-b hover:bg-blue-50 transition-colors ${idx%2===0?'bg-white':'bg-sky-50/30'}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-sm text-blue-700">{g.codigo}</td>
                      <td className="px-3 py-2.5 font-mono text-sm">
                        {g.codigo_mineduc
                          ? <span className="text-green-600 font-bold">{g.codigo_mineduc}</span>
                          : <span className="text-gray-300 text-xs italic">Sin asignar</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold whitespace-nowrap">{(g.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{(g.sede as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{g.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-lg">{g._count?.estudiantes ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${BADGE[g.estado] ?? 'badge-gray'}`}>{g.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-p btn-sm" onClick={() => abrirEditar(g)} title="Editar">✏️</button>
                          <button className={`btn btn-sm ${g.estado==='abierto'?'btn-d':'btn-s'}`}
                            onClick={() => toggleEstado(g)} title={g.estado==='abierto'?'Cerrar':'Abrir'}>
                            {g.estado==='abierto'?'🔴':'🟢'}
                          </button>
                          <button className="btn btn-g btn-sm" onClick={() => exportarExcel(g.id, g.codigo)} title="Excel">
                            ⬇️
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

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">
                  {modal==='crear' ? '＋ Nuevo Grupo SIREEX' : '✏️ Editar Grupo'}
                </h3>
                <button onClick={() => setModal(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">
                {modal === 'crear' && (
                  <>
                    <div className="fg"><label className="lbl">Etapa *</label>
                      <select className="inp" value={form.etapa_id} onChange={F('etapa_id')}>
                        <option value="">— Seleccionar etapa —</option>
                        {etapas.map((e:any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                      </select>
                    </div>
                    <div className="fg"><label className="lbl">Sede *</label>
                      <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                        <option value="">— Seleccionar sede —</option>
                        {sedes.map((s:any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="fg"><label className="lbl">Nombre del grupo (opcional)</label>
                  <input className="inp" value={form.nombre} onChange={F('nombre')} placeholder="Ej: Grupo A, Grupo Mañana..." /></div>
                <div className="fg"><label className="lbl">Código SIREEX — MINEDUC</label>
                  <input className="inp font-mono" value={form.codigo_mineduc} onChange={F('codigo_mineduc')} placeholder="Lo puedes ingresar después" /></div>
                <div className="fg"><label className="lbl">Observaciones</label>
                  <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')} /></div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                    : modal==='crear' ? '✅ Crear grupo' : '💾 Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
