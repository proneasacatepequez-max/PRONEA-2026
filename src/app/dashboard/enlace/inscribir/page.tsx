// src/app/dashboard/enlace/inscribir/page.tsx
// FIX #6: Crear página de inscripción de estudiantes para enlace
'use client'
import { useState, useEffect } from 'react'

export default function EnlaceInscribirPage() {
  const [estudiantes, setEstudiantes] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [etapas, setEtapas] = useState<any[]>([])
  const [modalInscribir, setModalInscribir] = useState(false)
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState<any>(null)
  const [form, setForm] = useState({
    etapa_id: '',
  })
  const [inscribiendo, setInscribiendo] = useState(false)

  const flash = (m: string) => {
    setMsg(m)
    setTimeout(() => setMsg(''), 4000)
  }

  // Cargar etapas
  useEffect(() => {
    fetch('/api/etapas')
      .then(r => r.json())
      .then(d => setEtapas(Array.isArray(d) ? d : []))
      .catch(() => setEtapas([]))
  }, [])

  // Buscar estudiantes
  const buscarEstudiantes = async () => {
    if (!busqueda.trim()) {
      setEstudiantes([])
      return
    }

    setLoading(true)
    const params = new URLSearchParams()
    params.set('busqueda', busqueda)

    const res = await fetch(`/api/estudiantes?${params.toString()}`)
    const d = await res.json()
    setEstudiantes(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  // Inscribir estudiante
  const inscribir = async () => {
    if (!estudianteSeleccionado || !form.etapa_id) {
      flash('❌ Selecciona estudiante y etapa')
      return
    }

    setInscribiendo(true)
    const res = await fetch('/api/inscripciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estudiante_id: estudianteSeleccionado.id,
        etapa_id: parseInt(form.etapa_id),
      }),
    })

    const d = await res.json()

    if (res.ok) {
      flash('✅ Estudiante inscrito correctamente')
      setModalInscribir(false)
      setEstudianteSeleccionado(null)
      setForm({ etapa_id: '' })
      setBusqueda('')
      await buscarEstudiantes()
    } else {
      flash('❌ ' + (d.error ?? 'Error al inscribir'))
    }
    setInscribiendo(false)
  }

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">➕ Inscribir Estudiante</div>
          <div className="text-xs text-gray-400">Busca y registra nuevos estudiantes en tu sede</div>
        </div>
      </header>

      <div className="pc">
        {msg && <div className={`alert mb-4 ${msg.startsWith('✅') ? 'al-s' : 'al-e'}`}>{msg}</div>}

        <div className="card">
          <div className="space-y-4">
            <div>
              <h3 className="font-bold mb-3">🔍 Buscar Estudiante</h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="inp flex-1"
                  placeholder="Nombre, CUI o código..."
                  value={busqueda}
                  onChange={e => setBusqueda(e.target.value)}
                  onKeyUp={() => buscarEstudiantes()}
                />
                <button className="btn btn-p" onClick={buscarEstudiantes} disabled={loading}>
                  {loading ? '⏳' : '🔍'} Buscar
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : estudiantes.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🔍</div>
                {busqueda ? '❌ Sin resultados' : 'Busca un estudiante para empezar'}
              </div>
            ) : (
              <div>
                <h3 className="font-bold mb-3">📋 Resultados ({estudiantes.length})</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-blue-50">
                        <th className="px-3 py-2 text-left font-bold">Nombre</th>
                        <th className="px-3 py-2 text-left font-bold">CUI</th>
                        <th className="px-3 py-2 text-left font-bold">Teléfono</th>
                        <th className="px-3 py-2 text-left font-bold">Código</th>
                        <th className="px-3 py-2 text-center font-bold">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estudiantes.map((est: any) => (
                        <tr key={est.id} className="border-b hover:bg-blue-50">
                          <td className="px-3 py-2 font-semibold">
                            {est.primer_nombre} {est.primer_apellido}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{est.cui}</td>
                          <td className="px-3 py-2">{est.telefono || '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-500">{est.codigo_estudiante}</td>
                          <td className="px-3 py-2 text-center">
                            <button
                              className="btn btn-p btn-sm"
                              onClick={() => {
                                setEstudianteSeleccionado(est)
                                setModalInscribir(true)
                              }}
                            >
                              ➕ Inscribir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal inscribir */}
      {modalInscribir && estudianteSeleccionado && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold text-base">➕ Inscribir Estudiante</h3>
              <button
                onClick={() => {
                  setModalInscribir(false)
                  setEstudianteSeleccionado(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="p-3 bg-blue-50 rounded">
                <div className="font-bold text-blue-700">Estudiante</div>
                <div className="text-sm mt-1">{estudianteSeleccionado.primer_nombre} {estudianteSeleccionado.primer_apellido}</div>
                <div className="text-xs text-gray-500 font-mono">{estudianteSeleccionado.cui}</div>
              </div>

              <div className="fg">
                <label className="lbl">Etapa *</label>
                <select
                  className="inp"
                  value={form.etapa_id}
                  onChange={e => setForm(p => ({ ...p, etapa_id: e.target.value }))}
                >
                  <option value="">— Seleccionar etapa —</option>
                  {etapas.map((e: any) => (
                    <option key={e.id} value={e.id}>
                      {e.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-2xl">
              <button
                className="btn btn-g"
                onClick={() => {
                  setModalInscribir(false)
                  setEstudianteSeleccionado(null)
                }}
              >
                Cancelar
              </button>
              <button
                className="btn btn-p"
                onClick={inscribir}
                disabled={inscribiendo || !form.etapa_id}
              >
                {inscribiendo ? '⏳ Inscribiendo...' : '✓ Inscribir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
