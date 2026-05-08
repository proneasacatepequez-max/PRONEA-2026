'use client'
// src/app/dashboard/tecnico/recursos/page.tsx
import { useState, useEffect } from 'react'

const TIPO_ICON: Record<string, string> = {
  video: '🎬', pdf: '📄', link: '🔗', imagen: '🖼️', audio: '🎧'
}

export default function RecursosTecnicoPage() {
  const [recursos, setRecursos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [form, setForm] = useState({
    titulo: '', url: '', descripcion: '',
    tipo_contenido: 'link', es_publico: false, destacado: false,
  })

  useEffect(() => {
    fetch('/api/recursos').then(r => r.json())
      .then(d => setRecursos(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false))
  }, [])

  const crear = async () => {
    if (!form.titulo || !form.url) { setMsg('❌ Título y URL requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/recursos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    setMsg(res.ok ? '✅ Recurso creado' : '❌ ' + d.error)
    setTimeout(() => setMsg(''), 3000)
    if (res.ok) {
      setModal(false)
      const updated = await fetch('/api/recursos').then(r => r.json()).catch(() => [])
      setRecursos(Array.isArray(updated) ? updated : [])
    }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎬 Recursos de Apoyo</div>
          <div className="text-xs text-gray-400">Materiales educativos para tus estudiantes</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nuevo recurso</button>
      </header>
      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recursos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🎬</div>
            <div className="font-semibold">Sin recursos registrados</div>
            <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Agregar el primero</button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recursos.map((r: any) => (
              <a key={r.id} href={r.url} target="_blank" rel="noreferrer"
                className="card hover:border-pronea-secondary hover:shadow-md transition-all cursor-pointer block">
                <div className="flex items-start gap-3">
                  <span className="text-3xl flex-shrink-0">{TIPO_ICON[r.tipo_contenido] ?? '📎'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm">{r.titulo}</div>
                    {r.descripcion && <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{r.descripcion}</div>}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="badge badge-blue text-xs">{r.tipo_contenido}</span>
                      {r.es_publico && <span className="badge badge-green text-xs">Público</span>}
                      {r.destacado  && <span className="badge badge-yellow text-xs">⭐ Destacado</span>}
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-lg">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo recurso</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Título *</label>
                <input className="inp" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="lbl">URL *</label>
                <input type="url" className="inp" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </div>
              <div className="fg2">
                <div className="fg">
                  <label className="lbl">Tipo</label>
                  <select className="inp" value={form.tipo_contenido} onChange={e => setForm(f => ({ ...f, tipo_contenido: e.target.value }))}>
                    <option value="link">🔗 Enlace</option>
                    <option value="video">🎬 Video</option>
                    <option value="pdf">📄 PDF</option>
                    <option value="imagen">🖼️ Imagen</option>
                    <option value="audio">🎧 Audio</option>
                  </select>
                </div>
                <div className="fg flex flex-col gap-2 pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600">
                    <input type="checkbox" checked={form.es_publico} onChange={e => setForm(f => ({ ...f, es_publico: e.target.checked }))} className="w-4 h-4" />
                    Visible para estudiantes
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-600">
                    <input type="checkbox" checked={form.destacado} onChange={e => setForm(f => ({ ...f, destacado: e.target.checked }))} className="w-4 h-4" />
                    Marcar como destacado
                  </label>
                </div>
              </div>
              <div className="fg">
                <label className="lbl">Descripción (opcional)</label>
                <textarea className="inp" rows={2} value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>
                {saving ? 'Guardando...' : 'Crear recurso'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
