'use client'
// src/app/dashboard/tecnico/sireex/page.tsx — NUEVA PÁGINA
// El técnico crea y gestiona sus grupos SIREEX
// Puede descargar Excel con todos los estudiantes de un grupo
import { useState, useEffect } from 'react'

export default function TecnicoSireexPage() {
  const [grupos,   setGrupos]   = useState<any[]>([])
  const [etapas,   setEtapas]   = useState<any[]>([])
  const [sedes,    setSedes]    = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [ciclo,    setCiclo]    = useState('2026')

  const [form, setForm] = useState({
    etapa_id: '', sede_id: '', nombre: '', codigo_mineduc: '', observaciones: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
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
  }

  useEffect(() => { cargar() }, [ciclo])

  const crearGrupo = async () => {
    if (!form.etapa_id || !form.sede_id) { flash('❌ Etapa y sede son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/sireex/grupos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        etapa_id:      parseInt(form.etapa_id),
        sede_id:       form.sede_id,
        ciclo_escolar: parseInt(ciclo),
        nombre:        form.nombre || null,
        codigo_mineduc: form.codigo_mineduc || null,
        observaciones:  form.observaciones  || null,
      }),
    })
    const d = await res.json()
    flash(res.ok ? `✅ Grupo creado: ${d.codigo}` : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const descargarExcel = async (grupoId: string, codigo: string) => {
    const res = await fetch(`/api/sireex/exportar?grupo_id=${grupoId}`)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      flash('❌ ' + (d.error ?? 'Error al exportar'))
      return
    }
    const blob = await res.blob()
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `SIREEX-${codigo}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const actualizarCodigo = async (grupoId: string, codigo_mineduc: string) => {
    if (!codigo_mineduc.trim()) return
    const res = await fetch('/api/sireex/grupos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: grupoId, codigo_mineduc: codigo_mineduc.trim() }),
    })
    flash(res.ok ? '✅ Código SIREEX actualizado' : '❌ Error al actualizar')
  }

  const ESTADO_BADGE: Record<string, string> = {
    abierto:   'badge-green',
    cerrado:   'badge-yellow',
    exportado: 'badge-blue',
  }

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📤 Mis Grupos SIREEX</div>
          <div className="text-xs text-gray-400">
            Grupos para exportación al sistema MINEDUC
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
          </select>
          <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nuevo grupo</button>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4 text-sm">
          <div>
            <b>📋 ¿Cómo funciona?</b> Crea un grupo y agrega los estudiantes de la misma etapa.
            Cuando MINEDUC te asigne el código SIREEX, ingrésalo aquí. Luego descarga el Excel
            con el listado completo para entregar.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : grupos.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📤</div>
            <div className="font-semibold text-gray-600">Sin grupos SIREEX</div>
            <div className="text-sm text-gray-400 mt-1">Crea tu primer grupo para comenzar</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Crear grupo</button>
          </div>
        ) : (
          <div className="space-y-4">
            {grupos.map((g: any) => (
              <GrupoCard
                key={g.id}
                grupo={g}
                onDescargar={() => descargarExcel(g.id, g.codigo)}
                onActualizarCodigo={(cod) => actualizarCodigo(g.id, cod)}
                onRecargar={cargar}
                flash={flash}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal crear grupo */}
      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo Grupo SIREEX</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Etapa *</label>
                <select className="inp" value={form.etapa_id} onChange={F('etapa_id')}>
                  <option value="">— Seleccionar —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Sede *</label>
                <select className="inp" value={form.sede_id} onChange={F('sede_id')}>
                  <option value="">— Seleccionar —</option>
                  {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Nombre del grupo (opcional)</label>
                <input className="inp" value={form.nombre} onChange={F('nombre')}
                  placeholder="Ej: Grupo A, Grupo Mañana..." />
              </div>
              <div className="fg">
                <label className="lbl">Código SIREEX (MINEDUC) — si ya lo tienes</label>
                <input className="inp font-mono" value={form.codigo_mineduc} onChange={F('codigo_mineduc')}
                  placeholder="Lo puedes ingresar después" />
              </div>
              <div className="fg">
                <label className="lbl">Observaciones</label>
                <textarea className="inp" rows={2} value={form.observaciones} onChange={F('observaciones')} />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crearGrupo} disabled={saving}>
                {saving
                  ? <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creando...
                    </span>
                  : '✅ Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GrupoCard({ grupo, onDescargar, onActualizarCodigo, onRecargar, flash }: any) {
  const [expandido,    setExpandido]    = useState(false)
  const [codigoEdit,   setCodigoEdit]   = useState(grupo.codigo_mineduc ?? '')
  const [estudiantes,  setEstudiantes]  = useState<any[]>([])
  const [cargandoEst,  setCargandoEst]  = useState(false)
  const [buscadorEst,  setBuscadorEst]  = useState('')
  const [inscritos,    setInscritos]    = useState<any[]>([])
  const [cargandoInsc, setCargandoInsc] = useState(false)
  const [agregando,    setAgregando]    = useState<string | null>(null)

  const cargarEstudiantes = async () => {
    setCargandoEst(true)
    const res = await fetch(`/api/sireex/estudiantes?grupo_id=${grupo.id}`)
    const d   = await res.json()
    setEstudiantes(Array.isArray(d) ? d : [])
    setCargandoEst(false)
  }

  const cargarInscritos = async () => {
    setCargandoInsc(true)
    const res = await fetch(
      `/api/inscripciones?ciclo=${grupo.ciclo_escolar}&estado=en_curso&etapa_id=${(grupo.etapa as any)?.id}`
    )
    const d = await res.json()
    setInscritos(d.data ?? [])
    setCargandoInsc(false)
  }

  const handleExpandir = () => {
    if (!expandido) { cargarEstudiantes(); cargarInscritos() }
    setExpandido(!expandido)
  }

  const agregarEstudiante = async (inscripcion_id: string) => {
    setAgregando(inscripcion_id)
    const res = await fetch('/api/sireex/estudiantes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grupo_sireex_id: grupo.id, inscripcion_id }),
    })
    const d = await res.json()
    if (!res.ok) { flash('❌ ' + d.error) }
    else { flash('✅ Estudiante agregado'); cargarEstudiantes() }
    setAgregando(null)
  }

  const filtradosParaAgregar = inscritos.filter(i => {
    const e = i.estudiante as any
    const txt = `${e?.primer_nombre} ${e?.primer_apellido} ${e?.codigo_estudiante}`.toLowerCase()
    const yaEsta = estudiantes.some((est: any) => est.inscripcion_id === i.id)
    return !yaEsta && (!buscadorEst || txt.includes(buscadorEst.toLowerCase()))
  })

  const ESTADO_BADGE: Record<string, string> = {
    abierto:   'badge-green',
    cerrado:   'badge-yellow',
    exportado: 'badge-blue',
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-extrabold text-gray-800 font-mono">{grupo.codigo}</span>
            <span className={`badge ${ESTADO_BADGE[grupo.estado] ?? 'badge-gray'}`}>{grupo.estado}</span>
          </div>
          <div className="text-sm text-gray-500">
            {(grupo.etapa as any)?.nombre} · {(grupo.sede as any)?.nombre}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {grupo._count?.estudiantes ?? 0} estudiante(s) · ciclo {grupo.ciclo_escolar}
          </div>
          {grupo.codigo_mineduc && (
            <div className="text-xs text-blue-600 font-mono mt-0.5">
              Código MINEDUC: {grupo.codigo_mineduc}
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button className="btn btn-g btn-sm" onClick={handleExpandir}>
            {expandido ? '▲ Cerrar' : '▼ Ver estudiantes'}
          </button>
          <button className="btn btn-p btn-sm" onClick={onDescargar}>
            ⬇️ Excel
          </button>
        </div>
      </div>

      {expandido && (
        <div className="mt-4 border-t pt-4 space-y-4">
          {/* Código MINEDUC */}
          <div className="flex items-end gap-2">
            <div className="fg flex-1">
              <label className="lbl">Código SIREEX (MINEDUC)</label>
              <input
                className="inp font-mono"
                value={codigoEdit}
                onChange={e => setCodigoEdit(e.target.value)}
                placeholder="Ingresa el código asignado por MINEDUC"
              />
            </div>
            <button
              className="btn btn-g btn-sm"
              onClick={() => onActualizarCodigo(codigoEdit)}
            >
              💾 Guardar
            </button>
          </div>

          {/* Estudiantes del grupo */}
          <div>
            <div className="text-xs font-bold text-gray-500 mb-2">
              ESTUDIANTES EN EL GRUPO ({estudiantes.length})
            </div>
            {cargandoEst ? (
              <div className="text-center py-4 text-gray-400 text-sm">Cargando...</div>
            ) : estudiantes.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                Sin estudiantes. Agrégalos abajo.
              </div>
            ) : (
              <div className="tw mb-3">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Código</th>
                      <th>Sede de inscripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantes.map((e: any) => {
                      const est = e.estudiante as any
                      return (
                        <tr key={e.id}>
                          <td className="font-semibold text-sm">
                            {est?.primer_nombre} {est?.primer_apellido}
                          </td>
                          <td className="text-xs font-mono text-gray-500">
                            {est?.codigo_estudiante}
                          </td>
                          <td className="text-xs text-gray-500">
                            {(e.inscripcion as any)?.sede?.nombre ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Agregar estudiantes */}
          <div>
            <div className="text-xs font-bold text-gray-500 mb-2">
              AGREGAR ESTUDIANTES DE LA ETAPA {(grupo.etapa as any)?.nombre}
            </div>
            <input
              className="inp mb-2"
              placeholder="🔍 Buscar estudiante..."
              value={buscadorEst}
              onChange={e => setBuscadorEst(e.target.value)}
            />
            {cargandoInsc ? (
              <div className="text-center py-3 text-gray-400 text-sm">Cargando...</div>
            ) : filtradosParaAgregar.length === 0 ? (
              <div className="text-center py-3 text-gray-400 text-sm">
                {buscadorEst ? 'Sin resultados' : 'Todos los estudiantes de esta etapa ya están en el grupo'}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {filtradosParaAgregar.map((i: any) => {
                  const e = i.estudiante as any
                  return (
                    <div key={i.id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                      <div>
                        <div className="text-sm font-semibold">{e?.primer_nombre} {e?.primer_apellido}</div>
                        <div className="text-xs text-gray-400">
                          {e?.codigo_estudiante} · {(i.sede as any)?.nombre ?? (i.sede as any)?.nombre ?? '—'}
                        </div>
                      </div>
                      <button
                        className="btn btn-p btn-sm"
                        onClick={() => agregarEstudiante(i.id)}
                        disabled={agregando === i.id}
                      >
                        {agregando === i.id ? '...' : '＋'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
