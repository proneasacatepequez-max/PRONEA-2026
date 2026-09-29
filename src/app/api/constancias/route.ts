// src/app/api/constancias/route.ts
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
import { formatearEtapaParaTexto, generarTextoConstancia } from '@/lib/constancias'

const ROLES_GENERAN = ['tecnico', 'administrador']

function fechaFormateadaGT(d: Date = new Date()): string {
  return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fechaCortaGT(fecha: string | null): string {
  if (!fecha) return '—'
  const d = new Date(fecha + 'T00:00:00')
  if (isNaN(d.getTime())) return '—'
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// Calcula el siguiente correlativo buscando MAX(numero_constancia)
// del ciclo escolar, en vez de contar filas (contar falla si se
// elimina alguna constancia — ya pasó con el botón Eliminar).
async function siguienteNumeroConstancia(cicloEscolar: number): Promise<string> {
  const prefijo = `CNST-${cicloEscolar}-`
  const { data, error } = await supabaseAdmin
    .from('constancias_inscripcion')
    .select('numero_constancia')
    .like('numero_constancia', `${prefijo}%`)
    .order('numero_constancia', { ascending: false })
    .limit(1)

  if (error) throw new Error('No se pudo leer constancias: ' + error.message)

  let siguiente = 1
  if (data && data.length > 0) {
    const ultimo = data[0].numero_constancia as string
    const partes = ultimo.split('-')
    const num = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(num)) siguiente = num + 1
  }
  return `${prefijo}${String(siguiente).padStart(6, '0')}`
}

export async function POST(req: NextRequest) {
  try {
    const s = await getSession(req)
    if (!s || !ROLES_GENERAN.includes(s.rol)) return err('Sin permiso', 403)

    const {
      inscripcion_id,
      firmante_id,
      grupo_sireex_manual,
      modalidad_manual,
      fecha_inscripcion_manual,   // ← NUEVO: formato YYYY-MM-DD
    } = await req.json().catch(() => ({}))
    if (!inscripcion_id) return err('inscripcion_id requerido', 400)

    const { data: insc, error: errInsc } = await supabaseAdmin
      .from('inscripciones')
      .select(`
        id, ciclo_escolar, fecha_inscripcion, codigo_sireex, tecnico_id,
        estudiante:estudiantes(id, codigo_estudiante, cui, cui_pendiente,
          primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, apellido_casada),
        etapa:etapas(id, nombre, codigo, nivel),
        sede:sedes(id, nombre, municipio:municipios(nombre)),
        modalidad:modalidades(id, nombre)
      `)
      .eq('id', inscripcion_id)
      .single()

    if (errInsc || !insc) return err(errInsc?.message ?? 'Inscripción no encontrada', 404)

    if (s.rol === 'tecnico') {
      const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
      if (!tec || tec.id !== insc.tecnico_id) return err('Esta inscripción no te pertenece', 403)
    }

    const est: any = insc.estudiante
    const etapa: any = insc.etapa
    const modalidad: any = insc.modalidad
    if (!est) return err('No se encontró el estudiante asociado a esta inscripción', 404)

    // Modalidad: si el técnico escribió una manual, esa manda.
    const modalidadTexto: string = (modalidad_manual?.trim() || modalidad?.nombre || 'Presencial')

    // Fecha de inscripción: si el técnico escribió una manual (YYYY-MM-DD),
    // esa manda; si no, se usa la registrada en la inscripción.
    const fechaInscripcionTexto = fecha_inscripcion_manual?.trim()
      ? fechaCortaGT(fecha_inscripcion_manual.trim())
      : fechaCortaGT(insc.fecha_inscripcion)

    // Grupo SIREEX: si el técnico lo escribió a mano, ese manda; si no,
    // se busca el que ya esté asignado en el sistema.
    let codigoGrupoSireex: string | null = grupo_sireex_manual?.trim() || null
    if (!codigoGrupoSireex) {
      const { data: grupoRow } = await supabaseAdmin
        .from('inscripcion_grupo_sireex')
        .select('grupo_sireex:grupos_sireex(codigo)')
        .eq('inscripcion_id', inscripcion_id)
        .maybeSingle()
      codigoGrupoSireex = (grupoRow?.grupo_sireex as any)?.codigo ?? null
    }

    // Firmante (opcional en el body, si no viene se usa el predeterminado activo)
    let firmante: any = null
    if (firmante_id) {
      const { data } = await supabaseAdmin.from('firmantes_constancias').select('*').eq('id', firmante_id).eq('activo', true).maybeSingle()
      firmante = data
    } else {
      const { data } = await supabaseAdmin.from('firmantes_constancias')
        .select('*').eq('activo', true)
        .order('es_predeterminado', { ascending: false })
        .limit(1).maybeSingle()
      firmante = data
    }
    if (!firmante) return err('No hay un firmante activo configurado. Pide al administrador que agregue uno en Firmantes de Constancias.', 400)

    const nombreCompleto = [est.primer_nombre, est.segundo_nombre, est.primer_apellido, est.apellido_casada || est.segundo_apellido]
      .filter(Boolean).join(' ')

    const datosEstudianteSnapshot = {
      ...est,
      nombre_completo: nombreCompleto,
      etapa,
      sede: insc.sede,
      modalidad,
      codigo_grupo_sireex: codigoGrupoSireex,
      modalidad_texto: modalidadTexto,
      fecha_inscripcion_texto: fechaInscripcionTexto,   // ← NUEVO
    }
    const datosFirmanteSnapshot = { ...firmante }

    const textoGenerado = generarTextoConstancia({
      fechaActual: fechaFormateadaGT(),
      nombreCompleto,
      cui: est.cui_pendiente ? null : est.cui,
      codigoEstudiante: est.codigo_estudiante,
      nombreEtapaFormateado: formatearEtapaParaTexto(etapa?.nombre ?? ''),
      codigoGrupoSireex,
      cicloEscolar: insc.ciclo_escolar,
      fechaInscripcion: fechaInscripcionTexto,   // ← usa la manual si vino
      modalidad: modalidadTexto,
      municipio: 'Antigua Guatemala',
      nombreFirmante: firmante.nombre_completo,
      cargoFirmante: firmante.cargo,
      dependenciaFirmante: firmante.dependencia,
    })

    // Número correlativo con reintento por colisión (unique constraint)
    let creada: any = null
    let ultimoError: string | null = null
    for (let intento = 0; intento < 5; intento++) {
      const numeroConstancia = await siguienteNumeroConstancia(insc.ciclo_escolar)
      const { data, error: errIns } = await supabaseAdmin
        .from('constancias_inscripcion')
        .insert({
          numero_constancia: numeroConstancia,
          estudiante_id: est.id,
          inscripcion_id: insc.id,
          firmante_id: firmante.id,
          datos_estudiante_snapshot: datosEstudianteSnapshot,
          datos_firmante_snapshot: datosFirmanteSnapshot,
          texto_generado: textoGenerado,
          estado: 'pendiente_validacion',
          generado_por: s.sub,
        })
        .select()
        .single()

      if (!errIns && data) { creada = data; break }

      // Si el error NO es por unique constraint, no reintentar
      if (errIns && !errIns.message.includes('duplicate key')) {
        return err(errIns.message, 500)
      }
      ultimoError = errIns?.message ?? null
    }

    if (!creada) {
      return err('No se pudo generar un número correlativo único tras varios intentos. Detalle: ' + (ultimoError ?? 'desconocido'), 500)
    }

    try {
      await supabaseAdmin.from('auditoria').insert({
        usuario_id: s.sub, accion: 'generar_constancia', tabla_afectada: 'constancias_inscripcion',
        registro_id: creada.id, datos_nuevos: { numero_constancia: creada.numero_constancia, estudiante_id: est.id },
      })
    } catch { /* la auditoría nunca debe bloquear la generación */ }

    return ok({ ok: true, constancia: creada })
  } catch (e: any) {
    return err('Error inesperado al generar la constancia: ' + (e?.message ?? String(e)), 500)
  }
}

// GET → listar/consultar constancias (por estudiante_id, inscripcion_id, o estado)
export async function GET(req: NextRequest) {
  try {
    const s = await getSession(req)
    if (!s) return err('No autorizado', 401)

    const p = req.nextUrl.searchParams
    const id = p.get('id')

    let q = supabaseAdmin.from('constancias_inscripcion').select(`
      id, numero_constancia, estado, motivo_rechazo,
      datos_estudiante_snapshot, datos_firmante_snapshot, texto_generado,
      generado_por, generado_en, validado_por, validado_en, exportado_por, exportado_en,
      estudiante_id, inscripcion_id
    `)

    if (id) {
      const { data, error } = await q.eq('id', id).single()
      if (error || !data) return err(error?.message ?? 'Constancia no encontrada', 404)

      if (s.rol === 'director') {
        const { data: dir } = await supabaseAdmin.from('directores').select('sede_id').eq('usuario_id', s.sub).maybeSingle()
        const { data: insc } = await supabaseAdmin.from('inscripciones').select('sede_id').eq('id', data.inscripcion_id).maybeSingle()
        if (!dir?.sede_id || insc?.sede_id !== dir.sede_id) return err('Sin permiso sobre esta constancia', 403)
      } else if (s.rol === 'tecnico') {
        const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
        const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', data.inscripcion_id).maybeSingle()
        if (!tec?.id || insc?.tecnico_id !== tec.id) return err('Sin permiso sobre esta constancia', 403)
      }

      return ok(data)
    }

    const estudianteId = p.get('estudiante_id')
    const inscripcionId = p.get('inscripcion_id')
    const estado = p.get('estado')

    if (estudianteId) q = q.eq('estudiante_id', estudianteId)
    if (inscripcionId) q = q.eq('inscripcion_id', inscripcionId)
    if (estado) q = q.eq('estado', estado)

    // El director solo ve las constancias de estudiantes de SU sede
    if (s.rol === 'director') {
      const { data: dir } = await supabaseAdmin.from('directores').select('sede_id, sede:sedes(nombre)').eq('usuario_id', s.sub).maybeSingle()
      if (!dir?.sede_id) {
        return ok({ data: [], aviso: 'No se encontró tu perfil de director (o no tiene una sede asignada) — por eso no se puede filtrar ninguna constancia. Pide al administrador que revise tu usuario en Usuarios.' })
      }
      const nombreSede = (dir.sede as any)?.nombre ?? 'tu sede'
      const { data: inscsDeLaSede } = await supabaseAdmin.from('inscripciones').select('id').eq('sede_id', dir.sede_id)
      const idsPermitidos = (inscsDeLaSede ?? []).map((i: any) => i.id)
      if (idsPermitidos.length === 0) {
        return ok({ data: [], aviso: `${nombreSede} no tiene ninguna inscripción registrada todavía.` })
      }
      q = q.in('inscripcion_id', idsPermitidos)

      const { data, error } = await q.order('generado_en', { ascending: false }).limit(200)
      if (error) return err(error.message, 500)

      if ((data ?? []).length === 0 && (estado === 'pendiente_validacion' || !estado)) {
        const { count } = await supabaseAdmin.from('constancias_inscripcion')
          .select('*', { count: 'exact', head: true }).eq('estado', 'pendiente_validacion')
        if ((count ?? 0) > 0) {
          return ok({ data: [], aviso: `No hay constancias pendientes en ${nombreSede}. Sí hay ${count} pendiente(s) en total en el sistema, pero de otra(s) sede(s) — revisa a qué sede pertenece la inscripción del estudiante.` })
        }
      }

      return ok({ data: data ?? [] })
    }

    // Técnico: limitar a sus propias inscripciones
    if (s.rol === 'tecnico') {
      const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
      if (!tec?.id) return ok({ data: [] })
      const { data: inscsDelTec } = await supabaseAdmin.from('inscripciones').select('id').eq('tecnico_id', tec.id)
      const idsPermitidos = (inscsDelTec ?? []).map((i: any) => i.id)
      if (idsPermitidos.length === 0) return ok({ data: [] })
      q = q.in('inscripcion_id', idsPermitidos)
    }

    const { data, error } = await q.order('generado_en', { ascending: false }).limit(200)
    if (error) return err(error.message, 500)
    return ok({ data: data ?? [] })
  } catch (e: any) {
    return err('Error inesperado al consultar constancias: ' + (e?.message ?? String(e)), 500)
  }
}
