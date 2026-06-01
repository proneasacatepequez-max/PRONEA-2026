'use client'
// src/app/dashboard/estudiante/perfil/page.tsx
// COMPLETO: el estudiante puede actualizar sus datos de contacto y emergencia
import { useState, useEffect } from 'react'

export default function EstudiantePerfilPage() {
  const [data,    setData]    = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<any>({})
  const [msg,     setMsg]     = useState('')
  const [pwd, setPwd]         = useState({ actual: '', nueva: '', confirmar: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [showPwd, setShowPwd]     = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
    const d = await fetch('/api/mi-perfil').then(r => r.json()).catch(() => ({}))
    setData(d)
    const p = d?.perfil ?? {}
    setForm({
      telefono:                    p.telefono                    ?? '',
      telefono_alternativo:        p.telefono_alternativo        ?? '',
      correo:                      p.correo                      ?? '',
      direccion:                   p.direccion                   ?? '',
      trabaja_actualmente:         p.trabaja_actualmente         ?? false,
      ocupacion:                   p.ocupacion                   ?? '',
      lugar_trabajo:               p.lugar_trabajo               ?? '',
      meta_estudio:                p.meta_estudio                ?? '',
      contacto_emergencia_nombre:  p.contacto_emergencia_nombre  ?? '',
      contacto_emergencia_tel:     p.contacto_emergencia_tel     ?? '',
      contacto_emergencia_parent:  p.contacto_emergencia_parent  ?? '',
      posee_internet:              p.posee_internet              ?? false,
      posee_computadora:           p.posee_computadora           ?? false,
    })
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const guardar = async () => {
    setSaving(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Perfil actualizado' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setEditing(false); cargar() }
    setSaving(false)
  }

  const cambiarPassword = async () => {
    if (!pwd.actual || !pwd.nueva || !pwd.confirmar) { flash('❌ Todos los campos requeridos'); return }
    if (pwd.nueva.length < 8) { flash('❌ Mínimo 8 caracteres'); return }
    if (pwd.nueva !== pwd.confirmar) { flash('❌ Las contraseñas no coinciden'); return }
    setSavingPwd(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: pwd.actual, contrasena_nueva: pwd.nueva, contrasena_confirmar: pwd.confirmar }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setPwd({ actual: '', nueva: '', confirmar: '' }); setShowPwd(false) }
    setSavingPwd(false)
  }

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  if (loading) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )

  const p    = data?.perfil ?? {}
  const insc = (p.inscripciones ?? []).find((i: any) => i.estado === 'en_curso')

  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc max-w-4xl space-y-5">
        {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Datos de inscripción — solo lectura */}
        {insc && (
          <div className="card border-l-4 border-l-pronea">
            <div className="card-title">📋 Mi Inscripción Activa</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ['Código estudiante', p.codigo_estudiante ?? '—'],
                ['Etapa', (insc.etapa as any)?.nombre ?? '—'],
                ['Sede', (insc.sede as any)?.nombre ?? '—'],
                ['Versión libro', insc.version_libro === 'nuevo' ? '📗 Libro Nuevo' : '📙 Libro Viejo'],
                ['Mi técnico', `${(insc.tecnico as any)?.primer_nombre ?? ''} ${(insc.tecnico as any)?.primer_apellido ?? ''}`.trim()],
                ['Ciclo escolar', insc.ciclo_escolar],
              ].map(([l, v]) => (
                <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v}</div></div>
              ))}
            </div>
          </div>
        )}

        {/* Datos personales — solo lectura (admin/técnico los edita) */}
        <div className="card">
          <div className="card-title">👤 Mis Datos Personales</div>
          <div className="text-xs text-gray-400 mb-3">
            Para modificar nombre, CUI o fecha de nacimiento, contacta a tu técnico.
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
            {[
              ['Nombre completo', `${p.primer_nombre ?? ''} ${p.segundo_nombre ?? ''} ${p.primer_apellido ?? ''} ${p.segundo_apellido ?? ''}`.trim()],
              ['CUI', p.cui ?? (p.cui_pendiente ? 'Pendiente de trámite' : '—')],
              ['Fecha de nacimiento', p.fecha_nacimiento ?? '—'],
              ['Género', p.genero ?? '—'],
              ['Municipio', (p.municipio as any)?.nombre ?? '—'],
              ['Discapacidad', (p.discapacidad as any)?.nombre ?? 'Ninguna'],
            ].map(([l, v]) => (
              <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v}</div></div>
            ))}
          </div>
        </div>

        {/* Datos editables */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="card-title mb-0">📞 Datos de Contacto</div>
            {!editing
              ? <button className="btn btn-p btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>
              : <div className="flex gap-2">
                  <button className="btn btn-g btn-sm" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="btn btn-p btn-sm" onClick={guardar} disabled={saving}>
                    {saving ? '...' : '💾 Guardar'}
                  </button>
                </div>}
          </div>
          {!editing ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3 text-sm">
              {[
                ['Teléfono', p.telefono ?? '—'],
                ['Tel. alternativo', p.telefono_alternativo ?? '—'],
                ['Correo', p.correo ?? '—'],
                ['Dirección', p.direccion ?? '—'],
                ['Trabaja actualmente', p.trabaja_actualmente ? 'Sí' : 'No'],
                ['Ocupación', p.ocupacion ?? '—'],
                ['Lugar de trabajo', p.lugar_trabajo ?? '—'],
                ['Meta de estudio', p.meta_estudio ?? '—'],
                ['Tiene internet', p.posee_internet ? 'Sí' : 'No'],
                ['Tiene computadora', p.posee_computadora ? 'Sí' : 'No'],
              ].map(([l, v]) => (
                <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v}</div></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="fg"><label className="lbl">Teléfono</label>
                  <input className="inp" value={form.telefono} onChange={F('telefono')} /></div>
                <div className="fg"><label className="lbl">Tel. alternativo</label>
                  <input className="inp" value={form.telefono_alternativo} onChange={F('telefono_alternativo')} /></div>
                <div className="fg"><label className="lbl">Correo</label>
                  <input type="email" className="inp" value={form.correo} onChange={F('correo')} /></div>
                <div className="fg md:col-span-3"><label className="lbl">Dirección</label>
                  <input className="inp" value={form.direccion} onChange={F('direccion')} /></div>
                <div className="fg"><label className="lbl">Ocupación</label>
                  <input className="inp" value={form.ocupacion} onChange={F('ocupacion')} /></div>
                <div className="fg"><label className="lbl">Lugar de trabajo</label>
                  <input className="inp" value={form.lugar_trabajo} onChange={F('lugar_trabajo')} /></div>
                <div className="fg md:col-span-3"><label className="lbl">Meta de estudio</label>
                  <input className="inp" value={form.meta_estudio} onChange={F('meta_estudio')} placeholder="¿Qué quieres lograr con tus estudios?" /></div>
              </div>
              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.trabaja_actualmente} onChange={F('trabaja_actualmente')} className="w-4 h-4" />
                  Trabajo actualmente
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.posee_internet} onChange={F('posee_internet')} className="w-4 h-4" />
                  Tengo acceso a internet
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!form.posee_computadora} onChange={F('posee_computadora')} className="w-4 h-4" />
                  Tengo computadora
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Contacto de emergencia */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="card-title mb-0">🚨 Contacto de Emergencia</div>
            {!editing && <button className="btn btn-g btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>}
          </div>
          {!editing ? (
            <div className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
              {[
                ['Nombre', p.contacto_emergencia_nombre ?? '—'],
                ['Teléfono', p.contacto_emergencia_tel  ?? '—'],
                ['Parentesco', p.contacto_emergencia_parent ?? '—'],
              ].map(([l, v]) => (
                <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v}</div></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="fg"><label className="lbl">Nombre</label>
                <input className="inp" value={form.contacto_emergencia_nombre} onChange={F('contacto_emergencia_nombre')} /></div>
              <div className="fg"><label className="lbl">Teléfono</label>
                <input className="inp" value={form.contacto_emergencia_tel} onChange={F('contacto_emergencia_tel')} /></div>
              <div className="fg"><label className="lbl">Parentesco</label>
                <input className="inp" value={form.contacto_emergencia_parent} onChange={F('contacto_emergencia_parent')} placeholder="Madre, padre, hermano..." /></div>
            </div>
          )}
        </div>

        {/* Seguridad */}
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div className="card-title mb-0">🔒 Seguridad</div>
            <button className="btn btn-g btn-sm" onClick={() => setShowPwd(!showPwd)}>
              {showPwd ? 'Cancelar' : 'Cambiar contraseña'}
            </button>
          </div>
          <div className="text-xs text-gray-400">
            Correo de acceso: <span className="font-mono font-bold text-gray-600">{(p.usuario as any)?.correo ?? '—'}</span>
          </div>
          {showPwd && (
            <div className="mt-4 border-t pt-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="fg"><label className="lbl">Contraseña actual</label>
                  <input type="password" className="inp" value={pwd.actual}
                    onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Nueva contraseña</label>
                  <input type="password" className="inp" value={pwd.nueva}
                    onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} /></div>
                <div className="fg"><label className="lbl">Confirmar</label>
                  <input type="password" className="inp" value={pwd.confirmar}
                    onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} /></div>
              </div>
              {pwd.nueva.length > 0 && (
                <div className="flex gap-4 flex-wrap">
                  {[
                    { ok: pwd.nueva.length >= 8,   label: '8+ caracteres' },
                    { ok: /[A-Z]/.test(pwd.nueva), label: 'Una mayúscula' },
                    { ok: /[0-9]/.test(pwd.nueva), label: 'Un número' },
                    { ok: pwd.nueva === pwd.confirmar && !!pwd.confirmar, label: 'Coinciden' },
                  ].map(({ ok, label }) => (
                    <div key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                      <span>{ok ? '✅' : '○'}</span><span>{label}</span>
                    </div>
                  ))}
                </div>
              )}
              <button className="btn btn-p" onClick={cambiarPassword} disabled={savingPwd}>
                {savingPwd ? '...' : '🔒 Actualizar contraseña'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
