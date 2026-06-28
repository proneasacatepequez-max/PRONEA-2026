'use client'
// src/app/dashboard/enlace/inscribir/page.tsx
// Corregido: busca con ?q=, muestra codigo_estudiante, detecta reinscripción,
// obtiene sede_id y tecnico_id desde perfil correctamente
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

  // Cargar perfil y etapas
  useEffect(() => {
    fetch('/api/mi-perfil')
      .then(r => r.json())
      .then(d => setPerfil(d?.perfil ?? null))
      .catch(() => {})

    fetch('/api/etapas')
      .then(r => r.json())
      .then(d => setEtapas(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [])

  // Búsqueda con debounce — usa ?q= (correcto para la API)
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
    setEstudianteSel(null)
    setResultados([])
    setBuscarQ('')
    setEtapaId('')
    setModo('buscar')
  }

  const inscribir = async () => {
    if (!estudianteSel || !etapaId) {
      flash('❌ Selecciona una etapa')
      return
    }

    // Obtener sede_id y tecnico_id del perfil correctamente
    // mi-perfil devuelve: { rol, perfil: { ...enlace, sede: {id, nombre}, tecnico: {id,...} } }
    const sede_id    = perfil?.sede?.id    ?? perfil?.sede_id    ?? null
    const tecnico_id = perfil?.tecnico?.id ?? perfil?.tecnico_id ?? null

    if (!sede_id) {
      flash('❌ Tu perfil no tiene sede asignada. Contacta al administrador.')
      return
    }
    if (!tecnico_id) {
      flash('❌ Tu perfil no tiene técnico asignado. Contacta al administrador.')
      return
    }

    setInscribiendo(true)
    try {
      const res = await fetch('/api/inscripciones', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          estudiante_id: estudianteSel.id,
          etapa_id:      parseInt(etapaId),
          sede_id,
          tecnico_id,
          version_libro: versionLibro,
          ciclo_escolar: 2026,
        }),
      })

      const d = await res.json()

      if (res.ok) {
        setUltimoInscrito({
          nombre:  `${estudianteSel.primer_nombre} ${estudianteSel.primer_apellido}`,
          etapa:   etapas.find(e => String(e.id) === etapaId)?.nombre ?? '',
          id:      d.id,
        })
        setModo('exito')
      } else if (res.status === 409) {
        // Ya está inscrito — mensaje claro
        flash('⚠️ ' + (d.error ?? 'Este estudiante ya tiene una inscripción activa en esta etapa'))
      } else {
        flash('❌ ' + (d.error ?? 'Error al inscribir'))
      }
    } catch { flash('❌ Error de conexión') }
    finally  { setInscribiendo(false) }
  }

  // ── Datos del perfil para mostrar en UI ────────────────────────────
  const sedeNombre    = perfil?.sede?.nombre    ?? (perfil?.sede_id    ? '(sede asignada)' : null)
  const tecnicoNombre = perfil?.tecnico
    ? `${perfil.tecnico.primer_nombre} ${perfil.tecnico.primer_apellido}`
    : null
  const perfilCompleto = !!perfil?.sede?.id && !!perfil?.tecnico?.id

  // ── Render: éxito ───────────────────────────────────────────────────
  if (modo === 'exito' && ultimoInscrito) {
    return (
      <div className="ap">
        <header className="topbar">
          <div className="page-title">✅ Inscripción completada</div>
        </header>
        <div className="pc max-w-lg">
          <div className="card text-center py-10 space-y-4">
            <div className="text-6xl">🎉</div>
            <div className="font-extrabold text-xl text-gray-800">{ultimoInscrito.nombre}</div>
            <div className="text-gray-500">fue inscrito en <strong>{ultimoInscrito.etapa}</strong></div>
            {sedeNombre && <div className="text-xs text-gray-400">Sede: {sedeNombre}</div>}
            <div className="flex gap-3 justify-center pt-4">
              <button className="btn btn-g" onClick={limpiar}>
                🔍 Inscribir otro
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">➕ Inscribir Estudiante</div>
          <div className="text-xs text-gray-400">
            {sedeNombre ? `Sede: ${sedeNombre}` : '⚠️ Sin sede asignada'}
            {tecnicoNombre && ` · Técnico: ${tecnicoNombre}`}
          </div>
        </div>
        {modo !== 'buscar' && (
          <button className="btn btn-g text-sm" onClick={limpiar}>
            ← Nueva búsqueda
          </button>
        )}
      </header>

      <div className="pc max-w-3xl space-y-4">

        {msg && (
          <div className={`alert ${msg.startsWith('✅') ? 'al-s' : msg.startsWith('⚠️') ? 'al-w' : 'al-e'}`}>
            {msg}
          </div>
        )}

        {/* Advertencia si perfil incompleto */}
        {perfil && !perfilCompleto && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 font-semibold">
            ⚠️ Tu perfil no tiene sede o técnico asignado. No podrás inscribir estudiantes hasta que el administrador lo configure.
          </div>
        )}

        {/* ── MODO BUSCAR ──────────────────────────────────────────── */}
        {modo === 'buscar' && (
          <div className="card space-y-4">
            <div>
              <h3 className="font-bold text-base mb-1">🔍 Buscar estudiante</h3>
              <p className="text-xs text-gray-500 mb-3">
                Escribe mínimo 3 caracteres — nombre, apellido, CUI (13 dígitos) o código MINEDUC.
              </p>
              <input
                className="inp"
                placeholder="Ej: María García  /  2005 12345 0101  /  EST-2024-001"
                value={buscarQ}
                onChange={e => setBuscarQ(e.target.value)}
                autoFocus
              />
            </div>

            {buscando && (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!buscando && buscarQ.trim().length >= 3 && resultados.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400">
                <div className="text-3xl mb-2">🔍</div>
                <p className="font-semibold">Sin resultados para "{buscarQ}"</p>
                <p className="text-xs mt-1">
                  Verifica el dato o pide al técnico que registre al estudiante primero.
                </p>
              </div>
            )}

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
                        {r.cui_pendiente && (
                          <span className="text-orange-500">⚠ CUI pendiente</span>
                        )}
                      </div>
                      {r.ultima_etapa && (
                        <div className="text-xs text-blue-600 mt-1">
                          📚 Última etapa: <b>{r.ultima_etapa.nombre}</b>
                          {r.total_inscripciones > 1 && ` · ${r.total_inscripciones} inscripciones`}
                        </div>
                      )}
                      {r.inscripcion_activa && (
                        <div className="text-xs text-orange-600 mt-0.5 font-semibold">
                          ⚠ Ya inscrito en: {r.inscripcion_activa.etapa?.nombre}
                          {r.inscripcion_activa.sede?.nombre && ` — ${r.inscripcion_activa.sede.nombre}`}
                        </div>
                      )}
                    </div>
                    <button
                      className="btn btn-p btn-sm shrink-0"
                      onClick={() => seleccionar(r)}
                    >
                      ➕ Inscribir
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── MODO REINSCRIBIR ─────────────────────────────────────── */}
        {modo === 'reinscribir' && estudianteSel && (
          <div className="card space-y-4">

            {/* Datos del estudiante */}
            <div className="bg-blue-50 rounded-xl p-4 space-y-1">
              <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
                Estudiante seleccionado
              </div>
              <div className="font-extrabold text-gray-800 text-base">
                {estudianteSel.primer_nombre} {estudianteSel.segundo_nombre}{' '}
                {estudianteSel.primer_apellido} {estudianteSel.segundo_apellido}
              </div>
              <div className="flex flex-wrap gap-x-4 text-xs text-gray-500">
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
                <div className="text-xs text-blue-600 mt-1">
                  Última etapa cursada: <b>{estudianteSel.ultima_etapa.nombre}</b>
                </div>
              )}
              {estudianteSel.inscripcion_activa && (
                <div className="mt-2 bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700 font-semibold">
                  ⚠️ Ya tiene inscripción activa en <b>{estudianteSel.inscripcion_activa.etapa?.nombre}</b>.
                  Si lo inscribes en otra etapa, la nueva será adicional.
                </div>
              )}
            </div>

            {/* Sede donde se inscribirá */}
            {sedeNombre && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                🏫 Se inscribirá en: <strong>{sedeNombre}</strong>
                {tecnicoNombre && <span className="text-gray-400"> · Técnico: {tecnicoNombre}</span>}
              </div>
            )}

            {/* Formulario */}
            <div className="fg">
              <label className="lbl">Nueva etapa *</label>
              <select className="inp" value={etapaId} onChange={e => setEtapaId(e.target.value)}>
                <option value="">— Seleccionar etapa —</option>
                {etapas.map((e: any) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>

            <div className="fg">
              <label className="lbl">Versión de libro</label>
              <select
                className="inp"
                value={versionLibro}
                onChange={e => setVersionLibro(e.target.value as 'nuevo'|'viejo')}
              >
                <option value="nuevo">📗 Libro nuevo (2024 en adelante)</option>
                <option value="viejo">📘 Libro viejo (anterior a 2024)</option>
              </select>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button className="btn btn-g" onClick={limpiar}>
                Cancelar
              </button>
              <button
                className="btn btn-p"
                onClick={inscribir}
                disabled={inscribiendo || !etapaId || !perfilCompleto}
              >
                {inscribiendo ? '⏳ Inscribiendo...' : '✅ Confirmar inscripción'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
