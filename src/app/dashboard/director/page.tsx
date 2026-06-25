// CÓDIGO PARA AGREGAR A: src/app/dashboard/director/page.tsx
// FIX #8: Modal con información completa de técnico

// AGREGAR ESTOS STATES AL INICIO DEL COMPONENTE:
// const [modalTecnico, setModalTecnico] = useState(false)
// const [tecnicoSeleccionado, setTecnicoSeleccionado] = useState<any>(null)

// REEMPLAZAR LA SECCIÓN DE TÉCNICOS CON ESTO:

<div className="card">
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-lg">👨‍🏫 Técnicos ({tecnicos.length})</h3>
  </div>

  {tecnicos.length === 0 ? (
    <div className="text-center py-8 text-gray-400">
      <div className="text-2xl mb-2">👨‍🏫</div>
      Sin técnicos asignados
    </div>
  ) : (
    <div className="space-y-2">
      {tecnicos.map((t: any) => (
        <div
          key={t.id}
          className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-transparent border-l-4 border-blue-500 rounded hover:shadow-md transition-shadow"
        >
          <div className="flex-1">
            <div className="font-bold text-sm">
              {t.primer_nombre} {t.segundo_nombre || ''} {t.primer_apellido}{' '}
              {t.segundo_apellido || ''}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              <span className="font-mono">{t.codigo_tecnico}</span> • {t.telefono}
            </div>
          </div>
          <button
            className="btn btn-p btn-sm"
            onClick={() => {
              setTecnicoSeleccionado(t)
              setModalTecnico(true)
            }}
            title="Ver información completa"
          >
            ℹ️ Completo
          </button>
        </div>
      ))}
    </div>
  )}
</div>

{/* Modal información técnico completa */}
{modalTecnico && tecnicoSeleccionado && (
  <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div className="sticky top-0 px-6 py-4 border-b bg-white flex justify-between items-center">
        <h3 className="font-bold text-lg">👨‍🏫 Información Técnico</h3>
        <button
          onClick={() => setModalTecnico(false)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl"
        >
          ×
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Encabezado */}
        <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg text-white">
          <div className="text-lg font-bold">
            {tecnicoSeleccionado.primer_nombre} {tecnicoSeleccionado.segundo_nombre || ''}{' '}
            {tecnicoSeleccionado.primer_apellido} {tecnicoSeleccionado.segundo_apellido || ''}
          </div>
          <div className="text-xs text-blue-100 mt-1">
            Código: {tecnicoSeleccionado.codigo_tecnico}
          </div>
        </div>

        {/* Información Personal */}
        <div>
          <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Información Personal</div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs font-bold text-gray-500">Teléfono</div>
              <div className="font-mono">{tecnicoSeleccionado.telefono || '—'}</div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500">Email</div>
              <div className="font-mono text-xs">
                {tecnicoSeleccionado.usuario?.correo || '—'}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500">Estado</div>
              <div>
                <span
                  className={`badge text-xs ${tecnicoSeleccionado.activo ? 'badge-green' : 'badge-red'}`}
                >
                  {tecnicoSeleccionado.activo ? '✅ Activo' : '❌ Inactivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Asignaciones */}
        <div className="border-t pt-4">
          <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Asignaciones</div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sedes a cargo:</span>
              <span className="font-bold">{tecnicoSeleccionado.sedes?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Estudiantes asignados:</span>
              <span className="font-bold">—</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Escalas asignadas:</span>
              <span className="font-bold">—</span>
            </div>
          </div>
        </div>

        {/* Sedes */}
        {tecnicoSeleccionado.sedes && tecnicoSeleccionado.sedes.length > 0 && (
          <div className="border-t pt-4">
            <div className="font-bold text-sm text-gray-700 mb-3 uppercase">Sedes</div>
            <div className="space-y-2">
              {tecnicoSeleccionado.sedes.map((s: any) => (
                <div
                  key={s.id}
                  className="p-2 bg-gray-50 rounded border-l-2 border-blue-400 text-sm"
                >
                  <div className="font-semibold">{s.nombre}</div>
                  <div className="text-xs text-gray-500">{s.municipio?.nombre}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Registro */}
        <div className="border-t pt-4 text-xs text-gray-500">
          <div>
            Creado:{' '}
            {tecnicoSeleccionado.created_at
              ? new Date(tecnicoSeleccionado.created_at).toLocaleDateString()
              : '—'}
          </div>
          <div>
            Último acceso:{' '}
            {tecnicoSeleccionado.usuario?.ultimo_acceso
              ? new Date(tecnicoSeleccionado.usuario.ultimo_acceso).toLocaleDateString()
              : 'Nunca'}
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-end">
        <button className="btn btn-g" onClick={() => setModalTecnico(false)}>
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}
