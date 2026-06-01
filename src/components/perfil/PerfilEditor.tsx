'use client'
// src/components/perfil/PerfilEditor.tsx
// Componente universal de perfil editable para todos los roles
import { useState, useEffect } from 'react'

const ESCOLARIDAD = ['Primaria','Básico','Bachillerato','Técnico','Universidad','Maestría','Doctorado','Otro']
const GENEROS     = ['Masculino','Femenino','Prefiero no indicar']

interface Props {
  rol: string
}

export default function PerfilEditor({ rol }: Props) {
  const [data,     setData]     = useState<any>(null)
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [form,     setForm]     = useState<any>({})
  const [munis,    setMunis]    = useState<any[]>([])
  const [deptos,   setDeptos]   = useState<any[]>([])

  // Contraseña
  const [pwd, setPwd] = useState({ actual: '', nueva: '', confirmar: '' })
  const [savingPwd, setSavingPwd] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
    const [prf, de] = await Promise.all([
      fetch('/api/mi-perfil').then(r => r.json()).catch(() => ({})),
      fetch('/api/departamentos').then(r => r.json()).catch(() => []),
    ])
    setData(prf)
    setDeptos(Array.isArray(de) ? de : [])
    const p = prf?.perfil ?? {}
    setForm({
      primer_nombre:     p.primer_nombre     ?? '',
      segundo_nombre:    p.segundo_nombre    ?? '',
      primer_apellido:   p.primer_apellido   ?? '',
      segundo_apellido:  p.segundo_apellido  ?? '',
      telefono:          p.telefono          ?? '',
      correo_personal:   p.correo_personal   ?? '',
      genero:            p.genero            ?? '',
      nivel_escolaridad: p.nivel_escolaridad ?? '',
      titulo_profesional:p.titulo_profesional?? '',
      direccion:         p.direccion         ?? '',
      municipio_id:      p.municipio_id ? String(p.municipio_id) : '',
      departamento_id:   p.municipio?.departamento_id ? String(p.municipio?.departamento_id) : '',
    })
    if (p.municipio_id) {
      // Cargar munis del departamento actual
      const dep = p.departamento?.id ?? p.municipio?.departamento_id
      if (dep) {
        fetch(`/api/municipios?departamento_id=${dep}`)
          .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
      }
    }
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  useEffect(() => {
    if (!form.departamento_id) { setMunis([]); return }
    fetch(`/api/municipios?departamento_id=${form.departamento_id}`)
      .then(r => r.json()).then(d => setMunis(Array.isArray(d) ? d : []))
  }, [form.departamento_id])

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((p: any) => ({ ...p, [k]: e.target.value }))

  const guardar = async () => {
    setSaving(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, municipio_id: form.municipio_id ? parseInt(form.municipio_id) : null }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ ' + (d.mensaje ?? 'Perfil actualizado') : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setEditing(false); cargar() }
    setSaving(false)
  }

  const cambiarPassword = async () => {
    if (!pwd.actual || !pwd.nueva || !pwd.confirmar) { flash('❌ Todos los campos son requeridos'); return }
    if (pwd.nueva.length < 8) { flash('❌ Mínimo 8 caracteres'); return }
    if (pwd.nueva !== pwd.confirmar) { flash('❌ Las contraseñas no coinciden'); return }
    setSavingPwd(true)
    const res = await fetch('/api/mi-perfil', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contrasena_actual: pwd.actual, contrasena_nueva: pwd.nueva, contrasena_confirmar: pwd.confirmar }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Contraseña actualizada correctamente' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setPwd({ actual: '', nueva: '', confirmar: '' }); setShowPwd(false) }
    setSavingPwd(false)
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const p        = data?.perfil ?? {}
  const correo   = (p.usuario as any)?.correo ?? p.correo ?? '—'
  const ultimoAcc = (p.usuario as any)?.ultimo_acceso

  const ROL_LABEL: Record<string, string> = {
    administrador:        '⚙️ Administrador',
    tecnico:              '👨‍🏫 Técnico Docente',
    director:             '🏫 Director de Sede',
    coordinador_digeex:   '📋 Coordinador DIGEEX',
    enlace_institucional: '🔗 Enlace Institucional',
    estudiante:           '🎓 Estudiante',
  }

  return (
    <div className="space-y-5">
      {msg && <div className={`alert ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

      {/* ── DATOS PERSONALES ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="card-title mb-0">👤 Datos Personales</div>
          {!editing
            ? <button className="btn btn-p btn-sm" onClick={() => setEditing(true)}>✏️ Editar</button>
            : <div className="flex gap-2">
                <button className="btn btn-g btn-sm" onClick={() => { setEditing(false); cargar() }}>Cancelar</button>
                <button className="btn btn-p btn-sm" onClick={guardar} disabled={saving}>
                  {saving ? '...' : '💾 Guardar'}
                </button>
              </div>}
        </div>

        {!editing ? (
          /* VISTA */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4 text-sm">
            {[
              ['Nombre completo', `${p.primer_nombre ?? ''} ${p.segundo_nombre ?? ''} ${p.primer_apellido ?? ''} ${p.segundo_apellido ?? ''}`.trim()],
              ['Rol en el sistema', ROL_LABEL[rol] ?? rol],
              ['Género', p.genero ?? '—'],
              ['CUI', p.cui ?? '—'],
              ['Teléfono', p.telefono ?? '—'],
              ['Correo personal', p.correo_personal ?? '—'],
              ['Correo de acceso', correo],
              ['Nivel de escolaridad', p.nivel_escolaridad ?? '—'],
              ['Título profesional', p.titulo_profesional ?? '—'],
              ['Municipio de residencia', (p.municipio as any)?.nombre ?? '—'],
              ['Departamento', (p.departamento as any)?.nombre ?? '—'],
              ['Dirección', p.direccion ?? '—'],
              ...(rol === 'tecnico' ? [['Código técnico', p.codigo_tecnico ?? '—'], ['Especialidad', p.especialidad ?? '—']] : []),
              ...(rol === 'director' ? [['Sede a cargo', (p.sede as any)?.nombre ?? '—']] : []),
              ...(rol === 'enlace_institucional' ? [['Institución', (p.institucion as any)?.nombre ?? '—'], ['Cargo', p.cargo ?? '—']] : []),
              ...(rol === 'coordinador_digeex' ? [['Departamento asignado', (p.departamento as any)?.nombre ?? '—'], ['Cargo', p.cargo ?? '—']] : []),
              ['Último acceso', ultimoAcc ? new Date(ultimoAcc).toLocaleString('es-GT') : '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="lbl">{label}</div>
                <div className="font-semibold text-gray-800 break-words">{value || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          /* FORMULARIO */
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { k: 'primer_nombre',    l: 'Primer nombre *' },
                { k: 'segundo_nombre',   l: 'Segundo nombre' },
                { k: 'primer_apellido',  l: 'Primer apellido *' },
                { k: 'segundo_apellido', l: 'Segundo apellido' },
              ].map(({ k, l }) => (
                <div key={k} className="fg">
                  <label className="lbl">{l}</label>
                  <input className="inp" value={form[k]} onChange={F(k)} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="fg">
                <label className="lbl">Género</label>
                <select className="inp" value={form.genero} onChange={F('genero')}>
                  <option value="">— Seleccionar —</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Teléfono</label>
                <input className="inp" value={form.telefono} onChange={F('telefono')} placeholder="5555-1234" />
              </div>
              <div className="fg">
                <label className="lbl">Correo personal</label>
                <input type="email" className="inp" value={form.correo_personal} onChange={F('correo_personal')} />
              </div>
              <div className="fg">
                <label className="lbl">Nivel de escolaridad</label>
                <select className="inp" value={form.nivel_escolaridad} onChange={F('nivel_escolaridad')}>
                  <option value="">— Seleccionar —</option>
                  {ESCOLARIDAD.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Título profesional</label>
                <input className="inp" value={form.titulo_profesional} onChange={F('titulo_profesional')}
                  placeholder="Ej: Licenciado en Educación" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="fg">
                <label className="lbl">Departamento de residencia</label>
                <select className="inp" value={form.departamento_id}
                  onChange={e => setForm((p: any) => ({ ...p, departamento_id: e.target.value, municipio_id: '' }))}>
                  <option value="">— Seleccionar —</option>
                  {deptos.map((d: any) => <option key={d.id} value={String(d.id)}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Municipio de residencia</label>
                <select className="inp" value={form.municipio_id} onChange={F('municipio_id')}
                  disabled={!form.departamento_id}>
                  <option value="">{!form.departamento_id ? '— Selecciona depto —' : '— Seleccionar —'}</option>
                  {munis.map((m: any) => <option key={m.id} value={String(m.id)}>{m.nombre}</option>)}
                </select>
              </div>
              <div className="fg md:col-span-1 col-span-2">
                <label className="lbl">Dirección</label>
                <input className="inp" value={form.direccion} onChange={F('direccion')}
                  placeholder="Calle, colonia, zona..." />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── SEDES (solo técnico) ── */}
      {rol === 'tecnico' && (p.sedes ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">🏫 Mis Sedes Asignadas</div>
          <div className="flex flex-wrap gap-2">
            {(p.sedes ?? []).filter((s: any) => s.activo).map((s: any, i: number) => (
              <div key={i} className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-xl border border-blue-100">
                <div className={`w-2 h-2 rounded-full ${s.es_principal ? 'bg-green-500' : 'bg-blue-300'}`} />
                <span className="text-sm font-semibold">{(s.sede as any)?.nombre}</span>
                <span className="text-xs text-gray-400">{(s.sede as any)?.municipio?.nombre}</span>
                {s.es_principal && <span className="badge badge-green text-xs">Principal</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CAMBIAR CONTRASEÑA ── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="card-title mb-0">🔒 Seguridad</div>
          <button className="btn btn-g btn-sm" onClick={() => setShowPwd(!showPwd)}>
            {showPwd ? 'Cancelar' : 'Cambiar contraseña'}
          </button>
        </div>
        <div className="text-xs text-gray-400">
          Correo de acceso: <span className="font-mono font-bold text-gray-600">{correo}</span>
        </div>

        {showPwd && (
          <div className="mt-4 space-y-3 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="fg">
                <label className="lbl">Contraseña actual</label>
                <input type="password" className="inp" value={pwd.actual}
                  onChange={e => setPwd(p => ({ ...p, actual: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="lbl">Nueva contraseña (mín. 8 caracteres)</label>
                <input type="password" className="inp" value={pwd.nueva}
                  onChange={e => setPwd(p => ({ ...p, nueva: e.target.value }))} />
              </div>
              <div className="fg">
                <label className="lbl">Confirmar nueva contraseña</label>
                <input type="password" className="inp" value={pwd.confirmar}
                  onChange={e => setPwd(p => ({ ...p, confirmar: e.target.value }))} />
              </div>
            </div>
            {pwd.nueva.length > 0 && (
              <div className="flex gap-4">
                {[
                  { ok: pwd.nueva.length >= 8,          label: '8+ caracteres' },
                  { ok: /[A-Z]/.test(pwd.nueva),        label: 'Una mayúscula' },
                  { ok: /[0-9]/.test(pwd.nueva),        label: 'Un número' },
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
  )
}
