// CÓDIGO PARA AGREGAR A: src/app/dashboard/admin/usuarios/page.tsx
// FIX #7: Tabla de estudiantes inscritos con botón "Ver detalles"
// AGREGAR ESTOS STATES AL INICIO DEL COMPONENTE:

// const [modalDetallesEstudiante, setModalDetallesEstudiante] = useState(false)
// const [detallesEstudiante, setDetallesEstudiante] = useState<any>(null)
// const [estudiantes, setEstudiantes] = useState<any[]>([])
// const [loadingEstudiantes, setLoadingEstudiantes] = useState(false)

// AGREGAR ESTA FUNCIÓN DESPUÉS DE cargar():

const cargarEstudiantes = async () => {
  setLoadingEstudiantes(true)
  const res = await fetch('/api/inscripciones')
  const data = await res.json()
  setEstudiantes(Array.isArray(data) ? data : [])
  setLoadingEstudiantes(false)
}

// AGREGAR EN useEffect AL FINAL:
// useEffect(() => {
//   cargarEstudiantes()
// }, [])

// AGREGAR ESTA SECCIÓN EN EL RETORNO (después de la tabla de usuarios):

<div className="card mt-8">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-lg">👨‍🎓 Estudiantes Inscritos</h3>
    <button className="btn btn-p btn-sm" onClick={cargarEstudiantes}>
      🔄 Recargar
    </button>
  </div>

  {loadingEstudiantes ? (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  ) : estudiantes.length === 0 ? (
    <div className="text-center py-12 text-gray-400">
      <div className="text-4xl mb-2">👨‍🎓</div>
      Sin estudiantes inscritos
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gradient-to-r from-blue-700 to-blue-800 text-white">
            <th className="px-3 py-2 text-left font-bold">Código</th>
            <th className="px-3 py-2 text-left font-bold">Nombre Completo</th>
            <th className="px-3 py-2 text-left font-bold">CUI</th>
            <th className="px-3 py-2 text-left font-bold">Etapa</th>
            <th className="px-3 py-2 text-left font-bold">Técnico</th>
            <th className="px-3 py-2 text-left font-bold">Sede</th>
            <th className="px-3 py-2 text-left font-bold">Estado</th>
            <th className="px-3 py-2 text-center font-bold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {estudiantes.map((est: any, idx: number) => (
            <tr
              key={est.id}
              className={`border-b hover:bg-blue-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/20'}`}
            >
              <td className="px-3 py-2 font-mono text-xs font-bold">
                {est.estudiante?.codigo_estudiante}
              </td>
              <td className="px-3 py-2 font-semibold">
                {est.estudiante?.primer_nombre} {est.estudiante?.segundo_nombre || ''}{' '}
                {est.estudiante?.primer_apellido} {est.estudiante?.segundo_apellido || ''}
              </td>
              <td className="px-3 py-2 font-mono">{est.estudiante?.cui}</td>
              <td className="px-3 py-2">{est.etapa?.nombre || '—'}</td>
              <td className="px-3 py-2 text-sm">
                {est.tecnico?.primer_nombre} {est.tecnico?.primer_apellido}
              </td>
              <td className="px-3 py-2 text-sm">{est.sede?.nombre || '—'}</td>
              <td className="px-3 py-2">
                <span
                  className={`badge text-xs ${
                    est.estado === 'en_curso'
                      ? 'badge-green'
                      : est.estado === 'aprobado'
                        ? 'badge-blue'
                        : 'badge-gray'
                  }`}
                >
                  {est.estado}
                </span>
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  className="btn btn-p btn-sm"
                  onClick={() => {
                    setDetallesEstudiante(est.estudiante)
                    setModalDetallesEstudiante(true)
                  }}
                  title="Ver detalles completos"
                >
                  👁️ Detalles
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )}
</div>

{/* Modal detalles estudiante */}
{modalDetallesEstudiante && detallesEstudiante && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h3 className="font-bold text-lg">📋 Detalles del Estudiante</h3>
        <button
          onClick={() => setModalDetallesEstudiante(false)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-4 space-y-3">
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Código</div>
          <div className="font-mono text-sm">{detallesEstudiante.codigo_estudiante}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">Primer Nombre</div>
            <div className="text-sm">{detallesEstudiante.primer_nombre}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">Segundo Nombre</div>
            <div className="text-sm">{detallesEstudiante.segundo_nombre || '—'}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">Primer Apellido</div>
            <div className="text-sm">{detallesEstudiante.primer_apellido}</div>
          </div>
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">Segundo Apellido</div>
            <div className="text-sm">{detallesEstudiante.segundo_apellido || '—'}</div>
          </div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">CUI</div>
          <div className="font-mono text-sm">{detallesEstudiante.cui}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Teléfono</div>
          <div className="text-sm">{detallesEstudiante.telefono || '—'}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Email</div>
          <div className="text-sm font-mono text-xs">{detallesEstudiante.correo || '—'}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Fecha Nacimiento</div>
          <div className="text-sm">{detallesEstudiante.fecha_nacimiento || '—'}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Municipio</div>
          <div className="text-sm">{detallesEstudiante.municipio_id || '—'}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-gray-500 uppercase">Dirección</div>
          <div className="text-sm">{detallesEstudiante.direccion || '—'}</div>
        </div>
      </div>

      <div className="px-6 py-4 border-t flex justify-end bg-gray-50 rounded-b-2xl">
        <button
          className="btn btn-g"
          onClick={() => setModalDetallesEstudiante(false)}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}
