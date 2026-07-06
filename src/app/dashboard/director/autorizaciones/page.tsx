'use client'
// src/app/dashboard/director/autorizaciones/page.tsx
// CORRECCIÓN: sin imports de componentes inexistentes, modal con margen superior
import { useState, useEffect, useCallback } from 'react'

const PERMISOS_DISPONIBLES = [
  { value: 'ingresar_notas_enlace',       label: 'Ingresar notas' },
  { value: 'ver_documentos_enlace',       label: 'Ver documentos de estudiantes' },
]

export default function AutorizacionesDirectorPage() {
  const [auths,   setAuths]   = useState<any[]>([])
  const [enlaces, setEnlaces] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [form, setForm] = useState({
    enlace_id: '', permiso: 'ingresar_notas_enlace',
    fecha_fin: '', observaciones: '',
  })

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [a, e] = await Promise.all([
      fetch('/api/autorizaciones').then(r => r.json()).catch(() => []),
      fetch('/api/mis-enlaces').then(r => r.json()).catch(() => []),
    ])
    setAuths(Array.isArray(a) ? a : [])
    setEnlaces(Array.isArray(e) ? e : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const crear = async () => {
    if (!form.enlace_id || !form.permiso) { flash('❌ Enlace y permiso son requeridos'); return }
    setSaving(true)
    const res = await fetch('/api/autorizaciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const d = await res.json()
    flash(res.ok
      ? '✅ Autorización creada. Esperando confirmación del administrador.'
      : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModal(false); await cargar() }
    setSaving(false)
  }

  const revocar = async (id: string) => {
    if (!confirm('¿Revocar esta autorización?')) return
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion: 'revocar' }),
    })
    flash(res.ok ? '✅ Autorización revocada' : '❌ Error')
    if (res.ok) await cargar()
  }

  const reactivar = async (a: any) => {
    if (!confirm(`¿Reactivar la autorización de ${(a.enlace as any)?.primer_nombre} ${(a.enlace as any)?.primer_apellido}? El administrador deberá confirmarla de nuevo antes de que pueda ingresar notas.`)) return
    const nuevaFecha = prompt('Nueva fecha de vencimiento (opcional, formato AAAA-MM-DD). Deja vacío para sin límite:', a.fecha_fin ?? '')
    if (nuevaFecha === null) return // canceló
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, accion: 'reactivar', fecha_fin: nuevaFecha || null }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Reactivada — pendiente de confirmación del administrador' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) await cargar()
  }

  const pendientes = auths.filter(a => !a.autorizado_por_admin && a.activo)
  const activas    = auths.filter(a =>  a.autorizado_por_admin && a.activo)
  const revocadas  = auths.filter(a => !a.activo)

  const ESTADO_COLOR = (a: any) => {
    if (!a.activo)                return 'border-l-gray-300 bg-gray-50'
    if (!a.autorizado_por_admin)  return 'border-l-yellow-400 bg-yellow-50/30'
    return 'border-l-green-400 bg-green-50/30'
  }

  const permLabel = (p: string) =>
    PERMISOS_DISPONIBLES.find(x => x.value === p)?.label ?? p.replace(/_/g, ' ')

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🔐 Autorizar a mis Enlaces</div>
          <div className="text-xs text-gray-400">
            El administrador debe confirmar para que el enlace pueda ejecutar la acción
          </div>
        </div>
        <button className="btn btn-p" onClick={() => { setForm({ enlace_id:'', permiso:'ingresar_notas_enlace', fecha_fin:'', observaciones:'' }); setModal(true) }}>
          ＋ Nueva autorización
        </button>
      </header>

      <div className="pc max-w-3xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Explicación del flujo */}
        <div className="alert al-i mb-5 text-sm">
          <div>
            <b>📋 Flujo de autorización:</b>
            <div className="text-xs mt-1.5 space-y-1">
              <div>1️⃣ Tú creas la autorización aquí para tu enlace</div>
              <div>2️⃣ El administrador la confirma en su panel de Autorizaciones</div>
              <div>3️⃣ El enlace puede ejecutar la acción autorizada</div>
              <div className="font-bold text-red-600 mt-1">⚠️ Sin confirmación del admin, el enlace NO puede actuar aunque lo hayas autorizado.</div>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '⏳ Pendientes', count: pendientes.length, color: 'border-yellow-300 bg-yellow-50' },
            { label: '✅ Activas',    count: activas.length,    color: 'border-green-300  bg-green-50'  },
            { label: '❌ Revocadas',  count: revocadas.length,  color: 'border-gray-200   bg-gray-50'   },
          ].map(({ label, count, color }) => (
            <div key={label} className={`card border-2 ${color} text-center py-3`}>
              <div className="text-2xl font-extrabold text-gray-800">{count}</div>
              <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : auths.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">🔐</div>
            <div className="font-semibold">Sin autorizaciones creadas</div>
            <div className="text-sm mt-1">Crea autorizaciones para que tus enlaces puedan ingresar notas</div>
          </div>
        ) : (
          <div className="space-y-3">
            {auths.map((a: any) => {
              const enlace  = a.enlace as any
              const vencida = a.fecha_fin && new Date(a.fecha_fin) < new Date()
              return (
                <div key={a.id} className={`card border-l-4 ${ESTADO_COLOR(a)}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {!a.activo
                          ? <span className="badge badge-gray text-xs">❌ Revocada</span>
                          : !a.autorizado_por_admin
                          ? <span className="badge badge-yellow text-xs">⏳ Esperando confirmación del admin</span>
                          : vencida
                          ? <span className="badge badge-red text-xs">⌛ Vencida</span>
                          : <span className="badge badge-green text-xs">✅ Activa y confirmada</span>}
                        <span className="text-sm font-bold text-gray-800">
                          {permLabel(a.permiso)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <b>Enlace:</b> {enlace?.primer_nombre} {enlace?.primer_apellido}
                        {enlace?.cargo && <span className="text-gray-400"> — {enlace.cargo}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {(enlace?.institucion as any)?.nombre &&
                          `Institución: ${(enlace.institucion as any).nombre} · `}
                        Creada: {new Date(a.creado_en).toLocaleDateString('es-GT')}
                        {a.fecha_fin && ` · Vence: ${new Date(a.fecha_fin).toLocaleDateString('es-GT')}`}
                      </div>
                      {a.observaciones && (
                        <div className="text-xs text-gray-400 mt-0.5">Nota: {a.observaciones}</div>
                      )}
                    </div>
                    {a.activo && (
                      <button className="btn btn-d btn-sm flex-shrink-0" onClick={() => revocar(a.id)}>
                        Revocar
                      </button>
                    )}
                    {!a.activo && (
                      <button className="btn btn-p btn-sm flex-shrink-0" onClick={() => reactivar(a)}>
                        🔄 Reactivar
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal con margen superior */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 pt-16">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h3 className="text-base font-extrabold">＋ Nueva autorización para enlace</h3>
                <button onClick={() => setModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 text-xl">×</button>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div className="alert al-w text-xs">
                  ⚠️ El administrador debe confirmar esta autorización. El enlace no podrá actuar hasta que el admin la apruebe.
                </div>
                <div className="fg">
                  <label className="lbl">Enlace institucional *</label>
                  <select className="inp" value={form.enlace_id}
                    onChange={e => setForm(p => ({ ...p, enlace_id: e.target.value }))}>
                    <option value="">— Seleccionar enlace —</option>
                    {enlaces.length === 0
                      ? <option disabled>Sin enlaces asignados a tu sede</option>
                      : enlaces.map((e: any) => (
                          <option key={e.id} value={e.id}>
                            {e.primer_nombre} {e.primer_apellido}
                            {e.cargo ? ` — ${e.cargo}` : ''}
                          </option>
                        ))}
                  </select>
                  {enlaces.length === 0 && (
                    <div className="text-xs text-red-500 mt-1">
                      No hay enlaces vinculados a tu sede. El administrador debe asignarlos.
                    </div>
                  )}
                </div>
                <div className="fg">
                  <label className="lbl">Permiso a delegar *</label>
                  <select className="inp" value={form.permiso}
                    onChange={e => setForm(p => ({ ...p, permiso: e.target.value }))}>
                    {PERMISOS_DISPONIBLES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label className="lbl">Fecha de vencimiento (opcional)</label>
                  <input type="date" className="inp" value={form.fecha_fin}
                    onChange={e => setForm(p => ({ ...p, fecha_fin: e.target.value }))} />
                  <div className="text-xs text-gray-400 mt-1">Dejar vacío = sin límite de tiempo</div>
                </div>
                <div className="fg">
                  <label className="lbl">Observaciones (opcional)</label>
                  <textarea className="inp" rows={2} value={form.observaciones}
                    onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    placeholder="Motivo de la autorización..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
                <button className="btn btn-g" onClick={() => setModal(false)}>Cancelar</button>
                <button className="btn btn-p" onClick={crear} disabled={saving}>
                  {saving
                    ? <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creando...
                      </span>
                    : '✅ Crear autorización'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
