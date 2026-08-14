// src/app/dashboard/admin/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin, fetchAllRows } from '@/lib/supabase'
import Link from 'next/link'

export default async function AdminDashboard() {
  const s = await getSession()
  if (!s || s.rol !== 'administrador') redirect('/login')

  // 📊 Obtener estadísticas generales
  const [
    { count: totalEst },
    { count: totalTec },
    { count: gruposAbiertos },
    { count: pendientesConf },
  ] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*', { count: 'exact', head: true }).eq('ciclo_escolar', 2026).eq('estado', 'en_curso'),
    supabaseAdmin.from('tecnicos').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabaseAdmin.from('grupos_sireex').select('*', { count: 'exact', head: true }).eq('estado', 'abierto').eq('ciclo_escolar', 2026),
    supabaseAdmin.from('autorizaciones_director').select('*', { count: 'exact', head: true }).is('autorizado_por_admin', null).eq('activo', true),
  ])

  // 📊 OBTENER INSCRIPCIONES CON ETAPA Y ESTUDIANTE - SIMPLIFICADO
  // Paginado con fetchAllRows: PostgREST limita a 1000 filas por consulta
  const inscripcionesRaw = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('inscripciones')
      .select(`
        id,
        version_libro,
        estado,
        ciclo_escolar,
        etapa_id,
        estudiante_id,
        sede_id,
        tecnico_id
      `)
      .eq('ciclo_escolar', 2026)
      .eq('estado', 'en_curso')
      .range(from, to) as any
  )

  // 📊 OBTENER ETAPAS POR SEPARADO
  const { data: etapasData } = await supabaseAdmin
    .from('etapas')
    .select('id, nombre')

  // 📊 OBTENER ESTUDIANTES POR SEPARADO (solo genero)
  // Paginado: la tabla estudiantes crecerá con el tiempo y puede superar 1000
  const estudiantesData = await fetchAllRows<any>((from, to) =>
    supabaseAdmin.from('estudiantes').select('id, genero').range(from, to) as any
  )

  // 📊 Obtener datos para estadísticas por sede
  const sedesData = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('inscripciones')
      .select(`
        sede_id,
        sedes!inner (id, nombre)
      `)
      .eq('ciclo_escolar', 2026)
      .eq('estado', 'en_curso')
      .range(from, to) as any
  )

  // 📊 Obtener todos los técnicos con sus estadísticas
  const tecnicosData = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('tecnicos')
      .select(`
        id,
        primer_nombre,
        primer_apellido,
        codigo_tecnico,
        especialidad,
        activo,
        usuario_id
      `)
      .eq('activo', true)
      .range(from, to) as any
  )

  // 📊 Obtener conteo de estudiantes por técnico
  const estudiantesPorTecnico = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('inscripciones')
      .select('tecnico_id')
      .eq('ciclo_escolar', 2026)
      .eq('estado', 'en_curso')
      .range(from, to) as any
  )

  // 📊 Obtener sedes por técnico
  const sedesPorTecnico = await fetchAllRows<any>((from, to) =>
    supabaseAdmin.from('tecnico_sedes').select('tecnico_id').range(from, to) as any
  )

  // 📊 Obtener enlaces por técnico
  const enlacesPorTecnico = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('enlaces_institucionales')
      .select('tecnico_id')
      .eq('activo', true)
      .range(from, to) as any
  )

  // 📊 Obtener versión de libros
  const porVersion = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('inscripciones')
      .select('version_libro')
      .eq('ciclo_escolar', 2026)
      .eq('estado', 'en_curso')
      .range(from, to) as any
  )
  
  const vc = { nuevo: 0, viejo: 0 }
  porVersion?.forEach((i: any) => { vc[i.version_libro as 'nuevo' | 'viejo']++ })

  // 📊 Obtener permisos globales
  const { data: permisosGlobales } = await supabaseAdmin
    .from('permisos_globales')
    .select('permiso,activo,descripcion')
    .order('permiso')

  // 📊 Obtener auditoría reciente
  const { data: auditoria } = await supabaseAdmin
    .from('auditoria')
    .select('id,accion,tabla_afectada,creado_en')
    .order('creado_en', { ascending: false })
    .limit(6)

  // 📊 Obtener enlaces institucionales con sus sedes
  const enlacesData = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('enlaces_institucionales')
      .select(`
        id,
        primer_nombre,
        primer_apellido,
        cargo,
        telefono,
        correo_personal,
        sede_id,
        tecnico_id,
        activo,
        sedes!inner (id, nombre, municipio_id),
        municipios!inner (id, nombre)
      `)
      .eq('activo', true)
      .range(from, to) as any
  )

  // 📊 Contar estudiantes por enlace (sede)
  const estudiantesPorEnlace = await fetchAllRows<any>((from, to) =>
    supabaseAdmin
      .from('inscripciones')
      .select('sede_id')
      .eq('ciclo_escolar', 2026)
      .eq('estado', 'en_curso')
      .range(from, to) as any
  )

  const hoy = new Date().toLocaleDateString('es-GT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  // 📊 CREAR MAPAS PARA BÚSQUEDA RÁPIDA
  const etapasMap = new Map()
  etapasData?.forEach((e: any) => { etapasMap.set(e.id, e.nombre) })

  const estudiantesMap = new Map()
  estudiantesData?.forEach((e: any) => { estudiantesMap.set(e.id, e.genero) })

  // 📊 CALCULAR ESTADÍSTICAS DETALLADAS POR ETAPA
  const porEtapaDetalle = new Map<string, {
    nombre: string
    total: number
    masculino: number
    femenino: number
    otro: number
    versionNuevo: number
    versionViejo: number
    enCurso: number
    completado: number
  }>()

  let totalMasculino = 0
  let totalFemenino = 0
  let totalOtro = 0
  let totalNuevo = 0
  let totalViejo = 0
  let totalEnCurso = 0
  let totalCompletado = 0

  for (const insc of (inscripcionesRaw ?? [])) {
    const nombreEtapa = etapasMap.get(insc.etapa_id) ?? 'Sin etapa'
    
    if (!porEtapaDetalle.has(nombreEtapa)) {
      porEtapaDetalle.set(nombreEtapa, {
        nombre: nombreEtapa,
        total: 0,
        masculino: 0,
        femenino: 0,
        otro: 0,
        versionNuevo: 0,
        versionViejo: 0,
        enCurso: 0,
        completado: 0
      })
    }
    
    const fila = porEtapaDetalle.get(nombreEtapa)!
    fila.total++

    const genero = (estudiantesMap.get(insc.estudiante_id) ?? '').toLowerCase()
    if (genero === 'masculino') {
      fila.masculino++
      totalMasculino++
    } else if (genero === 'femenino') {
      fila.femenino++
      totalFemenino++
    } else {
      fila.otro++
      totalOtro++
    }

    if (insc.version_libro === 'nuevo') {
      fila.versionNuevo++
      totalNuevo++
    } else {
      fila.versionViejo++
      totalViejo++
    }

    if (insc.estado === 'en_curso') {
      fila.enCurso++
      totalEnCurso++
    } else if (insc.estado === 'completado') {
      fila.completado++
      totalCompletado++
    }
  }

  const estadisticasEtapa = {
    porEtapa: Array.from(porEtapaDetalle.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    totales: {
      total: totalEst,
      masculino: totalMasculino,
      femenino: totalFemenino,
      otro: totalOtro,
      nuevo: totalNuevo,
      viejo: totalViejo,
      enCurso: totalEnCurso,
      completado: totalCompletado
    }
  }

  // 📊 CALCULAR ESTADÍSTICAS POR SEDE (NIVEL GLOBAL)
  const porSedeDetalle = new Map<string, number>()
  for (const item of (sedesData ?? [])) {
    const nombreSede = (item.sedes as any)?.nombre ?? 'Sin sede'
    porSedeDetalle.set(nombreSede, (porSedeDetalle.get(nombreSede) || 0) + 1)
  }

  const estadisticasSede = Array.from(porSedeDetalle.entries())
    .map(([nombre, total]) => ({ nombre, total }))
    .sort((a, b) => b.total - a.total)

  // 📊 CALCULAR ESTADÍSTICAS POR TÉCNICO
  const conteoEstudiantes = new Map<string, number>()
  for (const item of (estudiantesPorTecnico ?? [])) {
    const id = item.tecnico_id
    conteoEstudiantes.set(id, (conteoEstudiantes.get(id) || 0) + 1)
  }

  const conteoSedes = new Map<string, number>()
  for (const item of (sedesPorTecnico ?? [])) {
    const id = item.tecnico_id
    conteoSedes.set(id, (conteoSedes.get(id) || 0) + 1)
  }

  const conteoEnlaces = new Map<string, number>()
  for (const item of (enlacesPorTecnico ?? [])) {
    const id = item.tecnico_id
    conteoEnlaces.set(id, (conteoEnlaces.get(id) || 0) + 1)
  }

  const tecnicosEstadisticas = (tecnicosData ?? [])
    .map((t: any) => ({
      nombre: `${t.primer_nombre} ${t.primer_apellido || ''}`.trim(),
      codigo: t.codigo_tecnico || '—',
      especialidad: t.especialidad || '—',
      estudiantes: conteoEstudiantes.get(t.id) || 0,
      sedes: conteoSedes.get(t.id) || 0,
      enlaces: conteoEnlaces.get(t.id) || 0,
      id: t.id
    }))
    .sort((a, b) => b.estudiantes - a.estudiantes)

  // 📊 CALCULAR ESTADÍSTICAS POR ENLACE (SEDE)
  const conteoEstudiantesEnlace = new Map<string, number>()
  for (const item of (estudiantesPorEnlace ?? [])) {
    const id = item.sede_id
    conteoEstudiantesEnlace.set(id, (conteoEstudiantesEnlace.get(id) || 0) + 1)
  }

  const enlacesEstadisticas = (enlacesData ?? [])
    .map((e: any) => ({
      nombre: `${e.primer_nombre} ${e.primer_apellido || ''}`.trim(),
      cargo: e.cargo || '—',
      sede: (e.sedes as any)?.nombre || '—',
      municipio: (e.municipios as any)?.nombre || '—',
      correo: e.correo_personal || '—',
      telefono: e.telefono || '—',
      estudiantes: conteoEstudiantesEnlace.get(e.sede_id) || 0,
      estado: e.activo ? 'Activo' : 'Inactivo'
    }))
    .sort((a, b) => b.estudiantes - a.estudiantes)

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">Dashboard Administrador</div>
        <div className="text-sm text-gray-400">{hoy}</div>
      </header>
      <div className="pc">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="sc blue">
            <div className="text-3xl mb-1">🎓</div>
            <div className="text-3xl font-extrabold text-gray-800">{totalEst ?? 0}</div>
            <div className="text-sm text-gray-500 font-semibold">Estudiantes activos</div>
          </div>
          <div className="sc green">
            <div className="text-3xl mb-1">👨‍🏫</div>
            <div className="text-3xl font-extrabold text-gray-800">{totalTec ?? 0}</div>
            <div className="text-sm text-gray-500 font-semibold">Técnicos activos</div>
          </div>
          <div className="sc yellow">
            <div className="text-3xl mb-1">📤</div>
            <div className="text-3xl font-extrabold text-gray-800">{gruposAbiertos ?? 0}</div>
            <div className="text-sm text-gray-500 font-semibold">Grupos SIREEX abiertos</div>
          </div>
          <div className={`sc ${(pendientesConf ?? 0) > 0 ? 'red' : 'green'}`}>
            <div className="text-3xl mb-1">⏳</div>
            <div className="text-3xl font-extrabold text-gray-800">{pendientesConf ?? 0}</div>
            <div className="text-sm text-gray-500 font-semibold">Autorizaciones pendientes</div>
          </div>
        </div>

        {/* Alerta autorizaciones pendientes */}
        {(pendientesConf ?? 0) > 0 && (
          <div className="alert al-w mb-5">
            <div>
              <b>⚠️ Hay {pendientesConf} autorización(es) de director esperando tu confirmación.</b>
              <span className="ml-2 text-sm">Sin tu confirmación, el enlace no puede ejecutar la acción.</span>
              <Link href="/dashboard/admin/autorizaciones" className="ml-2 underline font-bold">Revisar ahora →</Link>
            </div>
          </div>
        )}

        {/* 📊 TABLA 1: DISTRIBUCIÓN POR ETAPA */}
        {inscripcionesRaw && inscripcionesRaw.length > 0 && (
          <div className="card mb-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="card-title text-sm">📊 Distribución por etapa</div>
                <div className="text-xs text-gray-400">
                  {totalEst} estudiantes · {estadisticasEtapa.porEtapa.length} etapas
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-blue-600 font-bold">♂ {estadisticasEtapa.totales.masculino}</span>
                <span className="text-pink-600 font-bold">♀ {estadisticasEtapa.totales.femenino}</span>
                <span className="text-gray-400">📗 {estadisticasEtapa.totales.nuevo} · 📙 {estadisticasEtapa.totales.viejo}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 text-xs font-bold uppercase">Etapa</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Total</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center text-blue-600">♂ H</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center text-pink-600">♀ M</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">📗 Nuevo</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">📙 Viejo</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">✅ En curso</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">✔️ Completado</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticasEtapa.porEtapa.map((fila) => (
                    <tr key={fila.nombre} className="border-b hover:bg-gray-50">
                      <td className="px-3 py-2 font-semibold">{fila.nombre}</td>
                      <td className="px-3 py-2 text-center font-bold">{fila.total}</td>
                      <td className="px-3 py-2 text-center text-blue-600 font-bold">{fila.masculino}</td>
                      <td className="px-3 py-2 text-center text-pink-600 font-bold">{fila.femenino}</td>
                      <td className="px-3 py-2 text-center text-blue-600">{fila.versionNuevo}</td>
                      <td className="px-3 py-2 text-center text-orange-600">{fila.versionViejo}</td>
                      <td className="px-3 py-2 text-center text-green-600">{fila.enCurso}</td>
                      <td className="px-3 py-2 text-center text-blue-600">{fila.completado}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-3 py-2 text-blue-800">TOTAL</td>
                    <td className="px-3 py-2 text-center text-blue-800">{totalEst}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{estadisticasEtapa.totales.masculino}</td>
                    <td className="px-3 py-2 text-center text-pink-800">{estadisticasEtapa.totales.femenino}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{estadisticasEtapa.totales.nuevo}</td>
                    <td className="px-3 py-2 text-center text-orange-800">{estadisticasEtapa.totales.viejo}</td>
                    <td className="px-3 py-2 text-center text-green-800">{estadisticasEtapa.totales.enCurso}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{estadisticasEtapa.totales.completado}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📊 TABLA 2: DISTRIBUCIÓN POR SEDE */}
        {estadisticasSede.length > 0 && (
          <div className="card mb-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="card-title text-sm">🏫 Distribución por sede</div>
                <div className="text-xs text-gray-400">
                  {estadisticasSede.length} sedes · {totalEst} estudiantes
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 text-xs font-bold uppercase">Sede</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Estudiantes</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">%</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticasSede.map((sede, idx) => (
                    <tr key={sede.nombre} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2 font-semibold">{sede.nombre}</td>
                      <td className="px-3 py-2 text-center font-bold">{sede.total}</td>
                      <td className="px-3 py-2 text-center text-gray-500">
                        {totalEst > 0 
                          ? Math.round((sede.total / totalEst) * 100) 
                          : 0}%
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-3 py-2 text-blue-800">TOTAL</td>
                    <td className="px-3 py-2 text-center text-blue-800">{totalEst}</td>
                    <td className="px-3 py-2 text-center text-blue-800">100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📊 TABLA 3: TÉCNICOS Y SUS ESTADÍSTICAS */}
        {tecnicosEstadisticas.length > 0 && (
          <div className="card mb-5 overflow-hidden">
            <div className="card-title text-sm mb-3">👨‍🏫 Técnicos y sus estadísticas</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 text-xs font-bold uppercase">Nombre</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Código</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Especialidad</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Estudiantes</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Sedes</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Enlaces</th>
                  </tr>
                </thead>
                <tbody>
                  {tecnicosEstadisticas.map((tecnico, idx) => (
                    <tr key={tecnico.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2 font-semibold">{tecnico.nombre}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{tecnico.codigo}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{tecnico.especialidad}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-600">{tecnico.estudiantes}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{tecnico.sedes}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{tecnico.enlaces}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-3 py-2 text-blue-800">TOTAL</td>
                    <td className="px-3 py-2 text-blue-800" colSpan={2}>—</td>
                    <td className="px-3 py-2 text-center text-blue-800">{totalEst}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{sedesData?.length ?? 0}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{enlacesData?.length ?? 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 📊 TABLA 4: ENLACES INSTITUCIONALES */}
        {enlacesEstadisticas.length > 0 && (
          <div className="card mb-5 overflow-hidden">
            <div className="card-title text-sm mb-3">🔗 Enlaces institucionales y sus estadísticas</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="px-3 py-2 text-xs font-bold uppercase">Nombre</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Cargo</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Sede</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Municipio</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Correo</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase">Teléfono</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Estudiantes</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase text-center">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {enlacesEstadisticas.map((enlace, idx) => (
                    <tr key={idx} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                      <td className="px-3 py-2 font-semibold">{enlace.nombre}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{enlace.cargo}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{enlace.sede}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{enlace.municipio}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{enlace.correo}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{enlace.telefono}</td>
                      <td className="px-3 py-2 text-center font-bold text-blue-600">{enlace.estudiantes}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`badge text-xs ${enlace.estado === 'Activo' ? 'badge-green' : 'badge-gray'}`}>
                          {enlace.estado === 'Activo' ? '✅ Activo' : '❌ Inactivo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="px-3 py-2 text-blue-800">TOTAL</td>
                    <td className="px-3 py-2 text-blue-800" colSpan={5}>—</td>
                    <td className="px-3 py-2 text-center text-blue-800">{totalEst}</td>
                    <td className="px-3 py-2 text-center text-blue-800">{enlacesEstadisticas.filter(e => e.estado === 'Activo').length} Activos</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Permisos globales */}
          <div className="card">
            <div className="card-title">
              🔐 Permisos globales del sistema
              <Link href="/dashboard/admin/permisos" className="text-xs text-pronea-secondary hover:underline">Gestionar →</Link>
            </div>
            <div className="space-y-2">
              {(permisosGlobales ?? []).map((pg: any) => (
                <div key={pg.permiso} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-xs font-bold text-gray-700">{pg.permiso.replace(/_/g, ' ')}</div>
                    <div className="text-[10px] text-gray-400">{pg.descripcion?.substring(0, 60)}...</div>
                  </div>
                  <span className={`badge ${pg.activo ? 'badge-green' : 'badge-red'}`}>
                    {pg.activo ? '✅ Activo' : '🔴 Inactivo'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Versión de libros + accesos */}
          <div className="flex flex-col gap-4">
            <div className="card">
              <div className="card-title">📚 Versión de libro — Ciclo 2026</div>
              <div className="flex gap-3">
                <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                  <div className="text-3xl font-extrabold text-blue-700">{vc.nuevo}</div>
                  <div className="text-sm font-bold text-blue-600 mt-1">📗 Nuevo</div>
                  <div className="text-xs text-gray-400">
                    {(totalEst ?? 0) > 0 ? Math.round(vc.nuevo / (totalEst || 1) * 100) : 0}%
                  </div>
                </div>
                <div className="flex-1 bg-orange-50 rounded-xl p-3 text-center">
                  <div className="text-3xl font-extrabold text-orange-700">{vc.viejo}</div>
                  <div className="text-sm font-bold text-orange-600 mt-1">📙 Viejo</div>
                  <div className="text-xs text-orange-400">En transición</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-title">⚡ Módulos</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { href: '/dashboard/admin/permisos', icon: '🔐', label: 'Permisos' },
                  { href: '/dashboard/admin/autorizaciones', icon: '✅', label: 'Autorizaciones' },
                  { href: '/dashboard/admin/visibilidad', icon: '👁️', label: 'Visibilidad' },
                  { href: '/dashboard/admin/establecimiento', icon: '🏛️', label: 'Establecimiento' },
                  { href: '/dashboard/admin/libros', icon: '📚', label: 'Libros' },
                  { href: '/dashboard/admin/sireex', icon: '📤', label: 'SIREEX' },
                  { href: '/dashboard/admin/usuarios', icon: '👥', label: 'Usuarios' },
                  { href: '/dashboard/admin/configuracion', icon: '⚙️', label: 'Config' },
                ].map(({ href, icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-100 hover:border-pronea-secondary hover:bg-pronea-light transition-all text-xs font-semibold text-gray-700">
                    <span>{icon}</span><span>{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="card">
          <div className="card-title">
            🔔 Actividad reciente
            <Link href="/dashboard/admin/auditoria" className="text-xs text-pronea-secondary hover:underline">Ver todo →</Link>
          </div>
          <div className="space-y-1">
            {(auditoria ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center gap-2 py-1.5 text-sm border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full bg-pronea-secondary flex-shrink-0" />
                <div className="flex-1 font-semibold text-gray-700 truncate">{a.accion} — {a.tabla_afectada}</div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(a.creado_en).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
