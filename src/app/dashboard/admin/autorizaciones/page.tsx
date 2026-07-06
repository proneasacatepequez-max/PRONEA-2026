'use client'
// src/app/dashboard/admin/autorizaciones/page.tsx
// FIX #12: Mostrar sede cuando selecciona un enlace
// Admin confirma o revoca autorizaciones que el director creó para sus enlaces
import { useState, useEffect, useCallback } from 'react'

export default function AdminAutorizacionesPage() {
  const [auths,   setAuths]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msg,     setMsg]     = useState('')
  const [saving,  setSaving]  = useState<string | null>(null)
  const [sede,    setSede]    = useState<any>(null)
  const [loadingSede, setLoadingSede] = useState(false)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/autorizaciones?all=1')
    const d   = await res.json()
    setAuths(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const cargarSedeDelEnlace = async (enlaceId: string) => {
    if (!enlaceId) {
      setSede(null)
      return
    }

    setLoadingSede(true)
    const res = await fetch(`/api/enlaces-institucionales/${enlaceId}`)
    const datos = await res.json()

    if (res.ok && datos.sede) {
      setSede(datos.sede)
    } else {
      setSede(null)
    }
    setLoadingSede(false)
  }

  const confirmar = async (id: string) => {
    setSaving(id)
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion: 'confirmar' }),
    })
    flash(res.ok ? '✅ Autorización confirmada — el enlace ya puede actuar' : '❌ Error al confirmar')
    if (res.ok) await cargar()
    setSaving(null)
  }

  const revocar = async (id: string) => {
    if (!confirm('¿Revocar esta autorización?')) return
    setSaving(id)
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion: 'revocar' }),
    })
    flash(res.ok ? '✅ Autorización revocada' : '❌ Error')
    if (res.ok) await cargar()
    setSaving(null)
  }

  const reactivar = async (a: any) => {
    if (!confirm(`¿Reactivar y confirmar de una vez la autorización de ${(a.enlace as any)?.primer_nombre} ${(a.enlace as any)?.primer_apellido}?`)) return
    const nuevaFecha = prompt('Nueva fecha de vencimiento (opcional, formato AAAA-MM-DD). Deja vacío para sin límite:', a.fecha_fin ?? '')
    if (nuevaFecha === null) return
    setSaving(a.id)
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: a.id, accion: 'reactivar', fecha_fin: nuevaFecha || null }),
    })
    const d = await res.json()
    flash(res.ok ? '✅ Reactivada y confirmada — el enlace ya puede actuar' : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) await cargar()
    setSaving(null)
  }

  const pendientes = auths.filter(a =>  a.activo && !a.autorizado_por_admin)
  const activas    = auths.filter(a =>  a.activo &&  a.autorizado_por_admin)
  const revocadas  = auths.filter(a => !a.activo)

  const permLabel = (p: string) => ({
    ingresar_notas_enlace:  '📝 Ingresar notas',
    ver_documentos_enlace:  '📎 Ver documentos',
    inscribir_estudiantes_enlace: '➕ Inscribir estudiantes',
  }[p] ?? p.replace(/_/g, ' '))

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">✅ Autorizaciones de Enlace</div>
          <div className="text-xs text-gray-400">
            Confirma las autorizaciones que el director creó para sus enlaces
          </div>
        </div>
      </header>

      <div className="pc max-w-4xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {/* Resumen */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: '⏳ Pendientes de confirmar', count: pendientes.length, color: 'border-yellow-300 bg-yellow-50', urgent: pendientes.length > 0 },
            { label: '✅ Activas y confirmadas',   count: activas.length,    color: 'border-green-300  bg-green-50'  },
            { label: '❌ Revocadas',               count: revocadas.length,  color: 'border-gray-200   bg-gray-50'   },
          ].map(({ label, count, color, urgent }) => (
            <div key={label} className={`card border-2 ${color} text-center py-3 ${urgent ? 'animate-pulse' : ''}`}>
              <div className="text-3xl font-extrabold text-gray-800">{count}</div>
              <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>
              {urgent && <div className="text-xs text-yellow-600 mt-0.5">Requieren tu acción</div>}
            </div>
          ))}
        </div>

        {/* Alerta de pendientes */}
        {pendientes.length > 0 && (
          <div className="alert al-w mb-4 text-sm">
            ⚠️ Tienes <b>{pendientes.length}</b> autorización(es) esperando tu confirmación.
            Hasta que las confirmes, el enlace NO puede actuar.
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
          </div>
        ) : auths.length === 0 ? (
          <div className="card text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <div className="font-semibold">Sin autorizaciones registradas</div>
            <div className="text-sm mt-1">Los directores deben crear autorizaciones para sus enlaces</div>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-left">
                    {['Permiso','Enlace','Institución','Director','Fecha inicio','Vence','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-blue-700 last:border-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auths.map((a: any, idx: number) => {
                    const enl  = a.enlace   as any
                    const dir  = a.director as any
                    const venc = a.fecha_fin && new Date(a.fecha_fin) < new Date()
                    return (
                      <tr key={a.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-sky-50/20'}`}>
                        <td className="px-3 py-2.5">
                          <span className="font-semibold text-gray-800">{permLabel(a.permiso)}</span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="font-semibold">{enl?.primer_nombre} {enl?.primer_apellido}</div>
                          <div className="text-xs text-gray-400">{enl?.cargo}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500">
                          {(enl?.institucion as any)?.nombre ?? '—'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                          {dir?.primer_nombre} {dir?.primer_apellido}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">
                          {a.fecha_inicio ? new Date(a.fecha_inicio).toLocaleDateString('es-GT') : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          {a.fecha_fin
                            ? <span className={venc ? 'text-red-500 font-bold' : 'text-gray-500'}>
                                {new Date(a.fecha_fin).toLocaleDateString('es-GT')}
                                {venc && ' ⌛'}
                              </span>
                            : <span className="text-gray-300">Sin límite</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          {!a.activo
                            ? <span className="badge badge-gray text-xs">Revocada</span>
                            : !a.autorizado_por_admin
                            ? <span className="badge badge-yellow text-xs">⏳ Pendiente</span>
                            : venc
                            ? <span className="badge badge-red text-xs">Vencida</span>
                            : <span className="badge badge-green text-xs">✅ Activa</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-nowrap">
                            {a.activo && !a.autorizado_por_admin && (
                              <button
                                className="btn btn-s btn-sm whitespace-nowrap"
                                onClick={() => confirmar(a.id)}
                                disabled={saving === a.id}
                              >
                                {saving === a.id
                                  ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                  : '✅ Confirmar'}
                              </button>
                            )}
                            {a.activo && (
                              <button
                                className="btn btn-d btn-sm"
                                onClick={() => revocar(a.id)}
                                disabled={saving === a.id}
                              >
                                Revocar
                              </button>
                            )}
                            {!a.activo && (
                              <button
                                className="btn btn-p btn-sm whitespace-nowrap"
                                onClick={() => reactivar(a)}
                                disabled={saving === a.id}
                              >
                                {saving === a.id
                                  ? <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin inline-block" />
                                  : '🔄 Reactivar'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
