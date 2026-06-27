'use client'
import { useState, useEffect } from 'react'

export default function EnlaceInscribirPage() {
  const [busqueda,      setBusqueda]      = useState('')
  const [buscando,      setBuscando]      = useState(false)
  const [resultados,    setResultados]    = useState<any[]>([])
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [miPerfil,      setMiPerfil]      = useState<any>(null)
  const [estudianteSel, setEstudianteSel] = useState<any>(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [etapaId,       setEtapaId]       = useState('')
  const [inscribiendo,  setInscribiendo]  = useState(false)
  const [msg,           setMsg]           = useState('')

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  // Cargar perfil del enlace (para obtener sede_id y tecnico_id)
  useEffect(() => {
    fetch('/api/mi-perfil')
      .then(r => r.json())
      .then(d => setMiPerfil(d))
      .catch(() => {})

    fetch('/api/etapas')
      .then(r => r.json())
      .then(d => setEtapas(Array.isArray(d) ? d : []))
      .catch(() => [])
  }, [])

  // Búsqueda con debounce — usa parámetro 'q' que es lo que espera la API
  useEffect(() => {
    if (busqueda.trim().length < 3) { setResultados([]); return }
    setBuscando(true)
    const t = setTimeout(() => {
      fetch(`/api/estudiantes/buscar?q=${encodeURIComponent(busqueda.trim())}`)
        .then(r => r.json())
        .then(d => setResultados(d.encontrados ?? []))
        .catch(() => setResultados([]))
        .finally(() => setBuscando(false))
    }, 400)
    return () => clearTimeout(t)
  }, [busqueda])

  const abrirModal = (est: any) => {
    setEstudianteSel(est)
    setEtapaId('')
    setModalOpen(true)
  }

  const inscribir = async () => {
    if (!estudianteSel || !etapaId) {
      flash('❌ Selecciona una etapa')
      return
    }

    // sede_id y tecnico_id vienen del perfil del enlace
    const sede_id    = miPerfil?.sede_id    ?? miPerfil?.sede?.id    ?? null
    const tecnico_id = miPerfil?.tecnico_id ?? miPerfil?.tecnico?.id ?? null

    if (!sede_id) {
      flash('❌ Tu perfil no tiene sede asignada. Contacta al administrador.')
      return
    }
    if (!tecnico_id) {
      flash('❌ Tu perfil no tiene técnico asignado. Contacta al administrador.')
      return
    }

    setInscribiendo(true)
    const res = await fetch('/api/inscripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: estudianteSel.id,
        etapa_id:      parseInt(etapaId),
        sede_id,
        tecnico_id,
        ciclo_escolar: 2026,
        version_libro: 'nuevo',
      }),
    })

    const d = await res.json()
    setInscribiendo(false)

    if (res.ok) {
      flash('✅ Estudiante inscrito correctamente')
      setModalOpen(false)
      setEstudianteSel(null)
      setEtapaId('')
      setBusqueda('')
      setResultados([])
    } else {
      flash('❌ ' + (d.error ?? 'Error al inscribir'))
    }
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">➕ Inscribir Estudiante</div>
          <div className="text-xs text-gray-400">Busca y registra estudiantes en tu sede</div>
        </div>
      </header>

      <div className="pc max-w-3xl">
        {msg && (
          <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>
        )}

        {/* Info de sede del enlace */}
        {miPerfil?.sede && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-700">
            🏫 Sede: <strong>{miPerfil.sede.nombre ?? miPerfil.sede_id}</strong>
          </div>
        )}

        <div className="card space-y-4">
          <h3 className="font-bold">🔍 Buscar Estudiante</h3>
          <p className="text-sm text-gray-500">
            Escribe al menos 3 caracteres — nombre, apellido, CUI o código MINEDUC.
          </p>

          <input
            className="inp"
            placeholder="Nombre, CUI (13 dígitos) o código..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            autoFocus
          />

          {buscando && (
            <div className="flex justify-center py-6">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!buscando && busqueda.trim().length >= 3 && resultados.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-xl">
              <div className="text-3xl mb-2">🔍</div>
              <p className="text-sm text-gray-500">Sin resultados para "<strong>{busqueda}</strong>"</p>
              <p className="text-xs text-gray-400 mt-1">
                Si el estudiante es nuevo, el técnico debe registrarlo primero.
              </p>
            </div>
          )}

          {resultados.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase">
                {resultados.length} resultado(s)
              </p>
              {resultados.map((r: any) => (
                <div key={r.id}
                  className="flex items-center justify-between p-3 rounded-xl border-2 border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all">
                  <div>
                    <div className="font-bold text-gray-800">
                      {r.primer_nombre} {r.segundo_nombre} {r.primer_apellido} {r.segundo_apellido}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 space-x-3">
                      {r.codigo_estudiante && <span className="font-mono">{r.codigo_estudiante}</span>}
                      {r.cui && <span className="font-mono">CUI: {r.cui}</span>}
                      {r.cui_pendiente && <span className="text-orange-500">CUI pendiente</span>}
                    </div>
                    {r.ultima_etapa && (
                      <div className="text-xs text-blue-600 mt-1">
                        📚 Última etapa: <b>{r.ultima_etapa.nombre}</b>
                      </div>
                    )}
                    {r.inscripcion_activa && (
                      <div className="text-xs text-orange-500">
                        ⚠ Ya inscrito en: {r.inscripcion_activa.etapa?.nombre}
                      </div>
                    )}
                  </div>
                  <button className="btn btn-p btn-sm ml-3 shrink-0" onClick={() => abrirModal(r)}>
                    ➕ Inscribir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal inscribir */}
      {modalOpen && estudianteSel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">➕ Inscribir en nueva etapa</h3>
              <button onClick={() => setModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <div className="font-bold text-blue-700">Estudiante</div>
                <div className="text-sm mt-1">
                  {estudianteSel.primer_nombre} {estudianteSel.primer_apellido}
                </div>
                {estudianteSel.codigo_estudiante && (
                  <div className="text-xs text-gray-500 font-mono">{estudianteSel.codigo_estudiante}</div>
                )}
                {estudianteSel.ultima_etapa && (
                  <div className="text-xs text-blue-600 mt-1">
                    Última etapa: <b>{estudianteSel.ultima_etapa.nombre}</b>
                  </div>
                )}
              </div>

              <div className="fg">
                <label className="lbl">Nueva etapa *</label>
                <select className="inp" value={etapaId}
                  onChange={e => setEtapaId(e.target.value)}>
                  <option value="">— Seleccionar etapa —</option>
                  {etapas.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>

              {miPerfil?.sede && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                  🏫 Se inscribirá en: <strong>{miPerfil.sede.nombre ?? 'tu sede'}</strong>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end gap-2">
              <button className="btn btn-g" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn btn-p" onClick={inscribir}
                disabled={inscribiendo || !etapaId}>
                {inscribiendo ? '⏳ Inscribiendo...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
