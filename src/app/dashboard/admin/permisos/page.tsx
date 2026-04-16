'use client'
// src/app/dashboard/admin/permisos/page.tsx
import { useState, useEffect } from 'react'
import { Alert, Spinner, Toggle, LoadingBtn } from '@/components/ui'

export default function PermisosAdminPage() {
  const [permisos, setPermisos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string|null>(null)
  const [msg, setMsg] = useState('')

  const cargar = async () => {
    setLoading(true)
    const d = await fetch('/api/permisos').then(r=>r.json())
    setPermisos(Array.isArray(d)?d:[])
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])

  const togglePermiso = async (permiso: string, activo: boolean) => {
    setSaving(permiso)
    const res = await fetch('/api/permisos', {
      method:'PUT', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ permiso, activo: !activo })
    })
    const d = await res.json()
    if (res.ok) {
      setPermisos(p => p.map(pp => pp.permiso===permiso ? {...pp, global_activo:!activo} : pp))
      setMsg(`✅ Permiso "${permiso.replace(/_/g,' ')}" ${!activo?'activado':'desactivado'}`)
    } else {
      setMsg(`❌ Error: ${d.error}`)
    }
    setSaving(null)
    setTimeout(() => setMsg(''), 3000)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🔐 Permisos Globales del Sistema</div>
          <div className="text-xs text-gray-400">Primera barrera: habilita/deshabilita acciones delegables</div>
        </div>
      </header>
      <div className="pc max-w-3xl">
        {msg && <Alert type={msg.startsWith('✅')?'success':'error'}>{msg}</Alert>}

        <div className="alert al-i mb-5">
          <div>
            <b>📋 ¿Cómo funciona el sistema de doble barrera?</b>
            <div className="mt-1 text-xs space-y-0.5">
              <div>1️⃣ <b>Admin</b> activa un permiso global (esta página)</div>
              <div>2️⃣ <b>Director</b> crea una autorización para un enlace específico</div>
              <div>3️⃣ <b>Admin</b> confirma la autorización del director</div>
              <div>4️⃣ <b>Enlace</b> puede ejecutar la acción</div>
              <div className="text-red-700 font-bold mt-1">⚠️ Si desactivas un permiso global, TODOS los enlaces pierden ese acceso inmediatamente.</div>
            </div>
          </div>
        </div>

        {loading ? <Spinner/> : (
          <div className="space-y-3">
            {permisos.map((pg:any) => (
              <div key={pg.permiso} className={`card border-l-4 ${pg.global_activo?'border-l-green-500':'border-l-red-300'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${pg.global_activo?'badge-green':'badge-red'}`}>
                        {pg.global_activo?'✅ Activo':'🔴 Inactivo'}
                      </span>
                      <span className="text-sm font-extrabold text-gray-800">{pg.permiso.replace(/_/g,' ')}</span>
                    </div>
                    <p className="text-xs text-gray-500">{pg.descripcion}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      <span>Autorizaciones vigentes: <b className="text-gray-600">{pg.autorizaciones_vigentes??0}</b></span>
                      <span>Pendientes confirmación: <b className={`${(pg.pendientes_confirmacion_admin??0)>0?'text-yellow-600':'text-gray-600'}`}>{pg.pendientes_confirmacion_admin??0}</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {saving===pg.permiso
                      ? <div className="w-5 h-5 border-2 border-pronea border-t-transparent rounded-full animate-spin"/>
                      : <Toggle checked={pg.global_activo} onChange={() => togglePermiso(pg.permiso, pg.global_activo)}/>
                    }
                  </div>
                </div>
                {pg.global_activo && (pg.pendientes_confirmacion_admin??0) > 0 && (
                  <div className="mt-2 text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg font-semibold">
                    ⏳ Hay {pg.pendientes_confirmacion_admin} autorización(es) pendientes de tu confirmación en este permiso.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
