'use client'
// src/app/dashboard/admin/ajustes/page.tsx
// FIX: Gestión completa de tipos de ajuste por discapacidad
import { useState, useEffect } from 'react'

export default function AjustesAdminPage() {
  const [tipos,   setTipos]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [form, setForm] = useState({ nombre: '', descripcion: '' })

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/tipos-ajuste').then(r => r.json()).catch(() => [])
    setTipos(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const crear = async () => {
    if (!form.nombre.trim()) { flash('❌ Nombre requerido'); return }
    setSaving(true)
    const res = await fetch('/api/tipos-ajuste', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Tipo de ajuste creado' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); setForm({ nombre: '', descripcion: '' }); cargar() }
    setSaving(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">♿ Ajustes por Discapacidad</div>
          <div className="text-xs text-gray-400">Tipos de ajuste curricular para estudiantes con discapacidad</div>
        </div>
        <button className="btn btn-p" onClick={() => setModal(true)}>＋ Nuevo tipo de ajuste</button>
      </header>
      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="alert al-i mb-5">
          <div>
            <b>📋 ¿Cómo funcionan los ajustes curriculares?</b>
            <div className="text-xs mt-1 space-y-0.5">
              <div>• El técnico aplica ajustes individuales a cada estudiante con discapacidad al inscribirlo</div>
              <div>• Los ajustes modifican: número de tareas requeridas, puntaje máximo y porcentaje de exámenes</div>
              <div>• El sistema calcula el promedio respetando los ajustes aplicados</div>
              <div>• Ejemplos: "Omitir tareas de escritura", "Examen oral en lugar de escrito"</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="card">
            <div className="card-title">
              Tipos de ajuste registrados
              <span className="text-xs text-gray-400 font-normal">{tipos.length} tipo(s)</span>
            </div>
            {tipos.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <div className="text-4xl mb-3">♿</div>
                <div className="font-semibold">Sin tipos de ajuste</div>
                <div className="text-xs mt-2 max-w-xs mx-auto">
                  Crea los tipos de ajuste que aplican en tu programa educativo.
                  Ejemplos: Intelectual Leve, TEA, Visual, Auditiva, etc.
                </div>
                <button className="btn btn-p mt-4" onClick={() => setModal(true)}>＋ Crear el primero</button>
              </div>
            ) : (
              <div className="space-y-2">
                {tipos.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 px-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                    <div>
                      <div className="font-semibold text-gray-800">{t.nombre}</div>
                      {t.descripcion && <div className="text-xs text-gray-400 mt-0.5">{t.descripcion}</div>}
                    </div>
                    <span className={`badge ${t.activo ? 'badge-green' : 'badge-gray'}`}>
                      {t.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="mb max-w-md">
            <div className="mh">
              <h3 className="text-base font-extrabold">＋ Nuevo tipo de ajuste</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <div className="mbd space-y-3">
              <div className="fg">
                <label className="lbl">Nombre del ajuste *</label>
                <input className="inp" value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: Discapacidad Intelectual Leve, TEA, Visual..." />
              </div>
              <div className="fg">
                <label className="lbl">Descripción (opcional)</label>
                <textarea className="inp" rows={3} value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe qué implica este ajuste curricular..." />
              </div>
            </div>
            <div className="mf">
              <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={crear} disabled={saving}>
                {saving ? 'Creando...' : 'Crear tipo de ajuste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

