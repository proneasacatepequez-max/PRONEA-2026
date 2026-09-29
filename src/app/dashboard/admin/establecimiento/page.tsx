'use client'
// src/app/dashboard/admin/establecimiento/page.tsx
import { useState, useEffect } from 'react'

const TABS = [
  { id: 'info',   label: '📋 Información' },
  { id: 'logos',  label: '🖼️ Logos' },
  { id: 'slider', label: '🎬 Slider' },
]

const POSICIONES = [
  { v: 'izquierda', label: '⬅️ Izquierda' },
  { v: 'centro',    label: '⏺️ Centro' },
  { v: 'derecha',   label: 'Derecha ➡️' },
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

  const posMineduc = info.constancia_logo_mineduc_pos ?? 'izquierda'
  const logoSrc = info.logo_mineduc_url?.trim() || '/images/logo-mineduc.png'

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
          <button onClick={save} disabled={saving}
            className="btn btn-p px-6 py-2 flex-shrink-0">
            {saving
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
              : '💾 Guardar cambios'}
          </button>
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
        {tab === 'logos' && (
          <div className="card">
            <div className="card-title">Logos de los documentos</div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <div className="text-sm font-bold text-blue-800 mb-2">ℹ️ Cómo funcionan los logos</div>
              <div className="text-xs text-blue-700 space-y-1.5">
                <div>• <b>Constancias de inscripción:</b> se muestra el logo del <b>MINEDUC</b>. Aquí eliges su posición.</div>
                <div>• <b>Boletas, escalas y otros documentos:</b> se muestra el logo de <b>PRONEA</b> (fijo a la izquierda).</div>
                <div>• Los archivos viven en <code className="bg-blue-100 px-1 rounded">public/images/</code>: <code className="bg-blue-100 px-1 rounded">logo-mineduc.png</code> y <code className="bg-blue-100 px-1 rounded">logo-pronea.png</code>.</div>
                <div>• No uses enlaces de Google Drive: no cargan como imagen.</div>
              </div>
            </div>

            <div className="p-4 border border-gray-100 rounded-xl">
              <div className="text-sm font-bold text-gray-700 mb-1">Logo MINEDUC — constancias de inscripción</div>
              <div className="text-xs text-gray-400 mb-3">Elige dónde aparece el logo en las constancias.</div>

              <div className="flex items-start gap-4">
                <div className="w-32 h-16 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                  <img src={logoSrc} alt="MINEDUC" className="w-full h-full object-contain p-1"
                    onError={e => (e.currentTarget.style.display = 'none')} />
                </div>
                <div className="flex-1">
                  <label className="lbl">Ruta del logo (opcional)</label>
                  <input className="inp text-xs" value={info.logo_mineduc_url ?? ''} onChange={F('logo_mineduc_url')}
                    placeholder="/images/logo-mineduc.png (por defecto)" />
                  <div className="text-xs text-gray-400 mt-1">Si lo dejas vacío se usa <code>/images/logo-mineduc.png</code></div>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs font-bold text-gray-500 mb-1.5">Posición en la constancia</div>
                <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                  {POSICIONES.map(p => (
                    <button key={p.v} type="button"
                      onClick={() => setInfo((i: any) => ({ ...i, constancia_logo_mineduc_pos: p.v }))}
                      className={`flex-1 px-2 py-1.5 rounded-md text-xs font-bold transition-all ${posMineduc === p.v ? 'bg-white text-pronea shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vista previa */}
              <div className="mt-4">
                <div className="text-xs font-bold text-gray-500 mb-1.5">Vista previa del encabezado</div>
                <div className="border border-gray-200 rounded-xl bg-white p-4"
                  style={{
                    display: 'flex',
                    justifyContent: posMineduc === 'centro' ? 'center' : posMineduc === 'derecha' ? 'flex-end' : 'flex-start',
                    alignItems: 'center',
                    minHeight: 80,
                  }}>
                  <img src={logoSrc} alt="MINEDUC" style={{ height: 56, maxWidth: 180, objectFit: 'contain' }} />
                </div>
                <div className="text-xs text-gray-400 mt-1.5">Recuerda pulsar «Guardar cambios» para aplicar.</div>
              </div>
            </div>
          </div>
        )}

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
