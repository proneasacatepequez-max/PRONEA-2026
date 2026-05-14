'use client'
// src/app/dashboard/admin/establecimiento/page.tsx
// FIX: Botón guardar en la misma fila que los tabs
// FIX: Instrucciones para subir imágenes (logos y slider)
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

        {/* TABS + BOTÓN GUARDAR EN LA MISMA FILA */}
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
            <div className="card-title">Logos institucionales</div>

            {/* Instrucciones para subir */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <div className="text-sm font-bold text-blue-800 mb-2">📤 ¿Cómo subir logos?</div>
              <div className="text-xs text-blue-700 space-y-1.5">
                <div><b>Opción 1 — Google Drive:</b> Sube la imagen a Google Drive → clic derecho → "Obtener enlace" → cambia el permiso a "Cualquiera con el enlace puede ver" → copia el ID del enlace y forma la URL: <code className="bg-blue-100 px-1 rounded">https://drive.google.com/uc?id=ID_DE_LA_IMAGEN</code></div>
                <div><b>Opción 2 — Supabase Storage:</b> Supabase → Storage → bucket "logos" → Upload → copia la URL pública</div>
                <div><b>Opción 3 — ImgBB (gratuito):</b> Ve a <code className="bg-blue-100 px-1 rounded">imgbb.com</code> → sube la imagen → copia el "Direct link"</div>
              </div>
            </div>

            <div className="space-y-4">
              {[
                { k: 'logo_url',              label: 'Logo PRONEA principal',    desc: 'Aparece en login y encabezados' },
                { k: 'logo_mineduc_url',       label: 'Logo MINEDUC',             desc: 'Para documentos oficiales' },
                { k: 'logo_digeex_url',        label: 'Logo DIGEEX',              desc: 'Para documentos oficiales' },
                { k: 'logo_establecimiento_url', label: 'Logo del Establecimiento', desc: 'Logo local del establecimiento' },
              ].map(({ k, label, desc }) => (
                <div key={k} className="flex items-start gap-4 p-3 border border-gray-100 rounded-xl">
                  <div className="w-16 h-14 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {info[k]
                      ? <img src={info[k]} alt={label} className="w-full h-full object-contain p-1" onError={e => (e.currentTarget.style.display = 'none')} />
                      : <span className="text-gray-300 text-3xl">🖼️</span>}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-700 mb-0.5">{label}</div>
                    <div className="text-xs text-gray-400 mb-2">{desc}</div>
                    <input className="inp text-xs" value={info[k] ?? ''} onChange={F(k)} placeholder="https://..." />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: SLIDER */}
        {tab === 'slider' && (
          <div className="card">
            <div className="card-title">Imágenes del slider (pantalla de login)</div>

            {/* Instrucciones */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
              <div className="text-sm font-bold text-blue-800 mb-2">📤 ¿Cómo agregar imágenes al slider?</div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>1. Sube tu imagen a <b>Google Drive</b>, <b>Supabase Storage</b> o <b>imgbb.com</b></div>
                <div>2. Obtén la URL pública directa de la imagen (debe terminar en .jpg, .png o ser un enlace directo)</div>
                <div>3. Pega la URL en el campo de abajo y haz clic en "Agregar imagen"</div>
                <div>4. Recomendado: imágenes horizontales de 1200×600px o más</div>
                <div><b>Google Drive:</b> <code className="bg-blue-100 px-1 rounded">https://drive.google.com/uc?id=TU_ID</code></div>
              </div>
            </div>

            {/* Imágenes actuales */}
            {slider.length > 0 && (
              <div className="space-y-2 mb-5">
                <div className="text-sm font-bold text-gray-600 mb-2">Imágenes actuales:</div>
                {slider.map((img: any) => (
                  <div key={img.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                    <img src={img.url_imagen} alt={img.titulo ?? ''} className="w-20 h-12 object-cover rounded border border-gray-200"
                      onError={e => { (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="48"><rect width="80" height="48" fill="%23f3f4f6"/><text x="40" y="28" text-anchor="middle" font-size="10" fill="%23999">Error</text></svg>' }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-700">{img.titulo ?? 'Sin título'}</div>
                      <div className="text-xs text-gray-400 truncate">{img.url_imagen}</div>
                    </div>
                    <span className={`badge ${img.activo ? 'badge-green' : 'badge-gray'}`}>{img.activo ? 'Activo' : 'Inactivo'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Agregar nueva */}
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4">
              <div className="text-sm font-bold text-gray-600 mb-3">➕ Agregar nueva imagen</div>
              <div className="fg"><label className="lbl">URL de la imagen *</label>
                <input className="inp" value={nuevaImg.url_imagen} onChange={e => setNuevaImg(n => ({ ...n, url_imagen: e.target.value }))} placeholder="https://drive.google.com/uc?id=..." /></div>
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
