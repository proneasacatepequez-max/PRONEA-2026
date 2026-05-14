'use client'
// src/app/dashboard/admin/autorizaciones/page.tsx
// FIX: Muestra pendientes y confirmadas con botones claros de aprobar/revocar
import { useState, useEffect } from 'react'

export default function AutorizacionesAdminPage() {
  const [auths,      setAuths]      = useState<any[]>([])
  const [loading,    setLoading]    = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [msg,        setMsg]        = useState('')
  const [filtro,     setFiltro]     = useState<'todos' | 'pendientes' | 'activos' | 'revocados'>('pendientes')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/autorizaciones').then(r => r.json()).catch(() => [])
    setAuths(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const accion = async (id: string, tipo: 'confirmar' | 'revocar') => {
    setProcessing(id)
    const res = await fetch('/api/autorizaciones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion: tipo }),
    })
    flash(res.ok ? `✅ Autorización ${tipo === 'confirmar' ? 'confirmada' : 'revocada'}` : '❌ Error')
    await cargar()
    setProcessing(null)
  }

  const pendientes = auths.filter(a => !a.autorizado_por_admin && a.activo)
  const activas    = auths.filter(a =>  a.autorizado_por_admin && a.activo)
  const revocadas  = auths.filter(a => !a.activo)

  const filtrados = filtro === 'pendientes' ? pendientes
    : filtro === 'activos' ? activas
    : filtro === 'revocados' ? revocadas
    : auths

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">✅ Autorizaciones de Directores</div>
          <div className="text-xs text-gray-400">Confirma o revoca permisos que directores delegaron a enlaces</div>
        </div>
        {pendientes.length > 0 && (
          <span className="bg-red-100 text-red-700 text-sm font-bold px-3 py-1.5 rounded-full">
            ⏳ {pendientes.length} pendiente(s)
          </span>
        )}
      </header>

      <div className="pc max-w-4xl">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        {pendientes.length > 0 && (
          <div className="alert al-w mb-5">
            <div>
              <b>⚠️ {pendientes.length} autorización(es) esperando tu confirmación</b><br />
              <span className="text-sm">Sin tu confirmación, el enlace NO puede ejecutar la acción aunque el director la haya creado.</span>
            </div>
          </div>
        )}

        {/* Flujo explicado */}
        <div className="card mb-5">
          <div className="card-title">📋 Flujo de doble barrera</div>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {[
              { n:'1', t:'Admin activa permiso global', ok: true },
              { n:'→', t:'', ok: false },
              { n:'2', t:'Director crea autorización para enlace', ok: true },
              { n:'→', t:'', ok: false },
              { n:'3', t:'Admin confirma (aquí)', ok: true },
              { n:'→', t:'', ok: false },
              { n:'4', t:'Enlace puede ejecutar la acción', ok: true },
            ].map((s, i) => s.n === '→' ? (
              <span key={i} className="text-gray-400 font-bold">→</span>
            ) : (
              <div key={i} className="flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg">
                <span className="w-5 h-5 bg-pronea text-white rounded-full flex items-center justify-center font-bold text-[10px]">{s.n}</span>
                <span className="text-blue-800 font-semibold">{s.t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {([
            ['todos',      `Todas (${auths.length})`],
            ['pendientes', `⏳ Pendientes (${pendientes.length})`],
            ['activos',    `✅ Activas (${activas.length})`],
            ['revocados',  `🚫 Revocadas (${revocadas.length})`],
          ] as const).map(([v, l]) => (
            <button key={v} onClick={() => setFiltro(v)}
              className={`btn btn-sm ${filtro === v ? 'btn-p' : 'btn-g'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-4xl mb-2">✅</div>
            <div className="font-semibold">Sin autorizaciones en esta categoría</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((a: any) => {
              const vencida   = a.fecha_fin && new Date(a.fecha_fin) < new Date()
              const enlace    = a.enlace ?? {}
              const isPending = !a.autorizado_por_admin && a.activo
              return (
                <div key={a.id}
                  className={`card border-l-4 ${isPending ? 'border-l-yellow-400' : a.activo && !vencida ? 'border-l-green-500' : 'border-l-gray-300'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {isPending && <span className="badge badge-yellow">⏳ Pendiente confirmación</span>}
                        {!isPending && a.activo && !vencida && <span className="badge badge-green">✅ Activa</span>}
                        {vencida && <span className="badge badge-red">⌛ Vencida</span>}
                        {!a.activo && <span className="badge badge-gray">🚫 Revocada</span>}
                        <span className="text-sm font-extrabold text-gray-800 bg-gray-100 px-2 py-0.5 rounded">
                          {a.permiso?.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        <b>Enlace:</b> {enlace.primer_nombre} {enlace.primer_apellido}
                        {enlace.cargo && <span className="text-gray-400 ml-1">— {enlace.cargo}</span>}
                        {enlace.institucion && <span className="text-gray-400 ml-1">| {enlace.institucion.nombre}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Creada: {new Date(a.creado_en ?? Date.now()).toLocaleDateString('es-GT')}
                        {a.fecha_fin && <> · Vence: {new Date(a.fecha_fin).toLocaleDateString('es-GT')}</>}
                        {a.observaciones && <> · {a.observaciones}</>}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {isPending && (
                        <button
                          className="btn btn-s btn-sm"
                          disabled={processing === a.id}
                          onClick={() => accion(a.id, 'confirmar')}>
                          {processing === a.id
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : '✅ Confirmar'}
                        </button>
                      )}
                      {a.activo && (
                        <button
                          className="btn btn-d btn-sm"
                          disabled={processing === a.id}
                          onClick={() => accion(a.id, 'revocar')}>
                          {processing === a.id
                            ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : '🚫 Revocar'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
