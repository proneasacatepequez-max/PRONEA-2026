'use client'
// src/app/dashboard/coordinador/perfil/page.tsx — NUEVA PÁGINA
import { useState, useEffect } from 'react'

export default function CoordinadorPerfilPage() {
  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pwd, setPwd]         = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg, setMsg]         = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    fetch('/api/mi-perfil').then(r => r.json()).then(setData).finally(() => setLoading(false))
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cambiarPassword = async () => {
    if (!pwd.actual || !pwd.nueva || !pwd.confirmar) { flash('❌ Todos los campos requeridos'); return }
    if (pwd.nueva !== pwd.confirmar) { flash('❌ Las contraseñas no coinciden'); return }
    if (pwd.nueva.length < 8) { flash('❌ Mínimo 8 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: pwd.actual, contrasena_nueva: pwd.nueva }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) setPwd({ actual: '', nueva: '', confirmar: '' })
    setSaving(false)
  }

  if (loading) return (
    <div className="ap"><header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc flex justify-center py-16"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
    </div>
  )

  const p = data?.perfil

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil — Coordinador DIGEEX</div></header>
      <div className="pc max-w-2xl space-y-5">
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card">
          <div className="card-title">📋 Datos del Coordinador</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Nombre completo', `${p?.primer_nombre ?? ''} ${p?.segundo_nombre ?? ''} ${p?.primer_apellido ?? ''} ${p?.segundo_apellido ?? ''}`.trim()],
              ['Teléfono',        p?.telefono ?? '—'],
              ['Cargo',           p?.cargo ?? '—'],
              ['Departamento',    (p?.departamento as any)?.nombre ?? '—'],
              ['Correo de acceso', (p?.usuario as any)?.correo ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="lbl">{label}</div>
                <div className="font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">🔒 Cambiar Contraseña</div>
          <div className="space-y-3">
            <div className="fg"><label className="lbl">Contraseña actual</label>
              <input type="password" className="inp" value={pwd.actual} onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} /></div>
            <div className="fg"><label className="lbl">Nueva contraseña</label>
              <input type="password" className="inp" value={pwd.nueva} onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} /></div>
            <div className="fg"><label className="lbl">Confirmar nueva contraseña</label>
              <input type="password" className="inp" value={pwd.confirmar} onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} /></div>
            <button className="btn btn-p" onClick={cambiarPassword} disabled={saving}>
              {saving ? '...' : '🔒 Actualizar contraseña'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
