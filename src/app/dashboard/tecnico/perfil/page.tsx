'use client'
// src/app/dashboard/tecnico/perfil/page.tsx — NUEVA PÁGINA
import { useState, useEffect } from 'react'

export default function TecnicoPerfilPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' })
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/mi-perfil')
      .then(r => r.json())
      .then(d => setData(d))
      .finally(() => setLoading(false))
  }, [])

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cambiarPassword = async () => {
    if (!pwd.actual || !pwd.nueva || !pwd.confirmar) { flash('❌ Todos los campos son requeridos'); return }
    if (pwd.nueva !== pwd.confirmar) { flash('❌ Las contraseñas nuevas no coinciden'); return }
    if (pwd.nueva.length < 8) { flash('❌ Mínimo 8 caracteres'); return }
    setSaving(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: pwd.actual, contrasena_nueva: pwd.nueva }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada correctamente' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) setPwd({ actual: '', nueva: '', confirmar: '' })
    setSaving(false)
  }

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  const p    = data?.perfil
  const sedes = (p?.sedes ?? []).filter((s: any) => s.activo)

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">👤 Mi Perfil</div>
      </header>
      <div className="pc max-w-2xl space-y-5">

        {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Datos personales */}
        <div className="card">
          <div className="card-title">👨‍🏫 Datos del Técnico</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ['Código técnico',    p?.codigo_tecnico ?? '—'],
              ['Nombre completo',   `${p?.primer_nombre ?? ''} ${p?.segundo_nombre ?? ''} ${p?.primer_apellido ?? ''} ${p?.segundo_apellido ?? ''}`.trim()],
              ['CUI',               p?.cui ?? '—'],
              ['Teléfono',          p?.telefono ?? '—'],
              ['Especialidad',      p?.especialidad ?? '—'],
              ['Departamento',      (p?.departamento as any)?.nombre ?? '—'],
              ['Correo de acceso',  (p?.usuario as any)?.correo ?? '—'],
              ['Último acceso',     (p?.usuario as any)?.ultimo_acceso
                                      ? new Date((p.usuario as any).ultimo_acceso).toLocaleString('es-GT')
                                      : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="lbl">{label}</div>
                <div className="font-semibold text-gray-800">{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Sedes asignadas */}
        {sedes.length > 0 && (
          <div className="card">
            <div className="card-title">🏫 Mis Sedes</div>
            <div className="space-y-2">
              {sedes.map((ts: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${ts.es_principal ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div>
                    <div className="text-sm font-semibold">{(ts.sede as any)?.nombre ?? '—'}</div>
                    <div className="text-xs text-gray-400">{(ts.sede as any)?.municipio?.nombre ?? ''}</div>
                  </div>
                  {ts.es_principal && <span className="badge badge-green ml-auto">Principal</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cambiar contraseña */}
        <div className="card">
          <div className="card-title">🔒 Cambiar Contraseña</div>
          <div className="space-y-3">
            <div className="fg">
              <label className="lbl">Contraseña actual</label>
              <input type="password" className="inp" value={pwd.actual}
                onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="lbl">Nueva contraseña (mínimo 8 caracteres)</label>
              <input type="password" className="inp" value={pwd.nueva}
                onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} />
            </div>
            <div className="fg">
              <label className="lbl">Confirmar nueva contraseña</label>
              <input type="password" className="inp" value={pwd.confirmar}
                onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
            </div>
            <button className="btn btn-p" onClick={cambiarPassword} disabled={saving}>
              {saving
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span>
                : '🔒 Actualizar contraseña'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
