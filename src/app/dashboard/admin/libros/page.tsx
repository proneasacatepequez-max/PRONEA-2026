'use client'
// src/app/dashboard/admin/libros/page.tsx
// FIX: Gestión completa de libros con áreas y tareas
import { useState, useEffect } from 'react'

export default function LibrosPage() {
  const [libros,  setLibros]  = useState<any[]>([])
  const [etapas,  setEtapas]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [form, setForm] = useState({
    etapa_id: '', nombre: '', numero: '1', version: 'nuevo', total_tareas: '20',
  })

  const cargar = async () => {
    setLoading(true)
    const [l, e] = await Promise.all([
      fetch('/api/libros').then(r => r.json()).catch(() => []),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
    ])
    setLibros(Array.isArray(l) ? l : [])
    setEtapas(Array.isArray(e) ? e : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const crear = async () => {
    if (!form.etapa_id || !form.nombre) { flash('❌ Etapa y nombre requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/libros', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, etapa_id: parseInt(form.etapa_id), numero: parseInt(form.numero), total_tareas: parseInt(form.total_tareas) }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Libro creado correctamente' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); cargar(); setForm({ etapa_id:'', nombre:'', numero:'1', version:'nuevo', total_tareas:'20' }) }
    setSaving(false)
  }

  const filtrados = libros.filter(l => !filtroEtapa || l.etapa_id === parseInt(filtroEtapa))

  // Agrupar por etapa para mejor visualización
  const porEtapa: Record<string, any[]> = {}
  filtrados.forEach(l => {
    const etapa = l.etapa?.nombre ?? 'Sin etapa'
    if (!porEtapa[etapa]) porEtapa[etapa] = []
    porEtapa[etapa].push(l)
  })

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">📚 Libros de Trabajo</div>
          <div className="text-xs text-gray-400">Configura los libros por etapa y versión</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nuevo libro</button>
      </header>
      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-5">
          <div>
            <b>📋 Estructura de libros PRONEA:</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>• Cada etapa tiene <b>Libro 1</b> y <b>Libro 2</b></div>
              <div>• Cada libro tiene <b>versión</b>: Nuevo (libro actualizado) o Viejo (libro anterior)</div>
              <div>• El técnico selecciona la versión al inscribir al estudiante</div>
              <div>• Los libros contienen las tareas que se califican de 0 a 5 puntos</div>
            </div>
          </div>
        </div>

        {/* Filtro */}
        <div className="flex gap-3 mb-4 items-end">
          <div className="w-52">
            <label className="lbl">Filtrar por etapa</label>
            <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
              <option value="">Todas las etapas</option>
              {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </div>
          <button className="btn btn-g" onClick={() => setFiltroEtapa('')}>Limpiar</button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <div className="font-semibold">Sin libros configurados</div>
            <div className="text-sm mt-1">Crea los libros para cada etapa</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Crear primer libro</button>
          </div>
        ) : (
          Object.entries(porEtapa).map(([etapa, libs]) => (
            <div key={etapa} className="card mb-4">
              <div className="card-title">📖 {etapa}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {libs.map(l => (
                  <div key={l.id} className={`rounded-xl p-4 border-2 ${l.version === 'nuevo' ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-lg">{l.version === 'nuevo' ? '📗' : '📙'}</span>
                      <span className={`badge text-xs ${l.activo ? 'badge-green' : 'badge-gray'}`}>{l.activo ? 'Activo' : 'Inactivo'}</span>
                    </div>
                    <div className={`font-bold text-sm ${l.version === 'nuevo' ? 'text-blue-800' : 'text-orange-800'}`}>
                      Libro {l.numero}
                    </div>
                    <div className={`text-xs mt-0.5 ${l.version === 'nuevo' ? 'text-blue-600' : 'text-orange-600'}`}>
                      {l.version === 'nuevo' ? 'Versión nueva' : 'Versión vieja'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{l.total_tareas} tareas</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo libro</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Etapa *</label>
                <select className="inp" value={form.etapa_id} onChange={e => setForm(f => ({ ...f, etapa_id: e.target.value }))}>
                  <option value="">— Seleccionar etapa —</option>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Nombre del libro *</label>
                <input className="inp" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Libro de Trabajo Primaria..." />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Número</label>
                  <select className="inp" value={form.numero} onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}>
                    <option value="1">Libro 1 (primer semestre)</option>
                    <option value="2">Libro 2 (segundo semestre)</option>
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Versión</label>
                  <select className="inp" value={form.version} onChange={e => setForm(f => ({ ...f, version: e.target.value }))}>
                    <option value="nuevo">📗 Nuevo (actualizado)</option>
                    <option value="viejo">📙 Viejo (anterior)</option>
                  </select>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Total de tareas</label>
                <input type="number" className="inp" value={form.total_tareas} onChange={e => setForm(f => ({ ...f, total_tareas: e.target.value }))} />
                <p className="text-xs text-gray-400 mt-1">Número de tareas que se califican del 0 al 5</p>
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>{saving ? 'Creando...' : 'Crear libro'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
