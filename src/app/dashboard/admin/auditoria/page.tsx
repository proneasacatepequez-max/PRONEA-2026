'use client'
// src/app/dashboard/admin/auditoria/page.tsx
import { useState, useEffect } from 'react'

const ACCIONES_COLOR: Record<string, string> = {
  LOGIN_OK:           'badge-green',
  LOGIN_FAIL:         'badge-red',
  CREAR_USUARIO:      'badge-blue',
  INSERT:             'badge-blue',
  INSERT_NOTA_TAREA:  'badge-purple',
  INSERT_NOTA_EXAMEN: 'badge-purple',
  EXPORTAR_SIREEX:    'badge-yellow',
  CREAR_GRUPO_DUA:    'badge-orange',
}

export default function AuditoriaPage() {
  const [logs, setLogs]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState({ accion: '', tabla: '', desde: '', hasta: '' })

  const cargar = async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (filtro.accion) p.set('accion', filtro.accion)
    if (filtro.tabla)  p.set('tabla',  filtro.tabla)
    if (filtro.desde)  p.set('desde',  filtro.desde)
    if (filtro.hasta)  p.set('hasta',  filtro.hasta)
    const d = await fetch(`/api/auditoria?${p}`).then(r => r.json()).catch(() => [])
    setLogs(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📋 Registro de Auditoría</div>
      </header>
      <div className="pc">
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap items-end">
            <div className="w-44"><label className="lbl">Acción</label>
              <input className="inp" value={filtro.accion} onChange={e => setFiltro(f => ({ ...f, accion: e.target.value }))} placeholder="LOGIN_OK..." />
            </div>
            <div className="w-44"><label className="lbl">Tabla</label>
              <input className="inp" value={filtro.tabla} onChange={e => setFiltro(f => ({ ...f, tabla: e.target.value }))} placeholder="usuarios..." />
            </div>
            <div className="w-36"><label className="lbl">Desde</label>
              <input type="date" className="inp" value={filtro.desde} onChange={e => setFiltro(f => ({ ...f, desde: e.target.value }))} />
            </div>
            <div className="w-36"><label className="lbl">Hasta</label>
              <input type="date" className="inp" value={filtro.hasta} onChange={e => setFiltro(f => ({ ...f, hasta: e.target.value }))} />
            </div>
            <button className="btn btn-p" onClick={cargar}>Buscar</button>
            <button className="btn btn-g" onClick={() => { setFiltro({ accion:'', tabla:'', desde:'', hasta:'' }); setTimeout(cargar, 100) }}>Limpiar</button>
          </div>
        </div>

        <div className="card">
          <div className="card-title">
            Eventos del sistema
            <span className="text-xs text-gray-400 font-normal">{logs.length} registro(s)</span>
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-7 h-7 border-2 border-pronea border-t-transparent rounded-full animate-spin" /></div>
          ) : logs.length === 0 ? (
            <div className="text-center py-10 text-gray-400"><div className="text-4xl mb-2">📋</div><div>Sin registros</div></div>
          ) : (
            <div className="tw">
              <table className="tbl">
                <thead><tr><th>Fecha/Hora</th><th>Acción</th><th>Tabla</th><th>Usuario</th><th>IP</th></tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id}>
                      <td className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(l.creado_en).toLocaleString('es-GT', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                      </td>
                      <td><span className={`badge text-xs ${ACCIONES_COLOR[l.accion] ?? 'badge-gray'}`}>{l.accion}</span></td>
                      <td className="text-xs text-gray-600">{l.tabla_afectada}</td>
                      <td className="text-xs text-gray-600 font-mono">{l.usuario?.correo ?? l.usuario_id?.substring(0,8) + '...'}</td>
                      <td className="text-xs text-gray-400">{l.ip_address ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
