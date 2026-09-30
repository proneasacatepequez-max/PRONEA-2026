'use client'
// src/app/dashboard/admin/establecimiento/page.tsx
import { useState, useEffect } from 'react'

const TABS = [
  { id: 'info',   label: '📋 Información' },
  { id: 'logos',  label: '🖼️ Logos' },
  { id: 'slider', label: '🎬 Slider' },
]

export default function EstablecimientoPage() {
  const [tab,    setTab]    = useState('info')
  const [info,   setInfo]   = useState<any>({})
  const [slider, setSlider] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [nuevaImg, setNuevaImg] = useState({ url_imagen: '', titulo: '', orden: 0 })

  useEffect(() => {
    Promise.all([
      fetch('/api/establecimiento').then(r => r.json()).catch(() => ({})),
      fetch('/api/slider').then(r => r.json()).catch(() => []),
    ]).then(([e, s]) => { setInfo(e ?? {}); setSlider(Array.isArray(s) ? s : []) })
      .finally(() => setLoading(false))
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3500) }

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/establecimiento', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(info),
    })
    flash(res.ok ? '✅ Guardado correctamente' : '❌ Error al guardar')
    setSaving(false)
  }

  const addSlider = async () => {
    if (!nuevaImg.url_imagen) { flash('❌ La URL de la imagen es requerida'); return }
    const res = await fetch('/api/slider', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(nuevaImg),
    })
    if (res.ok) {
      flash('✅ Imagen agregada al slider')
      setNuevaImg({ url_imagen: '', titulo: '', orden: 0 })
      const updated = await fetch('/api/slider').then(r => r.json()).catch(() => [])
      setSlider(Array.isArray(updated) ? updated : [])
    } else flash('❌ Error al agregar imagen')
  }

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setInfo((i: any) => ({ ...i, [k]: e.target.value }))

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">🏛️ Establecimiento</div></header>
      <div className="pc flex justify-center py-20"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">🏛️ Configuración del Establecimiento</div>
      </header>

      <div className="pc max-w-4xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* TABS + BOTÓN GUARDAR */}
        <div className="flex items-center justify-between mb-5 gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl flex-1">
            {TABS.map(t => (
              <button key={t.id}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex-1 ${tab === t.id ? 'bg-white text-pronea shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>
          {tab === 'info' && (
            <button onClick={save} disabled={saving}
              className="btn btn-p px-6 py-2 flex-shrink-0">
              {saving
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                : '💾 Guardar cambios'}
            </button>
          )}
        </div>

        {/* TAB: INFORMACIÓN */}
        {tab === 'info' && (
          <div className="card">
            <div className="card-title">Datos del establecimiento</div>
            <div className="fg2">
              <div className="fg"><label className="lbl">Nombre completo</label>
                <input className="inp" value={info.nombre_completo ?? ''} onChange={F('nombre_completo')} placeholder="Programa Nacional de Educación Alternativa..." /></div>
              <div className="fg"><label className="lbl">Nombre corto</label>
                <input className="inp" value={info.nombre_corto ?? ''} onChange={F('nombre_corto')} placeholder="PRONEA" /></div>
              <div className="fg"><label className="lbl">Director(a)</label>
                <input className="inp" value={info.director_nombre ?? ''} onChange={F('director_nombre')} placeholder="Nombre del director" /></div>
              <div className="fg"><label className="lbl">Título del director</label>
                <input className="inp" value={info.director_titulo ?? ''} onChange={F('director_titulo')} placeholder="Director Departamental" /></div>
              <div className="fg"><label className="lbl">Teléfono</label>
                <input className="inp" value={info.telefono ?? ''} onChange={F('telefono')} placeholder="2222-3333" /></div>
              <div className="fg"><label className="lbl">WhatsApp</label>
                <input className="inp" value={info.whatsapp ?? ''} onChange={F('whatsapp')} placeholder="5555-1234" /></div>
              <div className="fg"><label className="lbl">Correo institucional</label>
                <input type="email" className="inp" value={info.correo ?? ''} onChange={F('correo')} /></div>
              <div className="fg"><label className="lbl">Facebook</label>
                <input className="inp" value={info.facebook ?? ''} onChange={F('facebook')} /></div>
              <div className="fg"><label className="lbl">Departamento</label>
                <input className="inp" value={info.departamento ?? ''} onChange={F('departamento')} placeholder="Sacatepéquez" /></div>
              <div className="fg"><label className="lbl">Municipio</label>
                <input className="inp" value={info.municipio ?? ''} onChange={F('municipio')} /></div>
            </div>
            <div className="fg"><label className="lbl">Dirección</label>
              <textarea className="inp" rows={2} value={info.direccion ?? ''} onChange={F('direccion')} /></div>
            <div className="fg"><label className="lbl">Horario de atención</label>
              <textarea className="inp" rows={2} value={info.horario_atencion ?? ''} onChange={F('horario_atencion')} placeholder="Lunes a Viernes 8:00–16:00 / Sábados 8:00–12:00" /></div>
          </div>
        )}

        {/* TAB: LOGOS */}
        {tab === 'logos' && <LogosTab flash={flash} />}

        {/* TAB: SLIDER */}
        {tab === 'slider' && (
          <div className="card">
            <div className="card-title">Imágenes del slider (pantalla de login)</div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <div className="text-sm font-bold text-blue-800 mb-2">📤 ¿Cómo agregar imágenes al slider?</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>1. Sube tu imagen a <b>public/images/</b> en GitHub</div>
                <div>2. Escribe la ruta de la imagen (por ejemplo /images/slider-1.jpg)</div>
                <div>3. Pega la URL en el campo de abajo y haz clic en "Agregar imagen"</div>
                <div>4. Recomendado: imágenes horizontales de 1200×600px o más</div>
              </div>
            </div>

            {slider.length > 0 && (
              <div className="space-y-2 mb-5">
                <div className="text-sm font-bold text-gray-600 mb-2">Imágenes actuales:</div>
                {slider.map((img: any) => (
                  <div key={img.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <img src={img.url_imagen} alt={img.titulo ?? ''} className="w-20 h-12 object-cover rounded border border-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700">{img.titulo ?? 'Sin título'}</div>
                      <div className="text-xs text-gray-400 truncate">{img.url_imagen}</div>
                    </div>
                    <span className={`badge ${img.activo ? 'badge-green' : 'badge-gray'}`}>{img.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
              <div className="text-sm font-bold text-gray-600 mb-3">➕ Agregar nueva imagen</div>
              <div className="fg"><label className="lbl">URL de la imagen *</label>
                <input className="inp" value={nuevaImg.url_imagen} onChange={e => setNuevaImg(n => ({ ...n, url_imagen: e.target.value }))} placeholder="/images/slider-1.jpg" /></div>
              <div className="fg2 mt-2">
                <div className="fg"><label className="lbl">Título (opcional)</label>
                  <input className="inp" value={nuevaImg.titulo} onChange={e => setNuevaImg(n => ({ ...n, titulo: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Orden</label>
                  <input type="number" className="inp" value={nuevaImg.orden} onChange={e => setNuevaImg(n => ({ ...n, orden: parseInt(e.target.value) || 0 }))} /></div>
              </div>
              <button className="btn btn-p mt-2" onClick={addSlider}>➕ Agregar imagen al slider</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────
// Pestaña LOGOS: catálogo de logos + qué logos lleva cada documento
// ─────────────────────────────────────────────────────────────────────
type PosLogo = 'izquierda' | 'centro' | 'derecha'

function VistaEncabezado({ items }: { items: { nombre: string; url: string; posicion: PosLogo }[] }) {
  const zona = (p: PosLogo) => items.filter(i => i.posicion === p)
  const img = (i: { nombre: string; url: string }) => (
    <img key={i.url + i.nombre} src={i.url} alt={i.nombre} style={{ height: 44, maxWidth: 130, objectFit: 'contain' }}
      onError={e => (e.currentTarget.style.opacity = '0.2')} />
  )
  const cen = zona('centro')
  return (
    <div className="border border-gray-200 rounded-xl bg-white p-3" style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 64 }}>
      {items.length === 0 && <div className="text-xs text-gray-400 mx-auto">Sin logos — el documento saldrá sin encabezado de logos</div>}
      {items.length > 0 && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 0', justifyContent: 'flex-start' }}>{zona('izquierda').map(img)}</div>
          {cen.length > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>{cen.map(img)}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 0', justifyContent: 'flex-end' }}>{zona('derecha').map(img)}</div>
        </>
      )}
    </div>
  )
}

function LogosTab({ flash }: { flash: (m: string) => void }) {
  const [cargando, setCargando] = useState(true)
  const [listo, setListo]       = useState(true)
  const [logos, setLogos]       = useState<any[]>([])
  const [tipos, setTipos]       = useState<any[]>([])
  // asig[tipo][logo_id] = posición (si no existe la clave, el logo NO se usa en ese documento)
  const [asig, setAsig]         = useState<Record<string, Record<number, PosLogo>>>({})
  const [sucio, setSucio]       = useState<Record<string, boolean>>({})
  const [nuevo, setNuevo]       = useState({ nombre: '', url: '' })
  const [busy, setBusy]         = useState('')

  const post = async (body: any) => {
    const res  = await fetch('/api/logos-documentos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const txt = await res.text()
    let data: any = {}
    try { data = JSON.parse(txt) } catch { /* respuesta no JSON */ }
    return { ok: res.ok, data }
  }

  const cargar = async () => {
    try {
      const res  = await fetch('/api/logos-documentos')
      const data = await res.json()
      if (!res.ok) { flash('❌ ' + (data?.error ?? 'Error al cargar logos')); return }
      setListo(data.tablasListas !== false)
      setLogos(data.logos ?? [])
      setTipos(data.tipos ?? [])
      const m: Record<string, Record<number, PosLogo>> = {}
      for (const t of (data.tipos ?? [])) m[t.v] = {}
      for (const a of (data.asignaciones ?? [])) {
        if (!m[a.tipo_documento]) m[a.tipo_documento] = {}
        m[a.tipo_documento][a.logo_id] = a.posicion
      }
      setAsig(m)
      setSucio({})
    } catch { flash('❌ Error de conexión al cargar logos') }
    finally { setCargando(false) }
  }

  useEffect(() => { cargar() }, [])

  const setLogoCampo = (id: number, k: 'nombre' | 'url', v: string) =>
    setLogos(ls => ls.map(l => l.id === id ? { ...l, [k]: v } : l))

  const guardarLogo = async (l: any) => {
    setBusy('logo' + l.id)
    const r = await post({ accion: 'editar_logo', id: l.id, nombre: l.nombre, url: l.url })
    flash(r.ok ? '✅ Logo actualizado' : '❌ ' + (r.data?.error ?? 'Error al guardar'))
    setBusy('')
  }

  const alternarActivo = async (l: any) => {
    setBusy('logo' + l.id)
    const r = await post({ accion: 'editar_logo', id: l.id, activo: !l.activo })
    if (r.ok) setLogos(ls => ls.map(x => x.id === l.id ? { ...x, activo: !l.activo } : x))
    else flash('❌ ' + (r.data?.error ?? 'Error'))
    setBusy('')
  }

  const eliminarLogo = async (l: any) => {
    if (!confirm(`¿Eliminar el logo "${l.nombre}"? También se quitará de todos los documentos.`)) return
    setBusy('logo' + l.id)
    const r = await post({ accion: 'eliminar_logo', id: l.id })
    if (r.ok) { flash('✅ Logo eliminado'); await cargar() }
    else flash('❌ ' + (r.data?.error ?? 'Error al eliminar'))
    setBusy('')
  }

  const crearLogo = async () => {
    if (!nuevo.nombre.trim() || !nuevo.url.trim()) { flash('❌ Nombre y ruta son requeridos'); return }
    setBusy('nuevo')
    const r = await post({ accion: 'crear_logo', nombre: nuevo.nombre, url: nuevo.url })
    if (r.ok) { flash('✅ Logo agregado al catálogo'); setNuevo({ nombre: '', url: '' }); await cargar() }
    else flash('❌ ' + (r.data?.error ?? 'Error al crear'))
    setBusy('')
  }

  const usarEn = (tipo: string, id: number, usar: boolean) => {
    setAsig(a => {
      const t = { ...(a[tipo] ?? {}) }
      if (usar) t[id] = t[id] ?? 'izquierda'; else delete t[id]
      return { ...a, [tipo]: t }
    })
    setSucio(s => ({ ...s, [tipo]: true }))
  }

  const posEn = (tipo: string, id: number, pos: PosLogo) => {
    setAsig(a => ({ ...a, [tipo]: { ...(a[tipo] ?? {}), [id]: pos } }))
    setSucio(s => ({ ...s, [tipo]: true }))
  }

  const guardarTipo = async (tipo: string) => {
    setBusy('tipo' + tipo)
    // el orden de guardado sigue el orden del catálogo
    const items = logos
      .filter(l => asig[tipo]?.[l.id])
      .map(l => ({ logo_id: l.id, posicion: asig[tipo][l.id] }))
    const r = await post({ accion: 'guardar_asignacion', tipo, items })
    if (r.ok) { flash('✅ Logos del documento guardados'); setSucio(s => ({ ...s, [tipo]: false })) }
    else flash('❌ ' + (r.data?.error ?? 'Error al guardar'))
    setBusy('')
  }

  if (cargando) return <div className="card"><div className="text-sm text-gray-400">Cargando logos…</div></div>

  if (!listo) return (
    <div className="card">
      <div className="card-title">Logos de los documentos</div>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        ⚠️ Falta crear las tablas de logos. Ejecuta <code className="bg-amber-100 px-1 rounded">sql_logos_documentos.sql</code> en
        Supabase → SQL Editor y recarga esta página.
      </div>
    </div>
  )

  const POS: { v: PosLogo; label: string }[] = [
    { v: 'izquierda', label: '⬅️ Izquierda' },
    { v: 'centro',    label: '⏺️ Centro' },
    { v: 'derecha',   label: 'Derecha ➡️' },
  ]

  return (
    <div className="space-y-5">
      {/* ── 1) CATÁLOGO ─────────────────────────────────────────── */}
      <div className="card">
        <div className="card-title">1. Catálogo de logos</div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 text-xs text-blue-700 space-y-1">
          <div>• Aquí están todos los logos disponibles. Más abajo eliges <b>cuáles lleva cada documento</b> y <b>en qué posición</b>.</div>
          <div>• Para agregar uno nuevo: súbelo a <code className="bg-blue-100 px-1 rounded">public/images/</code> en GitHub y escribe su ruta (ej. <code className="bg-blue-100 px-1 rounded">/images/logo-digeex.png</code>).</div>
          <div>• No uses enlaces de Google Drive: no cargan como imagen.</div>
        </div>

        <div className="space-y-2">
          {logos.map(l => (
            <div key={l.id} className={`flex items-center gap-3 p-3 border rounded-xl ${l.activo ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <div className="w-28 h-14 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={l.url} alt={l.nombre} className="w-full h-full object-contain p-1"
                  onError={e => (e.currentTarget.style.opacity = '0.15')} />
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 min-w-0">
                <input className="inp text-sm" value={l.nombre} onChange={e => setLogoCampo(l.id, 'nombre', e.target.value)} placeholder="Nombre" />
                <input className="inp text-xs" value={l.url} onChange={e => setLogoCampo(l.id, 'url', e.target.value)} placeholder="/images/logo.png" />
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button className="btn btn-p px-3 py-1 text-xs" disabled={busy === 'logo' + l.id} onClick={() => guardarLogo(l)} title="Guardar nombre y ruta">💾</button>
                <button className="btn px-3 py-1 text-xs" disabled={busy === 'logo' + l.id} onClick={() => alternarActivo(l)}
                  title={l.activo ? 'Desactivar (no se imprimirá)' : 'Activar'}>{l.activo ? '👁️' : '🚫'}</button>
                <button className="btn px-3 py-1 text-xs" disabled={busy === 'logo' + l.id} onClick={() => eliminarLogo(l)} title="Eliminar">🗑️</button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 mt-4">
          <div className="text-sm font-bold text-gray-600 mb-3">➕ Agregar logo al catálogo</div>
          <div className="fg2">
            <div className="fg"><label className="lbl">Nombre *</label>
              <input className="inp" value={nuevo.nombre} onChange={e => setNuevo(n => ({ ...n, nombre: e.target.value }))} placeholder="DIGEEX" /></div>
            <div className="fg"><label className="lbl">Ruta de la imagen *</label>
              <input className="inp" value={nuevo.url} onChange={e => setNuevo(n => ({ ...n, url: e.target.value }))} placeholder="/images/logo-digeex.png" /></div>
          </div>
          <button className="btn btn-p mt-2" disabled={busy === 'nuevo'} onClick={crearLogo}>➕ Agregar logo</button>
        </div>
      </div>

      {/* ── 2) ASIGNACIÓN POR DOCUMENTO ─────────────────────────── */}
      {tipos.map(t => {
        const sel = asig[t.v] ?? {}
        const vista = logos
          .filter(l => l.activo && sel[l.id])
          .map(l => ({ nombre: l.nombre, url: l.url, posicion: sel[l.id] }))
        return (
          <div key={t.v} className="card">
            <div className="flex items-center justify-between mb-3 gap-3">
              <div className="card-title" style={{ marginBottom: 0 }}>{t.icono} {t.label}</div>
              <button className="btn btn-p px-4 py-1.5 text-sm" disabled={!sucio[t.v] || busy === 'tipo' + t.v} onClick={() => guardarTipo(t.v)}>
                {busy === 'tipo' + t.v ? 'Guardando…' : sucio[t.v] ? '💾 Guardar este documento' : '✓ Guardado'}
              </button>
            </div>

            <div className="text-xs text-gray-400 mb-2">Marca los logos que lleva este documento y elige la posición de cada uno.</div>

            <div className="space-y-2">
              {logos.map(l => {
                const usado = !!sel[l.id]
                return (
                  <div key={l.id} className={`flex items-center gap-3 p-2.5 border rounded-lg ${usado ? 'border-blue-200 bg-blue-50/40' : 'border-gray-100'} ${l.activo ? '' : 'opacity-50'}`}>
                    <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                      <input type="checkbox" checked={usado} onChange={e => usarEn(t.v, l.id, e.target.checked)} />
                      <img src={l.url} alt={l.nombre} style={{ height: 28, maxWidth: 70, objectFit: 'contain' }}
                        onError={e => (e.currentTarget.style.opacity = '0.15')} />
                      <span className="text-sm font-semibold text-gray-700 truncate">{l.nombre}{!l.activo && ' (desactivado)'}</span>
                    </label>
                    <div className="flex gap-1 bg-gray-100 p-1 rounded-lg flex-shrink-0">
                      {POS.map(p => (
                        <button key={p.v} type="button" disabled={!usado}
                          onClick={() => posEn(t.v, l.id, p.v)}
                          className={`px-2 py-1 rounded-md text-xs font-bold transition-all disabled:opacity-40 ${usado && sel[l.id] === p.v ? 'bg-white text-pronea shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3">
              <div className="text-xs font-bold text-gray-500 mb-1.5">Vista previa del encabezado</div>
              <VistaEncabezado items={vista} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
