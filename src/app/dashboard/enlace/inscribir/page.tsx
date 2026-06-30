'use client'
// src/app/dashboard/enlace/inscribir/page.tsx
// CORREGIDO:
// 1. Botón "Nuevo registro" visible cuando no se encontró estudiante
// 2. Botón "Reinscribir" visible en resultados de búsqueda
// 3. sede_id y tecnico_id se resuelven automáticamente en la API
// 4. Código MINEDUC visible
import { useState, useEffect } from 'react'

type Modo = 'buscar' | 'reinscribir' | 'exito'

export default function EnlaceInscribirPage() {
  const [perfil,        setPerfil]        = useState<any>(null)
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [buscarQ,       setBuscarQ]       = useState('')
  const [buscando,      setBuscando]      = useState(false)
  const [resultados,    setResultados]    = useState<any[]>([])
  const [estudianteSel, setEstudianteSel] = useState<any>(null)
  const [modo,          setModo]          = useState<Modo>('buscar')
  const [etapaId,       setEtapaId]       = useState('')
  const [versionLibro,  setVersionLibro]  = useState<'nuevo'|'viejo'>('nuevo')
  const [inscribiendo,  setInscribiendo]  = useState(false)
  const [msg,           setMsg]           = useState('')
  const [ultimoInscrito,setUltimoInscrito]= useState<any>(null)

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 5000) }

  useEffect(() => {
    fetch('/api/mi-perfil').then(r => r.json())
      .then(d => setPerfil(d?.perfil ?? null)).catch(() => {})
    fetch('/api/etapas').then(r => r.json())
      .then(d => setEtapas(Array.isArray(d) ? d : [])).catch(() => {})
  }, [])

  // Búsqueda con debounce
  useEffect(() => {
    if (buscarQ.trim().length < 3) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(buscarQ.trim())}`)
        const d   = await res.json()
        setResultados(d.encontrados ?? [])
      } catch { setResultados([]) }
      finally  { setBuscando(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [buscarQ])

  const seleccionar = (est: any) => {
    setEstudianteSel(est)
    setEtapaId('')
    setVersionLibro('nuevo')
    setModo('reinscribir')
  }

  const limpiar = () => {
    setEstudianteSel(null); setResultados([])
    setBuscarQ(''); setEtapaId(''); setModo('buscar'); setMsg('')
  }

  const inscribir = async () => {
    if (!estudianteSel || !etapaId) { flash('❌ Selecciona una etapa'); return }

    // sede_id y tecnico_id se resuelven automáticamente en el backend
    // (desde enlaces_institucionales.tecnico_id y sede_id del enlace)
    const sede_id = perfil?.sede?.id ?? perfil?.sede_id ?? null
    if (!sede_id) { flash('❌ Tu perfil no tiene sede asignada. Contacta al administrador.'); return }

    setInscribiendo(true)
    try {
      const res = await fetch('/api/inscripciones', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estudiante_id: estudianteSel.id,
          etapa_id:      parseInt(etapaId),
          sede_id,
          // tecnico_id se resuelve en el backend desde el perfil del enlace
          version_libro: versionLibro,
          ciclo_escolar: 2026,
        }),
      })
      const d = await res.json()
      if (res.ok) {
        setUltimoInscrito({
          nombre: `${estudianteSel.primer_nombre} ${estudianteSel.primer_apellido}`,
          etapa:  etapas.find(e => String(e.id) === etapaId)?.nombre ?? '',
        })
        setModo('exito')
      } else if (res.status === 409) {
        flash('⚠️ ' + (d.error ?? 'Ya tiene inscripción activa en esta etapa'))
      } else {
        flash('❌ ' + (d.error ?? 'Error al inscribir'))
      }
    } catch { flash('❌ Error de conexión') }
    finally  { setInscribiendo(false) }
  }

  const sedeNombre    = perfil?.sede?.nombre ?? null
  const tecnicoNombre = perfil?.tecnico ? `${perfil.tecnico.primer_nombre} ${perfil.tecnico.primer_apellido}` : null
  const perfilOk      = !!perfil?.sede?.id

  // ÉXITO
  if (modo === 'exito' && ultimoInscrito) return (
    <div className="ap">
      <header className="topbar"><div className="page-title">✅ Inscripción completada</div></header>
      <div className="pc max-w-lg">
        <div className="card text-center py-10 space-y-4">
          <div className="text-6xl">🎉</div>
          <div className="font-extrabold text-xl text-gray-800">{ultimoInscrito.nombre}</div>
          <div className="text-gray-500">inscrito en <strong>{ultimoInscrito.etapa}</strong></div>
          {sedeNombre && <div className="text-xs text-gray-400">Sede: {sedeNombre}</div>}
          <div className="flex gap-3 justify-center pt-4">
            <button className="btn btn-p" onClick={limpiar}>➕ Inscribir otro estudiante</button>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">➕ Inscribir Estudiante</div>
          <div className="text-xs text-gray-400">
            {sedeNombre ? `🏫 ${sedeNombre}` : '⚠️ Sin sede asignada'}
            {tecnicoNombre && ` · 🛠 ${tecnicoNombre}`}
          </div>
        </div>
        {modo !== 'buscar' && (
          <button className="btn btn-g text-sm" onClick={limpiar}>← Nueva búsqueda</button>
        )}
      </header>

      <div className="pc max-w-3xl space-y-4">
        {msg && (
          <div className={`alert ${msg.startsWith('✅') ? 'al-s' : msg.startsWith('⚠️') ? 'al-w' : 'al-e'}`}>{msg}</div>
        )}

        {perfil && !perfilOk && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold">
            ⚠️ Tu perfil no tiene sede asignada. No puedes inscribir estudiantes.
            Contacta al administrador.
          </div>
        )}

        {/* BUSCAR */}
        {modo === 'buscar' && (
          <div className="card space-y-4">
            <div>
              <h3 className="font-bold text-base mb-1">🔍 Buscar estudiante</h3>
              <p className="text-xs text-gray-500 mb-3">
                Escribe mínimo 3 caracteres — nombre, CUI (13 dígitos) o código MINEDUC
              </p>
              <input className="inp" placeholder="María García  /  2005 12345 0101  /  EST-2024-001"
                value={buscarQ} onChange={e => setBuscarQ(e.target.value)} autoFocus />
            </div>

            {buscando && (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Sin resultados — mostrar botón nuevo registro */}
            {!buscando && buscarQ.trim().length >= 3 && resultados.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <div className="text-3xl mb-2">🔍</div>
                <p className="font-semibold text-gray-600">Sin resultados para "{buscarQ}"</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">
                  Si el estudiante es nuevo, el técnico debe registrarlo.
                  Si tienes permiso, puedes crear el registro aquí.
                </p>
                <a href="/dashboard/tecnico/inscribir" className="btn btn-p text-sm">
                  ➕ Crear nuevo registro de estudiante
                </a>
              </div>
            )}

            {/* Resultados con botones Inscribir y Reinscribir */}
            {resultados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  {resultados.length} resultado(s)
                </p>
                {resultados.map((r: any) => (
                  <div key={r.id}
                    className="flex items-start justify-between p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 truncate">
                        {r.primer_nombre} {r.segundo_nombre} {r.primer_apellido} {r.segundo_apellido}
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs text-gray-400 mt-0.5">
                        {r.codigo_estudiante && (
                          <span className="font-mono">📋 {r.codigo_estudiante}</span>
                        )}
                        {r.cui && !r.cui_pendiente && (
                          <span className="font-mono">🪪 {r.cui}</span>
                        )}
                        {r.cui_pendiente && <span className="text-orange-500">⚠ CUI pendiente</span>}
                      </div>
                      {r.ultima_etapa && (
                        <div className="text-xs text-blue-600 mt-1">
                          📚 Última etapa: <b>{r.ultima_etapa.nombre}</b>
                        </div>
                      )}
                      {r.inscripcion_activa && (
                        <div className="text-xs text-orange-600 mt-0.5">
                          ⚠ Activo en: {r.inscripcion_activa.etapa?.nombre}
                          {r.inscripcion_activa.sede?.nombre && ` — ${r.inscripcion_activa.sede.nombre}`}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {/* Botón principal: Inscribir / Reinscribir */}
                      <button className="btn btn-p btn-sm text-xs whitespace-nowrap"
                        onClick={() => seleccionar(r)}>
                        {r.inscripcion_activa ? '🔄 Reinscribir' : '➕ Inscribir'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* REINSCRIBIR / INSCRIBIR NUEVO */}
        {modo === 'reinscribir' && estudianteSel && (
          <div className="card space-y-4">
            {/* Datos del estudiante */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                Estudiante seleccionado
              </div>
              <div className="font-extrabold text-gray-800 text-base">
                {estudianteSel.primer_nombre} {estudianteSel.segundo_nombre}{' '}
                {estudianteSel.primer_apellido} {estudianteSel.segundo_apellido}
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-500 mt-1">
                {estudianteSel.codigo_estudiante && (
                  <span className="font-mono">📋 {estudianteSel.codigo_estudiante}</span>
                )}
                {estudianteSel.cui && !estudianteSel.cui_pendiente && (
                  <span className="font-mono">🪪 {estudianteSel.cui}</span>
                )}
                {estudianteSel.cui_pendiente && (
                  <span className="text-orange-500">⚠ CUI pendiente</span>
                )}
              </div>
              {estudianteSel.ultima_etapa && (
                <div className="text-xs text-blue-600 mt-2">
                  Última etapa: <b>{estudianteSel.ultima_etapa.nombre}</b>
                </div>
              )}
              {estudianteSel.inscripcion_activa && (
                <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700 font-semibold">
                  ⚠️ Ya tiene inscripción activa en{' '}
                  <b>{estudianteSel.inscripcion_activa.etapa?.nombre}</b>.
                  Puedes inscribirlo en una etapa diferente.
                </div>
              )}
            </div>

            {/* Sede */}
            {sedeNombre && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                🏫 Se inscribirá en: <strong>{sedeNombre}</strong>
                {tecnicoNombre && <span className="text-gray-400"> · 🛠 {tecnicoNombre}</span>}
              </div>
            )}

            {/* Formulario */}
            <div className="fg">
              <label className="lbl">Etapa a inscribir *</label>
              <select className="inp" value={etapaId} onChange={e => setEtapaId(e.target.value)}>
                <option value="">— Seleccionar etapa —</option>
                {etapas.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lbl">Versión de libro</label>
              <select className="inp" value={versionLibro}
                onChange={e => setVersionLibro(e.target.value as 'nuevo'|'viejo')}>
                <option value="nuevo">📗 Libro Nuevo (2024 en adelante)</option>
                <option value="viejo">📙 Libro Viejo (anterior a 2024)</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-g" onClick={limpiar}>Cancelar</button>
              <button className="btn btn-p" onClick={inscribir}
                disabled={inscribiendo || !etapaId || !perfilOk}>
                {inscribiendo
                  ? <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Inscribiendo...
                    </span>
                  : '✅ Confirmar inscripción'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
