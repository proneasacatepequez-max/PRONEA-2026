'use client'
// src/app/dashboard/estudiante/perfil/page.tsx
import { useState, useEffect } from 'react'

export default function PerfilEstudiantePage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [cambio, setCambio]   = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg, setMsg]         = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/mi-perfil').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  const cambiarPassword = async () => {
    if (!cambio.actual || !cambio.nueva) { setMsg('❌ Todos los campos son requeridos'); return }
    if (cambio.nueva !== cambio.confirmar) { setMsg('❌ Las contraseñas no coinciden'); return }
    if (cambio.nueva.length < 6) { setMsg('❌ Mínimo 6 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: cambio.actual, contrasena_nueva: cambio.nueva }),
    })
    const d = await res.json()
    setMsg(res.ok ? '✅ Contraseña actualizada correctamente' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) setCambio({ actual: '', nueva: '', confirmar: '' })
    setSaving(false)
    setTimeout(() => setMsg(''), 4000)
  }

  if (loading) return (
    <div className="ap"><header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc flex justify-center py-16"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
    </div>
  )

  const est = data?.estudiante
  const insc = data?.inscripcion

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc max-w-2xl">
        {/* Datos del estudiante */}
        <div className="card mb-5">
          <div className="card-title">🎓 Mis datos</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Código estudiante', est?.codigo_estudiante],
              ['Nombre completo', `${est?.primer_nombre ?? ''} ${est?.primer_apellido ?? ''}`],
              ['CUI', est?.cui_pendiente ? 'Pendiente' : (est?.cui ?? '—')],
              ['Teléfono', est?.telefono ?? '—'],
              ['Correo', est?.correo ?? '—'],
              ['Etapa actual', (insc?.etapa as any)?.nombre ?? '—'],
              ['Sede', (insc?.sede as any)?.nombre ?? '—'],
              ['Versión de libro', insc?.version_libro ?? '—'],
            ].map(([label, value]) => (
              <div key={label as string}>
                <div className="text-xs text-gray-400 font-bold">{label}</div>
                <div className="font-semibold text-gray-700 mt-0.5">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="card">
          <div className="card-title">🔑 Cambiar contraseña</div>
          {msg && <div className={`alert mb-3 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}
          <div className="space-y-3">
            <div className="fg">
              <label className="lbl">Contraseña actual</label>
              <input type="password" className="inp" value={cambio.actual}
                onChange={e => setCambio(c => ({ ...c, actual: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="fg">
              <label className="lbl">Nueva contraseña</label>
              <input type="password" className="inp" value={cambio.nueva}
                onChange={e => setCambio(c => ({ ...c, nueva: e.target.value }))} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="fg">
              <label className="lbl">Confirmar nueva contraseña</label>
              <input type="password" className="inp" value={cambio.confirmar}
                onChange={e => setCambio(c => ({ ...c, confirmar: e.target.value }))} placeholder="Repite la nueva contraseña" />
            </div>
            <button className="btn btn-p" onClick={cambiarPassword} disabled={saving}>
              {saving ? 'Guardando...' : '🔑 Actualizar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
