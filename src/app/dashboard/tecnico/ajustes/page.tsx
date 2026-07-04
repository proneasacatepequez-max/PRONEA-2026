'use client'
// src/app/dashboard/tecnico/ajustes/page.tsx
// Adecuaciones curriculares para estudiantes con discapacidad
import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function AjustesContent() {
  const sp     = useSearchParams()
  const inscId = sp.get('id') ?? ''
  const [insc,        setInsc]      = useState<any>(null)
  const [ajustes,    setAjustes]    = useState<any[]>([])
  const [tiposAjuste, setTipos]    = useState<any[]>([])
  const [areas,       setAreas]    = useState<any[]>([])
  const [libros,      setLibros]   = useState<any[]>([])
  const [loading,     setLoading]  = useState(false)
  const [modal,       setModal]    = useState(false)
  const [saving,      setSaving]   = useState(false)
  const [msg,         setMsg]      = useState('')
  const [form, setForm] = useState({
    descripcion_ajuste: '',
    tipo_ajuste_id: '',
    area_id: '',
    libro_id: '',
    tareas_total_ajustado: '',
    puntos_max_ajustado: '',
    porcentaje_examen_ajustado: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const cargar = useCallback(async () => {
    if (!inscId) return
    setLoading(true)
    const [inscData, aj, ti, ar] = await Promise.all([
      fetch(`/api/inscripciones?id=${inscId}`).then(r => r.json()).catch(() => null),
      fetch(`/api/ajustes?inscripcion_id=${inscId}`).then(r => r.json()).catch(() => []),
      fetch('/api/tipos-ajuste').then(r => r.json()).catch(() => []),
      fetch('/api/areas').then(r => r.json()).catch(() => []),
    ])
    setInsc(inscData)
    setAjustes(Array.isArray(aj) ? aj : [])
    setTipos(Array.isArray(ti) ? ti : [])
    setAreas(Array.isArray(ar) ? ar : [])

    if (inscData?.etapa?.id) {
      const lib = await fetch(`/api/libros?etapa_id=${inscData.etapa.id}&version=${inscData.version_libro ?? 'nuevo'}`)
        .then(r => r.json()).catch(() => [])
      setLibros(Array.isArray(lib) ? lib : [])
    }
    setLoading(false)
  }, [inscId])

  useEffect(() => { cargar() }, [cargar])

  const guardar = async () => {
    if (!form.descripcion_ajuste) { flash('❌ Descripción del ajuste requerida'); return }
    setSaving(true)
    const res = await fetch('/api/ajustes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inscripcion_id:             inscId,
        descripcion_ajuste:         form.descripcion_ajuste,
        tipo_ajuste_id:             form.tipo_ajuste_id   ? parseInt(form.tipo_ajuste_id)  : null,
        area_id:                    form.area_id          ? parseInt(form.area_id)          : null,
        libro_id:                   form.libro_id         || null,
        tareas_total_ajustado:      form.tareas_total_ajustado      ? parseInt(form.tareas_total_ajustado)      : null,
        puntos_max_ajustado:        form.puntos_max_ajustado        ? parseFloat(form.puntos_max_ajustado)      : null,
        porcentaje_examen_ajustado: form.porcentaje_examen_ajustado ? parseFloat(form.porcentaje_examen_ajustado) : null,
      }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Ajuste registrado correctamente' : '❌ ' + d.error)
    if (res.ok) { setModal(false); cargar() }
    setSaving(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    const res = await fetch('/api/ajustes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, activo: !activo }),
    })
    flash(res.ok ? `✅ Ajuste ${activo ? 'desactivado' : 'activado'}` : '❌ Error')
    cargar()
  }

  if (!inscId) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">♿ Adecuaciones Curriculares</div></header>
      <div className="pc"><div className="alert al-w">Selecciona un estudiante desde <Link href="/dashboard/tecnico/estudiantes" className="underline">Mis Estudiantes</Link>.</div></div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">♿ Adecuaciones Curriculares</div>
          <div className="text-xs text-gray-400">
            {insc?.estudiante
              ? <>Estudiante: <b>{insc.estudiante.primer_nombre} {insc.estudiante.primer_apellido}</b> — {insc.etapa?.nombre}</>
              : 'Ajustes para el estudiante'}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-p" onClick={() => setModal(true)}>＋ Registrar ajuste</button>
          <Link href="/dashboard/tecnico/estudiantes" className="btn btn-g">← Volver</Link>
        </div>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-4">
          <div className="text-xs">
            <b>📋 ¿Qué son las adecuaciones?</b><br />
            Las adecuaciones curriculares modifican los parámetros de calificación para estudiantes con discapacidad.
            Pueden reducir el número de tareas requeridas, ajustar el puntaje máximo o el porcentaje de exámenes.
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : ajustes.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-3">♿</div>
            <div className="font-semibold">Sin adecuaciones registradas</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Registrar primera adecuación</button>
          </div>
        ) : (
          <div className="space-y-3">
            {ajustes.map((a: any) => (
              <div key={a.id} className={`card border-l-4 ${a.activo ? 'border-l-blue-400' : 'border-l-gray-200 opacity-60'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-800">{a.descripcion_ajuste}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(a.tipo_ajuste as any)?.nombre && (
                        <span className="badge badge-blue text-xs">{(a.tipo_ajuste as any).nombre}</span>
                      )}
                      {(a.area as any)?.nombre && (
                        <span className="badge badge-purple text-xs">Área: {(a.area as any).nombre}</span>
                      )}
                      {a.tareas_total_ajustado && (
                        <span className="badge badge-yellow text-xs">Tareas ajustadas: {a.tareas_total_ajustado}</span>
                      )}
                      {a.puntos_max_ajustado && (
                        <span className="badge badge-orange text-xs">Pts. máx: {a.puntos_max_ajustado}</span>
                      )}
                      {a.porcentaje_examen_ajustado && (
                        <span className="badge badge-green text-xs">Examen: {a.porcentaje_examen_ajustado}%</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(a.creado_en).toLocaleDateString('es-GT')}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <span className={`badge ${a.activo ? 'badge-green' : 'badge-gray'}`}>
                      {a.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      className={`btn btn-sm ${a.activo ? 'btn-d' : 'btn-s'}`}
                      onClick={() => toggleActivo(a.id, a.activo)}>
                      {a.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">♿ Registrar adecuación curricular</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Tipo de ajuste</label>
                <select className="inp" value={form.tipo_ajuste_id} onChange={e => setForm(f => ({ ...f, tipo_ajuste_id: e.target.value }))}>
                  <option value="">— Seleccionar tipo —</option>
                  {tiposAjuste.filter((t: any) => t.activo).map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Descripción del ajuste *</label>
                <textarea className="inp" rows={3} value={form.descripcion_ajuste}
                  onChange={e => setForm(f => ({ ...f, descripcion_ajuste: e.target.value }))}
                  placeholder="Describe detalladamente el ajuste curricular aplicado..." />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Área (opcional)</label>
                  <select className="inp" value={form.area_id} onChange={e => setForm(f => ({ ...f, area_id: e.target.value }))}>
                    <option value="">— Todas las áreas —</option>
                    {areas.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Libro (opcional)</label>
                  <select className="inp" value={form.libro_id} onChange={e => setForm(f => ({ ...f, libro_id: e.target.value }))}>
                    <option value="">— Todos los libros —</option>
                    {libros.map((l: any) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Tareas requeridas (ajustado)</label>
                  <input type="number" className="inp" value={form.tareas_total_ajustado}
                    onChange={e => setForm(f => ({ ...f, tareas_total_ajustado: e.target.value }))}
                    placeholder="Ej: 15" />
                  <p className="text-xs text-gray-400 mt-0.5">Si el libro tiene 20 tareas y se ajusta a 15</p>
                </div>
                <div className="fg">
                  <label className="lbl">Puntos máximos (ajustado)</label>
                  <input type="number" className="inp" value={form.puntos_max_ajustado}
                    onChange={e => setForm(f => ({ ...f, puntos_max_ajustado: e.target.value }))}
                    placeholder="Ej: 75" />
                </div>
              </div>
              <div className="fg">
                <label className="lbl">% examen ajustado</label>
                <input type="number" min={0} max={100} className="inp" value={form.porcentaje_examen_ajustado}
                  onChange={e => setForm(f => ({ ...f, porcentaje_examen_ajustado: e.target.value }))}
                  placeholder="Ej: 50 (si el examen vale 50% en lugar de 60%)" />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={guardar} disabled={saving}>
                {saving ? 'Guardando...' : 'Registrar adecuación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AjustesPage() {
  return (
    <Suspense fallback={<div className="ap"><header className="topbar"><div className="page-title">♿ Adecuaciones</div></header><div className="pc text-center py-12 text-gray-400">Cargando...</div></div>}>
      <AjustesContent />
    </Suspense>
  )
}
