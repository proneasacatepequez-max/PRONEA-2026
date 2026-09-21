'use client'
// src/app/dashboard/admin/estudiantes/page.tsx — NUEVA PÁGINA
// Administrador ve TODOS los estudiantes con tabla horizontal completa
import { useState, useEffect, useCallback } from 'react'
import * as XLSX from 'xlsx'

export default function AdminEstudiantesPage() {
  const [inscripciones, setInscripciones] = useState<any[]>([])
  const [loading,       setLoading]       = useState(true)
  const [buscar,        setBuscar]        = useState('')
  const [filtroEtapa,   setFiltroEtapa]   = useState('')
  const [filtroSede,    setFiltroSede]    = useState('')
  const [filtroTecnico, setFiltroTecnico] = useState('')
  const [filtroEstado,  setFiltroEstado]  = useState('')
  const [ciclo,         setCiclo]         = useState('2026')
  const [etapas,        setEtapas]        = useState<any[]>([])
  const [tecnicos,      setTecnicos]      = useState<any[]>([])
  const [sedes,         setSedes]         = useState<any[]>([])
  const [descargando,   setDescargando]   = useState(false)
  const [msg,           setMsg]           = useState('')
  const [modalEditarInsc, setModalEditarInsc] = useState<any>(null)
  const [formEditInsc,    setFormEditInsc]    = useState({ etapa_id: '', version_libro: 'nuevo' })
  const [guardandoInsc,   setGuardandoInsc]   = useState(false)
  const [eliminandoInsc,  setEliminandoInsc]  = useState(false)
  const [modalEst,      setModalEst]      = useState<any>(null)
  const [modalTipo,     setModalTipo]     = useState<'detalle'|'editar'>('detalle')
  const [formEst,       setFormEst]       = useState<any>({})
  const [savingEst,     setSavingEst]     = useState(false)
  const [editandoEstadoId, setEditandoEstadoId] = useState<string | null>(null)
  const [guardandoEstadoId, setGuardandoEstadoId] = useState<string | null>(null)
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set())
  const [estadoMasivo,  setEstadoMasivo]  = useState('completada')
  const [aplicandoMasivo, setAplicandoMasivo] = useState(false)

  // Estados válidos de una inscripción (enum estado_inscripcion en la BD)
  const ESTADOS_INSCRIPCION = [
    { value: 'en_curso',   label: '✅ En curso' },
    { value: 'completada', label: '✔️ Completada (etapa actual)' },
    { value: 'retirada',   label: '🚪 Retirada' },
    { value: 'suspendida', label: '⏸️ Suspendida' },
    { value: 'finalizada', label: '🏁 Finalizada (egresó de PRONEA)' },
  ]

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  const abrirEditarInsc = (insc: any) => {
    setFormEditInsc({
      etapa_id: String((insc.etapa as any)?.id ?? ''),
      version_libro: insc.version_libro ?? 'nuevo',
    })
    setModalEditarInsc(insc)
  }

  const guardarEditarInsc = async () => {
    if (!modalEditarInsc) return
    setGuardandoInsc(true)
    try {
      const res = await fetch('/api/inscripciones', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modalEditarInsc.id,
          etapa_id: parseInt(formEditInsc.etapa_id),
          version_libro: formEditInsc.version_libro,
        }),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al actualizar')); return }
      flash('✅ Etapa/versión actualizada correctamente')
      setModalEditarInsc(null)
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setGuardandoInsc(false) }
  }

  const eliminarInsc = async (insc: any) => {
    const e = insc.estudiante as any
    if (!confirm(`¿Eliminar por completo la inscripción de ${e?.primer_nombre} ${e?.primer_apellido} en esta etapa? Esta acción no se puede deshacer.`)) return
    setEliminandoInsc(true)
    try {
      const res = await fetch(`/api/inscripciones?id=${insc.id}`, { method: 'DELETE' })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al eliminar')); return }
      flash('✅ Inscripción eliminada')
      setModalEditarInsc(null)
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setEliminandoInsc(false) }
  }

  // ✏️ Cambiar manualmente el estado de una inscripción (ej. el resultado
  // final vino de otra fuente y no del registro de notas).
  const cambiarEstado = async (insc: any, nuevoEstado: string) => {
    if (nuevoEstado === insc.estado) { setEditandoEstadoId(null); return }
    setGuardandoEstadoId(insc.id)
    try {
      const res = await fetch('/api/inscripciones', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: insc.id, estado: nuevoEstado }),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al actualizar el estado')); return }
      flash('✅ Estado actualizado')
      setInscripciones(prev => prev.map(i => i.id === insc.id ? { ...i, estado: nuevoEstado } : i))
    } catch { flash('❌ Error de conexión') }
    finally { setGuardandoEstadoId(null); setEditandoEstadoId(null) }
  }

  // 🔄 Forzar la revisión del estado según las notas ya registradas (para
  // inscripciones cuyas notas quedaron completas antes de que existiera
  // el auto-completado, que solo se dispara al guardar una nota nueva).
  const recalcularEstado = async (insc: any) => {
    setGuardandoEstadoId(insc.id)
    try {
      const res = await fetch('/api/notas/calcular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inscripcion_id: insc.id }),
      })
      const d = await res.json()
      if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al recalcular')); return }
      if (d.inscripcion_completada) {
        flash(d.estado_final === 'finalizada'
          ? '🏁 ¡Programa finalizado! El estudiante egresó de PRONEA'
          : '🎓 ¡Estudiante marcado como completada!')
        setInscripciones(prev => prev.map(i => i.id === insc.id ? { ...i, estado: d.estado_final } : i))
      } else {
        flash('ℹ️ Aún faltan notas por registrar (o el estado ya no es "en curso")')
      }
    } catch { flash('❌ Error de conexión') }
    finally { setGuardandoEstadoId(null) }
  }

  const cargar = useCallback(async () => {
    setLoading(true)
    const [ins, et, se, tec] = await Promise.all([
      fetch(`/api/inscripciones?ciclo=${ciclo}&estado=todos`).then(r => r.json()).catch(() => ({ data:[] })),
      fetch('/api/etapas').then(r => r.json()).catch(() => []),
      fetch('/api/sedes').then(r => r.json()).catch(() => []),
      fetch('/api/mis-tecnicos').then(r => r.json()).catch(() => []),
    ])
    setInscripciones(ins.data ?? [])
    setEtapas(Array.isArray(et) ? et : [])
    setSedes(Array.isArray(se) ? se : [])
    setTecnicos(Array.isArray(tec) ? tec : [])
    setLoading(false)
  }, [ciclo])

  useEffect(() => { cargar() }, [cargar])

  const filtrados = inscripciones.filter(i => {
    const e   = i.estudiante as any
    const nom = `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.codigo_estudiante ?? ''} ${e?.cui ?? ''}`.toLowerCase()
    const tec = i.tecnico as any
    return (!buscar        || nom.includes(buscar.toLowerCase()))
        && (!filtroEtapa   || String((i.etapa as any)?.id) === filtroEtapa)
        && (!filtroSede    || (i.sede as any)?.id === filtroSede)
        && (!filtroTecnico || (i.tecnico as any)?.id === filtroTecnico)
        && (!filtroEstado  || i.estado === filtroEstado)
  })

  // 📊 Resumen rápido de estados, sobre lo que está filtrado ahora mismo
  const resumenEstados = filtrados.reduce((acc, i) => {
    if (i.estado === 'en_curso') acc.enCurso++
    else if (i.estado === 'completada') acc.completada++
    else acc.otros++
    return acc
  }, { enCurso: 0, completada: 0, otros: 0 })

  // ⚠️ Códigos MINEDUC provisionales (pendientes de asignar el código real)
  const esCodigoTemporal = (codigo?: string | null) => {
    if (!codigo) return true
    const c = codigo.toLowerCase()
    return c.startsWith('pendiente') || c.startsWith('pediente') || c.startsWith('temp') || c.startsWith('est-')
  }

  // ── Selección múltiple (respeta lo que está filtrado) ──────────────────
  const idsFiltrados = filtrados.map(i => i.id)
  const todosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every(id => seleccionados.has(id))

  const toggleSeleccion = (id: string) => {
    setSeleccionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSeleccionarTodos = () => {
    setSeleccionados(prev => {
      if (todosSeleccionados) {
        const next = new Set(prev)
        idsFiltrados.forEach(id => next.delete(id))
        return next
      }
      return new Set([...Array.from(prev), ...idsFiltrados])
    })
  }

  const aplicarEstadoMasivo = async () => {
    if (seleccionados.size === 0) return
    if (!confirm(`¿Cambiar el estado de ${seleccionados.size} estudiante(s) a "${ESTADOS_INSCRIPCION.find(o => o.value === estadoMasivo)?.label}"?`)) return
    setAplicandoMasivo(true)
    const idsArr = Array.from(seleccionados)
    const TANDA = 500
    let actualizados = 0, omitidos = 0, huboError = false
    try {
      for (let i = 0; i < idsArr.length; i += TANDA) {
        const res = await fetch('/api/inscripciones/lote', {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: idsArr.slice(i, i + TANDA), estado: estadoMasivo }),
        })
        const d = await res.json()
        if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al actualizar')); huboError = true; break }
        actualizados += d.actualizados ?? 0
        omitidos += d.omitidos ?? 0
      }
      if (!huboError) {
        flash(omitidos > 0
          ? `✅ ${actualizados} actualizados (${omitidos} omitidos, sin permiso)`
          : `✅ ${actualizados} actualizados`)
      }
      setSeleccionados(new Set())
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setAplicandoMasivo(false) }
  }

  const recalcularMasivo = async () => {
    if (seleccionados.size === 0) return
    setAplicandoMasivo(true)
    const idsArr = Array.from(seleccionados)
    const TANDA = 500
    let total = 0, completados = 0, errores = 0, huboError = false
    try {
      for (let i = 0; i < idsArr.length; i += TANDA) {
        const res = await fetch('/api/notas/calcular/lote', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inscripcion_ids: idsArr.slice(i, i + TANDA) }),
        })
        const d = await res.json()
        if (!res.ok) { flash('❌ ' + (d.error ?? 'Error al recalcular')); huboError = true; break }
        total += d.total ?? 0
        completados += d.completados ?? 0
        errores += d.errores ?? 0
      }
      if (!huboError) {
        flash(`🔄 ${total} revisados — ${completados} pasaron a completada/finalizada` + (errores > 0 ? ` (${errores} con error)` : ''))
      }
      setSeleccionados(new Set())
      cargar()
    } catch { flash('❌ Error de conexión') }
    finally { setAplicandoMasivo(false) }
  }

  const abrirEditar = (insc: any) => {
    const e = insc.estudiante as any
    setFormEst({
      id:                   e.id,
      codigo_estudiante:    e.codigo_estudiante    ?? '',
      cui:                  e.cui                  ?? '',
      primer_nombre:        e.primer_nombre        ?? '',
      segundo_nombre:       e.segundo_nombre       ?? '',
      primer_apellido:      e.primer_apellido      ?? '',
      segundo_apellido:     e.segundo_apellido     ?? '',
      telefono:             e.telefono             ?? '',
      telefono_alternativo: e.telefono_alternativo ?? '',
      correo:               e.correo               ?? '',
      fecha_nacimiento:     e.fecha_nacimiento     ?? '',
      genero:               e.genero               ?? '',
      direccion:            e.direccion            ?? '',
    })
    setModalEst(insc); setModalTipo('editar')
  }

  const guardarEdicion = async () => {
    if (!formEst.primer_nombre || !formEst.primer_apellido) {
      flash('❌ Nombre y apellido requeridos'); return
    }
    setSavingEst(true)
    const res = await fetch(`/api/estudiantes/${formEst.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formEst),
    })
    const d = await res.json()
    flash(res.ok ? '✅ ' + (d.mensaje ?? 'Actualizado') : '❌ ' + (d.error ?? 'Error'))
    if (res.ok) { setModalEst(null); cargar() }
    setSavingEst(false)
  }

  const descargarExcel = () => {
    if (filtrados.length === 0) { flash('❌ No hay datos para exportar con estos filtros'); return }
    setDescargando(true)
    try {
      const filas = filtrados.map((insc: any, idx: number) => {
        const e  = insc.estudiante as any
        const fn = e?.fecha_nacimiento
        return {
          'No.':              idx + 1,
          'Código MINEDUC':   e?.codigo_estudiante ?? '',
          'CUI':              e?.cui ?? '',
          'Primer Apellido':  e?.primer_apellido ?? '',
          'Segundo Apellido': e?.segundo_apellido ?? '',
          'Primer Nombre':    e?.primer_nombre ?? '',
          'Segundo Nombre':   e?.segundo_nombre ?? '',
          'Fecha Nacimiento': fn ?? '',
          'Edad':             fn ? new Date().getFullYear() - new Date(fn).getFullYear() : '',
          'Género':           e?.genero ?? '',
          'Teléfono':         e?.telefono ?? '',
          'Correo':           e?.correo ?? '',
          'Etapa':            (insc.etapa as any)?.nombre ?? '',
          'Versión Libro':    insc.version_libro ?? '',
          'Sede':             (insc.sede as any)?.nombre ?? '',
          'Técnico':          `${(insc.tecnico as any)?.primer_nombre ?? ''} ${(insc.tecnico as any)?.primer_apellido ?? ''}`.trim(),
          'Estado':           insc.estado ?? '',
          'Con Ajuste':       insc.tiene_ajuste_discapacidad ? 'Sí' : 'No',
          'Código temporal':  esCodigoTemporal(e?.codigo_estudiante) ? 'Sí — revisar' : '',
        }
      })

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(filas)
      ws['!cols'] = [
        {wch:5},{wch:16},{wch:14},{wch:18},{wch:18},{wch:16},{wch:16},
        {wch:14},{wch:6},{wch:10},{wch:12},{wch:26},{wch:20},{wch:12},
        {wch:22},{wch:26},{wch:14},{wch:10},{wch:14},
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes')

      const etapaNombre  = filtroEtapa   ? etapas.find((e: any) => String(e.id) === filtroEtapa)?.nombre : null
      const sedeNombre   = filtroSede    ? sedes.find((s: any) => s.id === filtroSede)?.nombre : null
      const tec          = filtroTecnico ? tecnicos.find((t: any) => t.id === filtroTecnico) : null
      const tecNombre    = tec ? `${tec.primer_nombre} ${tec.primer_apellido}` : null
      const estadoNombre = filtroEstado  ? ESTADOS_INSCRIPCION.find(o => o.value === filtroEstado)?.label : null
      const filtrosTexto = [
        buscar ? `Buscar: "${buscar}"` : null,
        etapaNombre ? `Etapa: ${etapaNombre}` : null,
        sedeNombre ? `Sede: ${sedeNombre}` : null,
        tecNombre ? `Técnico: ${tecNombre}` : null,
        estadoNombre ? `Estado: ${estadoNombre}` : null,
      ].filter(Boolean).join(' · ') || 'Sin filtros (todos los estudiantes del ciclo)'

      const info = [
        ['PRONEA — Listado de estudiantes'],
        ['Ciclo escolar', ciclo],
        ['Filtros aplicados', filtrosTexto],
        ['Total registros', filas.length],
        ['Generado el', new Date().toLocaleString('es-GT')],
      ]
      const wsInfo = XLSX.utils.aoa_to_sheet(info)
      wsInfo['!cols'] = [{wch:20},{wch:55}]
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Resumen')

      XLSX.writeFile(wb, `Estudiantes-${ciclo}${filtroEstado ? '-' + filtroEstado : ''}.xlsx`)
    } catch {
      flash('❌ Error al generar el Excel')
    } finally {
      setDescargando(false)
    }
  }

  const FE = (k: string) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setFormEst((p: any) => ({ ...p, [k]: e.target.value }))

  const edad = (fn?: string) =>
    fn ? `${new Date().getFullYear() - new Date(fn).getFullYear()} años` : '—'

  return (
    <div className="ap">
      <header className="topbar">
        <div>
          <div className="page-title">🎓 Todos los Estudiantes</div>
          <div className="text-xs text-gray-400">{filtrados.length} de {inscripciones.length} · ciclo {ciclo}</div>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-green-600 font-bold">✅ {resumenEstados.enCurso} en curso</span>
            <span className="text-blue-600 font-bold">✔️ {resumenEstados.completada} completadas</span>
            <span className="text-gray-500 font-bold">⚪ {resumenEstados.otros} otros</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {msg && <span className={`text-sm font-bold ${msg.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{msg}</span>}
          <select className="inp w-24" value={ciclo} onChange={e => setCiclo(e.target.value)}>
            {Array.from({ length: new Date().getFullYear() + 1 - 2024 }, (_, i) => new Date().getFullYear() + 1 - i).map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
          <button className="btn btn-g" onClick={descargarExcel} disabled={descargando || loading}>
            {descargando ? '...' : '⬇️ Excel'}
          </button>
        </div>
      </header>

      <div className="pc">
        {/* Filtros */}
        <div className="card mb-4">
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="lbl">Buscar</label>
              <input className="inp" placeholder="Nombre, código, CUI..." value={buscar}
                onChange={e => setBuscar(e.target.value)} />
            </div>
            <div className="w-44">
              <label className="lbl">Etapa</label>
              <select className="inp" value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}>
                <option value="">Todas</option>
                {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Sede</label>
              <select className="inp" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
                <option value="">Todas</option>
                {sedes.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Técnico</label>
              <select className="inp" value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)}>
                <option value="">Todos</option>
                {tecnicos.map((t: any) => (
                  <option key={t.id} value={t.id}>{t.primer_nombre} {t.primer_apellido}</option>
                ))}
              </select>
            </div>
            <div className="w-44">
              <label className="lbl">Estado</label>
              <select className="inp" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_INSCRIPCION.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button className="btn btn-g" onClick={() => { setBuscar(''); setFiltroEtapa(''); setFiltroSede(''); setFiltroTecnico(''); setFiltroEstado('') }}>
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Barra de acción masiva — solo aparece con selección activa */}
        {seleccionados.size > 0 && (
          <div className="card mb-4 bg-blue-50 border border-blue-200 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-blue-800">
              {seleccionados.size} seleccionado{seleccionados.size === 1 ? '' : 's'}
            </span>
            <select className="inp text-sm w-56" value={estadoMasivo} onChange={e => setEstadoMasivo(e.target.value)}>
              {ESTADOS_INSCRIPCION.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            <button className="btn btn-p btn-sm" onClick={aplicarEstadoMasivo} disabled={aplicandoMasivo}>
              {aplicandoMasivo ? '⏳...' : '💾 Aplicar estado'}
            </button>
            <button className="btn btn-g btn-sm" onClick={recalcularMasivo} disabled={aplicandoMasivo}>
              {aplicandoMasivo ? '⏳...' : '🔄 Recalcular seleccionados'}
            </button>
            <button className="btn btn-g btn-sm ml-auto" onClick={() => setSeleccionados(new Set())}>
              Deseleccionar todo
            </button>
          </div>
        )}

        <div className="card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🎓</div>
              <div className="font-semibold">Sin resultados</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[1100px]">
                <thead>
                  <tr className="bg-gradient-to-r from-blue-800 to-blue-900 text-white text-left">
                    <th className="px-3 py-3 border-r border-blue-700">
                      <input type="checkbox" checked={todosSeleccionados} onChange={toggleSeleccionarTodos} />
                    </th>
                    {['#','Código MINEDUC','Nombre completo','CUI','Edad','Tel.','Etapa','Libro','Sede','Técnico','Estado','Acciones'].map(h => (
                      <th key={h} className="px-3 py-3 text-xs font-bold uppercase tracking-wide whitespace-nowrap border-r border-blue-700 last:border-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((insc: any, idx: number) => {
                    const e   = insc.estudiante as any
                    const par = idx % 2 === 0
                    return (
                      <tr key={insc.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${par ? 'bg-white' : 'bg-sky-50/40'}`}>
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={seleccionados.has(insc.id)}
                            onChange={() => toggleSeleccion(insc.id)} />
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs font-bold text-blue-700">
                            {e?.codigo_estudiante ?? <span className="text-gray-300 italic">Sin código</span>}
                          </span>
                          {esCodigoTemporal(e?.codigo_estudiante) && (
                            <span className="ml-1 text-orange-500" title="Código provisional — pendiente de asignar el código MINEDUC real">⚠️</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-semibold whitespace-nowrap text-gray-900">
                            {e?.primer_apellido} {e?.segundo_apellido}, {e?.primer_nombre} {e?.segundo_nombre}
                          </div>
                          {insc.tiene_ajuste_discapacidad && (
                            <span className="text-xs text-yellow-600">♿ Ajuste</span>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-gray-500">{e?.cui ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <div>{edad(e?.fecha_nacimiento)}</div>
                          <div className="text-gray-400">{e?.genero?.charAt(0)?.toUpperCase() ?? '—'}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">{e?.telefono ?? '—'}</td>
                        <td className="px-3 py-2 text-xs font-semibold whitespace-nowrap">{(insc.etapa as any)?.nombre}</td>
                        <td className="px-3 py-2">
                          <span className={`badge text-xs ${insc.version_libro === 'nuevo' ? 'badge-blue' : 'badge-orange'}`}>
                            {insc.version_libro === 'nuevo' ? '📗' : '📙'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap text-gray-600">{(insc.sede as any)?.nombre ?? '—'}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {(insc.tecnico as any)?.primer_nombre} {(insc.tecnico as any)?.primer_apellido}
                        </td>
                        <td className="px-3 py-2">
                          {editandoEstadoId === insc.id ? (
                            <select
                              className="inp text-xs py-1"
                              autoFocus
                              defaultValue={insc.estado}
                              disabled={guardandoEstadoId === insc.id}
                              onChange={e => cambiarEstado(insc, e.target.value)}
                              onBlur={() => setEditandoEstadoId(null)}
                            >
                              {ESTADOS_INSCRIPCION.map(op => (
                                <option key={op.value} value={op.value}>{op.label}</option>
                              ))}
                            </select>
                          ) : (
                            <button
                              type="button"
                              title="Clic para editar el estado"
                              onClick={() => setEditandoEstadoId(insc.id)}
                              className={`badge text-xs cursor-pointer hover:opacity-80 ${
                                insc.estado === 'en_curso' ? 'badge-green'
                                : insc.estado === 'completada' ? 'badge-blue'
                                : insc.estado === 'retirada' ? 'badge-red'
                                : insc.estado === 'suspendida' ? 'badge-yellow'
                                : 'badge-gray'
                              }`}
                            >
                              {guardandoEstadoId === insc.id ? '⏳...' : (
                                ESTADOS_INSCRIPCION.find(op => op.value === insc.estado)?.label ?? insc.estado
                              )} ✏️
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => { setModalEst(insc); setModalTipo('detalle') }}
                              className="btn btn-g btn-sm" title="Ver detalle">👁️</button>
                            <button onClick={() => abrirEditar(insc)}
                              className="btn btn-p btn-sm" title="Editar datos del estudiante">✏️</button>
                            <button onClick={() => abrirEditarInsc(insc)}
                              className="btn btn-s btn-sm" title="Editar etapa / versión de libro">🎓</button>
                            <button onClick={() => recalcularEstado(insc)}
                              disabled={guardandoEstadoId === insc.id}
                              className="btn btn-g btn-sm" title="Revisar notas y actualizar estado si ya están completas">🔄</button>
                            <button onClick={() => eliminarInsc(insc)}
                              className="btn btn-d btn-sm" title="Eliminar inscripción de esta etapa">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalEst && (
        <div className="mo" onClick={e => e.target === e.currentTarget && setModalEst(null)}>
          <div className="mb max-w-2xl my-6 mx-4">
            <div className="mh">
              <h3 className="text-base font-extrabold">
                {modalTipo === 'detalle' ? '👁️ Detalle del estudiante' : '✏️ Editar estudiante'}
              </h3>
              <button onClick={() => setModalEst(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                ×
              </button>
            </div>

            {modalTipo === 'detalle' && (() => {
              const e = modalEst.estudiante as any
              return (
                <div className="mbd">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                    {[
                      ['Código MINEDUC', e?.codigo_estudiante ?? 'Sin código'],
                      ['CUI', e?.cui ?? 'Pendiente'],
                      ['Nombre completo', `${e?.primer_nombre ?? ''} ${e?.segundo_nombre ?? ''} ${e?.primer_apellido ?? ''} ${e?.segundo_apellido ?? ''}`.trim()],
                      ['Fecha nacimiento', e?.fecha_nacimiento ?? '—'],
                      ['Género', e?.genero ?? '—'],
                      ['Teléfono', e?.telefono ?? '—'],
                      ['Correo', e?.correo ?? '—'],
                      ['Etapa', (modalEst.etapa as any)?.nombre],
                      ['Versión libro', modalEst.version_libro],
                      ['Sede', (modalEst.sede as any)?.nombre],
                      ['Técnico', `${(modalEst.tecnico as any)?.primer_nombre ?? ''} ${(modalEst.tecnico as any)?.primer_apellido ?? ''}`],
                      ['Estado', modalEst.estado],
                      ['Fecha inscripción', modalEst.fecha_inscripcion],
                      ['Discapacidad', (e?.discapacidad as any)?.nombre ?? 'Ninguna'],
                    ].map(([l, v]) => (
                      <div key={l}><div className="lbl">{l}</div><div className="font-semibold text-gray-800">{v ?? '—'}</div></div>
                    ))}
                  </div>
                  <div className="mf mt-4">
                    <button className="btn btn-g" onClick={() => setModalEst(null)}>Cerrar</button>
                    <button className="btn btn-p" onClick={() => abrirEditar(modalEst)}>✏️ Editar</button>
                  </div>
                </div>
              )
            })()}

            {modalTipo === 'editar' && (
              <div className="mbd space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { k:'codigo_estudiante', l:'Código MINEDUC (editable)', type:'text', mono:true },
                    { k:'cui', l:'CUI (editable)', type:'text', mono:true },
                    { k:'primer_nombre', l:'Primer nombre *', type:'text' },
                    { k:'segundo_nombre', l:'Segundo nombre', type:'text' },
                    { k:'primer_apellido', l:'Primer apellido *', type:'text' },
                    { k:'segundo_apellido', l:'Segundo apellido', type:'text' },
                    { k:'telefono', l:'Teléfono', type:'text' },
                    { k:'correo', l:'Correo', type:'email' },
                    { k:'fecha_nacimiento', l:'Fecha nacimiento', type:'date' },
                    { k:'direccion', l:'Dirección', type:'text' },
                  ].map(({ k, l, type, mono }) => (
                    <div key={k} className="fg">
                      <label className="lbl">{l}</label>
                      <input type={type} className={`inp ${mono ? 'font-mono' : ''}`}
                        value={formEst[k] ?? ''} onChange={FE(k)} />
                    </div>
                  ))}
                  <div className="fg">
                    <label className="lbl">Género</label>
                    <select className="inp" value={formEst.genero ?? ''} onChange={FE('genero')}>
                      <option value="">— Seleccionar —</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                    </select>
                  </div>
                </div>
                <div className="mf">
                  <button className="btn btn-g" onClick={() => setModalTipo('detalle')}>Cancelar</button>
                  <button className="btn btn-p" onClick={guardarEdicion} disabled={savingEst}>
                    {savingEst ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Guardando...</span> : '💾 Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal editar etapa/versión de libro (admin) */}
      {modalEditarInsc && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="font-bold">🎓 Editar etapa / versión de libro</h3>
              <button onClick={() => setModalEditarInsc(null)}
                className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 text-xl">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 rounded-xl p-3 text-sm text-gray-600">
                {(modalEditarInsc.estudiante as any)?.primer_nombre} {(modalEditarInsc.estudiante as any)?.primer_apellido}
              </div>
              <div className="fg">
                <label className="lbl">Etapa correcta</label>
                <select className="inp" value={formEditInsc.etapa_id}
                  onChange={e => setFormEditInsc(f => ({ ...f, etapa_id: e.target.value }))}>
                  {etapas.map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select>
              </div>
              <div className="fg">
                <label className="lbl">Versión de libro</label>
                <select className="inp" value={formEditInsc.version_libro}
                  onChange={e => setFormEditInsc(f => ({ ...f, version_libro: e.target.value }))}>
                  <option value="nuevo">📗 Nuevo</option>
                  <option value="viejo">📙 Viejo</option>
                </select>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl flex justify-between gap-2">
              <button className="btn btn-d" onClick={() => eliminarInsc(modalEditarInsc)} disabled={eliminandoInsc}>
                {eliminandoInsc ? '⏳...' : '🗑️ Eliminar inscripción'}
              </button>
              <div className="flex gap-2">
                <button className="btn btn-g" onClick={() => setModalEditarInsc(null)}>Cancelar</button>
                <button className="btn btn-p" onClick={guardarEditarInsc} disabled={guardandoInsc}>
                  {guardandoInsc ? '⏳ Guardando...' : '💾 Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
