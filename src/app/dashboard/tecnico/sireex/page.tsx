'use client'
// src/app/dashboard/tecnico/sireex/page.tsx
// CORREGIDO: filtros por etapa, sede y estado agregados en la tabla de grupos
import { useState, useEffect, useCallback } from 'react'

const BADGE: Record<string,string> = {
  abierto:'badge-green', cerrado:'badge-yellow', exportado:'badge-blue'
}

const AREA_DEFAULTS: Record<string, string> = {
  'MAT':'Matemáticas','CN':'Ciencias Naturales','CS':'Ciencias Sociales',
  'CL':'Comunicación y Lenguaje','PROD':'Productividad y Desarrollo',
}
const nombreArea = (codigo: string) => AREA_DEFAULTS[codigo] ?? codigo

export default function TecnicoSireexPage() {
  const [grupos,       setGrupos]       = useState<any[]>([])
  const [etapas,       setEtapas]       = useState<any[]>([])
  const [sedes,        setSedes]        = useState<any[]>([])
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [msg,          setMsg]          = useState('')
  const [ciclo,        setCiclo]        = useState('2026')

  // NUEVO: filtros de tabla
  const [filtroEtapa,  setFiltroEtapa]  = useState('')
  const [filtroSede,   setFiltroSede]   = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroBuscar, setFiltroBuscar] = useState('')

  // Modales
  const [modal,        setModal]        = useState<'crear'|'editar'|'miembros'|null>(null)
  const [grupoActivo,  setGrupoActivo]  = useState<any>(null)
  const [form,         setForm]         = useState({ etapa_id:'', sede_id:'', nombre:'', codigo_mineduc:'', observaciones:'' })

  // Asignar estudiantes
  const [miembros,      setMiembros]     = useState<any[]>([])
  const [areas,         setAreas]        = useState<any[]>([])
  const [disponibles,   setDisponibles]  = useState<any[]>([])
  const [buscarEst,     setBuscarEst]    = useState('')
  const [seleccionados, setSeleccionados]= useState<Set<string>>(new Set())
  const [loadMiembros,  setLoadMiembros] = useState(false)
  const [asignando,     setAsignando]    = useState(false)

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

  useEffect(() => {
    if (modal !== 'miembros' || !grupoActivo) return
    const fn = async () => {
      setLoadMiembros(true)
      setBuscarEst(''); setSeleccionados(new Set())
      const [m, d] = await Promise.all([
        fetch(`/api/sireex/estudiantes?grupo_id=${grupoActivo.id}`).then(r=>r.json()).catch(()=>({miembros:[],areas:[]})),
        fetch(`/api/sireex/estudiantes?grupo_id=${grupoActivo.id}&disponibles=1`).then(r=>r.json()).catch(()=>({disponibles:[]})),
      ])
      setMiembros(m.miembros ?? [])
      setAreas(m.areas ?? [])
      setDisponibles(d.disponibles ?? [])
      setLoadMiembros(false)
    }
    fn()
  }, [modal, grupoActivo])

  // Filtrado de grupos
  const gruposFiltrados = grupos.filter(g => {
    const etapaNombre = (g.etapa as any)?.nombre ?? ''
    const sedeNombre  = (g.sede as any)?.nombre  ?? ''
    const texto = `${g.codigo} ${g.codigo_mineduc ?? ''} ${g.nombre ?? ''} ${etapaNombre} ${sedeNombre}`.toLowerCase()
    if (filtroBuscar && !texto.includes(filtroBuscar.toLowerCase())) return false
    if (filtroEtapa  && String((g.etapa as any)?.id) !== filtroEtapa)  return false
    if (filtroSede   && (g.sede as any)?.id !== filtroSede)            return false
    if (filtroEstado && g.estado !== filtroEstado)                     return false
    return true
  })

  const dispFiltrados = disponibles.filter(i => {
    if (!buscarEst) return true
    const e = i.estudiante as any
    return `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante} ${e?.cui}`.toLowerCase()
      .includes(buscarEst.toLowerCase())
  })

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const abrirCrear = () => { setForm({ etapa_id:'',sede_id:'',nombre:'',codigo_mineduc:'',observaciones:'' }); setGrupoActivo(null); setModal('crear') }
  const abrirEditar   = (g: any) => { setForm({ etapa_id:String((g.etapa as any)?.id??''), sede_id:(g.sede as any)?.id??'', nombre:g.nombre??'', codigo_mineduc:g.codigo_mineduc??'', observaciones:g.observaciones??'' }); setGrupoActivo(g); setModal('editar') }
  const abrirMiembros = (g: any) => { setGrupoActivo(g); setModal('miembros') }

  const guardar = async () => {
    if (modal==='crear' && (!form.etapa_id||!form.sede_id)) { flash('❌ Etapa y sede son requeridos'); return }
    setSaving(true)
    const body = modal==='crear'
      ? { etapa_id:parseInt(form.etapa_id), sede_id:form.sede_id, ciclo_escolar:parseInt(ciclo), nombre:form.nombre||null, codigo_mineduc:form.codigo_mineduc||null, observaciones:form.observaciones||null }
      : { id:grupoActivo.id, codigo_mineduc:form.codigo_mineduc||null, nombre:form.nombre||null, observaciones:form.observaciones||null }
    const res = await fetch('/api/sireex/grupos',{ method:modal==='crear'?'POST':'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
    const d = await res.json()
    flash(res.ok ? `✅ Grupo ${modal==='crear'?'creado':'actualizado'}` : '❌ '+(d.error??'Error'))
    if (res.ok) { setModal(null); cargar() }
    setSaving(false)
  }

  const asignarSeleccionados = async () => {
    if (seleccionados.size===0) { flash('❌ Selecciona al menos un estudiante'); return }
    setAsignando(true)
    const res = await fetch('/api/sireex/estudiantes',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ grupo_sireex_id:grupoActivo.id, inscripcion_ids:[...seleccionados] }) })
    const d = await res.json()
    flash(res.ok ? `✅ ${d.agregados} estudiante(s) asignados` : '❌ '+(d.error??'Error'))
    if (res.ok) {
      setSeleccionados(new Set())
      const [m, dsp] = await Promise.all([
        fetch(`/api/sireex/estudiantes?grupo_id=${grupoActivo.id}`).then(r=>r.json()).catch(()=>({miembros:[],areas:[]})),
        fetch(`/api/sireex/estudiantes?grupo_id=${grupoActivo.id}&disponibles=1`).then(r=>r.json()).catch(()=>({disponibles:[]})),
      ])
      setMiembros(m.miembros??[]); setAreas(m.areas??[]); setDisponibles(dsp.disponibles??[])
    }
    setAsignando(false)
  }

  const removerMiembro = async (inscGrupoId: string) => {
    if (!confirm('¿Remover este estudiante del grupo?')) return
    const res = await fetch(`/api/sireex/estudiantes?id=${inscGrupoId}`,{ method:'DELETE' })
    const d = await res.json()
    flash(res.ok ? '✅ Estudiante removido' : '❌ '+(d.error??'Error'))
    if (res.ok) setMiembros(p => p.filter(m => m.id !== inscGrupoId))
  }

  const toggleEstado = async (g: any) => {
    const nuevoEstado = g.estado==='abierto' ? 'cerrado' : 'abierto'
    if (!confirm(`¿${nuevoEstado==='cerrado'?'Cerrar':'Abrir'} el grupo ${g.codigo}?`)) return
    const res = await fetch('/api/sireex/grupos',{ method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ id:g.id, estado:nuevoEstado }) })
    const d = await res.json()
    flash(res.ok ? `✅ Grupo ${nuevoEstado}` : '❌ '+(d.error??'Error'))
    if (res.ok) cargar()
  }

  const exportarExcel = async (grupoId: string, codigo: string) => {
    try {
      const res = await fetch(`/api/sireex/export-excel?grupo_id=${grupoId}`)
      if (!res.ok) { flash('❌ Error al exportar'); return }
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `SIREEX-${codigo}.xlsx`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { flash('❌ Error al descargar') }
  }

  const limpiarFiltros = () => { setFiltroEtapa(''); setFiltroSede(''); setFiltroEstado(''); setFiltroBuscar('') }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Grupos SIREEX</div>
          <div className="text-xs text-gray-400">
            {gruposFiltrados.length} de {grupos.length} grupos · Ciclo {ciclo}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {msg && <span className={`text-xs font-bold ${msg.startsWith('✅')?'text-green-600':'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option><option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={abrirCrear}>＋ Nuevo grupo</button>
        </div>
      </header>

      <div className="pc">
        {/* FILTROS */}
        <div className="card mb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2 md:col-span-2">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Código, nombre, MINEDUC..."
                value={filtroBuscar} onChange={e => setFiltroBuscar(e.target.value)} />
            </div>
            <div>
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
                <option value="">Todas</option>
                {etapas.map((e:any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Sede</label>
              <select className="inp" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="">Todas</option>
                {sedes.map((s:any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="lbl">Estado</label>
              <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                <option value="abierto">Abierto</option>
                <option value="cerrado">Cerrado</option>
                <option value="exportado">Exportado</option>
              </select>
            </div>
          </div>
          {(filtroBuscar||filtroEtapa||filtroSede||filtroEstado) && (
            <div className="flex justify-end mt-2">
              <button className="btn btn-g btn-sm" onClick={limpiarFiltros}>✕ Limpiar filtros</button>
            </div>
          )}
        </div>

        <div className="card overflow-hidden p-0">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : gruposFiltrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-3">📤</div>
              <div className="font-semibold text-gray-600">
                {grupos.length === 0 ? 'Sin grupos SIREEX' : 'Sin resultados para los filtros'}
              </div>
              {grupos.length === 0 && (
                <button className="btn btn-p mt-4" onClick={abrirCrear}>＋ Crear primer grupo</button>
              )}
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
                  {gruposFiltrados.map((g:any, idx:number) => (
                    <tr key={g.id} className={`border-b hover:bg-blue-50 ${idx%2===0?'bg-white':'bg-sky-50/30'}`}>
                      <td className="px-3 py-2.5 font-mono font-bold text-blue-700">{g.codigo}</td>
                      <td className="px-3 py-2.5 font-mono text-sm">
                        {g.codigo_mineduc
                          ? <span className="text-green-600 font-bold">{g.codigo_mineduc}</span>
                          : <span className="text-gray-300 text-xs italic">Sin asignar</span>}
                      </td>
                      <td className="px-3 py-2.5 text-sm font-semibold whitespace-nowrap">{(g.etapa as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{(g.sede as any)?.nombre}</td>
                      <td className="px-3 py-2.5 text-xs">{g.nombre ?? '—'}</td>
                      <td className="px-3 py-2.5 text-center font-extrabold text-xl">{g._count?.estudiantes ?? 0}</td>
                      <td className="px-3 py-2.5">
                        <span className={`badge text-xs ${BADGE[g.estado]??'badge-gray'}`}>{g.estado}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 flex-nowrap">
                          <button className="btn btn-p btn-sm" onClick={() => abrirEditar(g)} title="Editar">✏️</button>
                          <button className="btn btn-s btn-sm" onClick={() => abrirMiembros(g)} title="Estudiantes">👥</button>
                          <button className={`btn btn-sm ${g.estado==='abierto'?'btn-d':'btn-s'}`}
                            onClick={() => toggleEstado(g)} title={g.estado==='abierto'?'Cerrar':'Abrir'}>
                            {g.estado==='abierto'?'🔴':'🟢'}
                          </button>
                          <button className="btn btn-g btn-sm" onClick={() => exportarExcel(g.id, g.codigo)} title="Excel">⬇️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 text-xs text-gray-400 border-t bg-gray-50">
                Mostrando {gruposFiltrados.length} de {grupos.length} grupos
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal crear/editar */}
      {(modal==='crear'||modal==='editar') && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">{modal==='crear'?'＋ Nuevo Grupo SIREEX':'✏️ Editar Grupo'}</h3>
                <button onClick={()=>setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-3">
                {modal==='crear' && <>
                  <div className="fg"><label className="lbl">Etapa *</label>
                    <select className="inp" value={form.etapa_id} onChange={F('etapa_id')}>
                      <option value="">— Seleccionar —</option>
                      {etapas.map((e:any)=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                    </select>
                  </div>
                  <div className="fg"><label className="lbl">Sede *</label>
                    <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                      <option value="">— Seleccionar —</option>
                      {sedes.map((s:any)=><option key={s.id} value={s.id}>{s.nombre}</option>)}
                    </select>
                  </div>
                </>}
                <div className="fg"><label className="lbl">Nombre del grupo</label>
                  <input className="inp" value={form.nombre} onChange={F('nombre')} placeholder="Ej: Grupo A..." /></div>
                <div className="fg"><label className="lbl">Código SIREEX — MINEDUC</label>
                  <input className="inp font-mono" value={form.codigo_mineduc} onChange={F('codigo_mineduc')} placeholder="Puedes ingresarlo después" /></div>
                <div className="fg"><label className="lbl">Observaciones</label>
                  <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')} /></div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={()=>setModal(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardar} disabled={saving}>
                  {saving ? '⏳ Guardando...' : modal==='crear'?'✅ Crear':'💾 Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal miembros */}
      {modal==='miembros' && grupoActivo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-8">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h3 className="text-base font-extrabold">
                    👥 {grupoActivo.codigo}
                    {grupoActivo.codigo_mineduc && <span className="text-green-600 ml-2">({grupoActivo.codigo_mineduc})</span>}
                  </h3>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {(grupoActivo.etapa as any)?.nombre} · {(grupoActivo.sede as any)?.nombre}
                  </div>
                </div>
                <button onClick={()=>setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>

              {loadMiembros ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="px-6 py-5 space-y-5">
                  {/* Agregar */}
                  <div className="card bg-blue-50/50 border border-blue-100">
                    <div className="font-bold text-blue-700 mb-3">➕ Agregar estudiantes</div>
                    <div className="flex gap-2 mb-3">
                      <input className="inp flex-1" placeholder="🔍 Nombre, código, CUI..."
                        value={buscarEst} onChange={e=>setBuscarEst(e.target.value)} />
                      <button className="btn btn-p" onClick={asignarSeleccionados}
                        disabled={asignando||seleccionados.size===0}>
                        {asignando ? '⏳...' : `✅ Asignar (${seleccionados.size})`}
                      </button>
                    </div>
                    {dispFiltrados.length === 0 ? (
                      <div className="text-sm text-gray-400 text-center py-3">
                        {disponibles.length===0 ? 'Todos los estudiantes de esta etapa ya están en el grupo' : 'Sin resultados'}
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-blue-50">
                            <tr>
                              <th className="px-2 py-1 w-8">
                                <input type="checkbox"
                                  checked={seleccionados.size===dispFiltrados.length && dispFiltrados.length>0}
                                  onChange={e => {
                                    if (e.target.checked) setSeleccionados(new Set(dispFiltrados.map((i:any)=>i.id)))
                                    else setSeleccionados(new Set())
                                  }} />
                              </th>
                              <th className="px-2 py-1 text-left text-xs font-bold">Código</th>
                              <th className="px-2 py-1 text-left text-xs font-bold">Nombre</th>
                              <th className="px-2 py-1 text-left text-xs font-bold">CUI</th>
                              <th className="px-2 py-1 text-left text-xs font-bold">Sede</th>
                            </tr>
                          </thead>
                          <tbody>
                            {dispFiltrados.map((i:any) => {
                              const e = i.estudiante as any
                              return (
                                <tr key={i.id} className="border-b hover:bg-blue-50/50">
                                  <td className="px-2 py-1 text-center">
                                    <input type="checkbox" checked={seleccionados.has(i.id)}
                                      onChange={ev => {
                                        const s = new Set(seleccionados)
                                        ev.target.checked ? s.add(i.id) : s.delete(i.id)
                                        setSeleccionados(s)
                                      }} />
                                  </td>
                                  <td className="px-2 py-1 font-mono text-xs text-blue-700">{e?.codigo_estudiante??'—'}</td>
                                  <td className="px-2 py-1 font-semibold whitespace-nowrap">{e?.primer_apellido} {e?.primer_nombre}</td>
                                  <td className="px-2 py-1 font-mono text-xs">{e?.cui??'—'}</td>
                                  <td className="px-2 py-1 text-xs text-gray-500">{(i.sede as any)?.nombre??'—'}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Miembros con notas */}
                  <div>
                    <div className="font-bold mb-3">📋 En el grupo ({miembros.length})</div>
                    {miembros.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">Sin estudiantes asignados</div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs border-collapse min-w-[900px]">
                          <thead>
                            <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white">
                              <th className="px-2 py-2 text-left border-r border-blue-700">Código</th>
                              <th className="px-2 py-2 text-left border-r border-blue-700">CUI</th>
                              <th className="px-2 py-2 text-left border-r border-blue-700">Nombre Completo</th>
                              <th className="px-2 py-2 text-left border-r border-blue-700">Etapa</th>
                              {areas.map((a:any) => (
                                <th key={a.id} className="px-2 py-2 text-center border-r border-blue-700">
                                  {nombreArea(a.codigo)}<div className="font-normal text-blue-200">/100</div>
                                </th>
                              ))}
                              <th className="px-2 py-2 text-center border-r border-blue-700">Total</th>
                              <th className="px-2 py-2 text-center border-r border-blue-700">Estado</th>
                              <th className="px-2 py-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {miembros.map((m:any, idx:number) => {
                              const e     = m.estudiante as any
                              const insc  = m.inscripcion as any
                              const notas = m.notas_por_area ?? {}
                              const total = areas.reduce((acc:number,a:any) => acc+(notas[a.codigo??a.nombre]?.total??0),0)
                              const promovido = areas.every((a:any) => notas[a.codigo??a.nombre]?.promovido===true)
                              const pendiente = areas.some((a:any)  => notas[a.codigo??a.nombre]?.promovido===null)
                              return (
                                <tr key={m.id} className={`border-b ${idx%2===0?'bg-white':'bg-sky-50/30'} hover:bg-blue-50`}>
                                  <td className="px-2 py-2 font-mono font-bold text-blue-700">{e?.codigo_estudiante??'—'}</td>
                                  <td className="px-2 py-2 font-mono">{e?.cui??'—'}</td>
                                  <td className="px-2 py-2 font-semibold whitespace-nowrap">{e?.primer_apellido} {e?.primer_nombre}</td>
                                  <td className="px-2 py-2 whitespace-nowrap">{(insc?.etapa as any)?.nombre}</td>
                                  {areas.map((a:any) => {
                                    const nota = notas[a.codigo??a.nombre]
                                    const val  = nota?.total
                                    return (
                                      <td key={a.id} className={`px-2 py-2 text-center font-bold ${
                                        val==null?'text-gray-300':val>=60?'text-green-600':'text-red-500'
                                      }`}>{val!=null?val:'—'}</td>
                                    )
                                  })}
                                  <td className={`px-2 py-2 text-center font-extrabold ${
                                    total>0?(promovido?'text-green-600':'text-red-500'):'text-gray-300'
                                  }`}>{total>0?Math.round(total*10)/10:'—'}</td>
                                  <td className="px-2 py-2 text-center">
                                    {pendiente ? <span className="badge badge-yellow text-xs">⏳</span>
                                      : promovido ? <span className="badge badge-green text-xs">✅</span>
                                      : <span className="badge badge-red text-xs">❌</span>}
                                  </td>
                                  <td className="px-2 py-2 text-center">
                                    <button className="btn btn-d btn-sm" onClick={()=>removerMiembro(m.id)} title="Remover">✕</button>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={()=>exportarExcel(grupoActivo.id,grupoActivo.codigo)}>⬇️ Excel con notas</button>
                <button className="btn btn-p" onClick={()=>setModal(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

