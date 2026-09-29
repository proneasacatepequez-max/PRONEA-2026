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
// del ciclo escolar, en vez de contar filas.
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

// Enriquece un array de constancias con el nombre completo del técnico
// que las generó (o "—"). Se hace en un segundo query para no depender
// de joins anidados de PostgREST (constancias → usuarios → tecnicos).
async function enriquecerConTecnicos(constancias: any[]): Promise<any[]> {
  if (!constancias || constancias.length === 0) return constancias ?? []

  const usuarioIds = Array.from(
    new Set(constancias.map(c => c.generado_por).filter(Boolean))
  ) as string[]

  if (usuarioIds.length === 0) return constancias

  // Técnicos (rol tecnico) — búsqueda por usuario_id
  const { data: tecnicos } = await supabaseAdmin
    .from('tecnicos')
    .select('usuario_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido')
    .in('usuario_id', usuarioIds)

  // Usuarios (para correo y rol como fallback)
  const { data: usuarios } = await supabaseAdmin
    .from('usuarios')
    .select('id, correo, rol')
    .in('id', usuarioIds)

  const mapaTecnicos = new Map<string, string>()
  for (const t of tecnicos ?? []) {
    const nombre = [t.primer_nombre, t.segundo_nombre, t.primer_apellido, t.segundo_apellido]
      .filter(Boolean).join(' ')
    if (t.usuario_id) mapaTecnicos.set(t.usuario_id, nombre)
  }

  const mapaUsuarios = new Map<string, { correo: string; rol: string }>()
  for (const u of usuarios ?? []) {
    mapaUsuarios.set(u.id, { correo: u.correo, rol: u.rol })
  }

  return constancias.map(c => {
    const tecNombre = c.generado_por ? mapaTecnicos.get(c.generado_por) : null
    const usuario = c.generado_por ? mapaUsuarios.get(c.generado_por) : null
    return {
      ...c,
      generado_por_nombre: tecNombre || usuario?.correo || '—',
      generado_por_rol: usuario?.rol ?? null,
    }
  })
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
      fecha_inscripcion_manual,
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
    const sede: any = insc.sede
    if (!est) return err('No se encontró el estudiante asociado a esta inscripción', 404)

    const modalidadTexto: string = (modalidad_manual?.trim() || modalidad?.nombre || 'Presencial')

    const fechaInscripcionTexto = fecha_inscripcion_manual?.trim()
      ? fechaCortaGT(fecha_inscripcion_manual.trim())
      : fechaCortaGT(insc.fecha_inscripcion)

    let codigoGrupoSireex: string | null = grupo_sireex_manual?.trim() || null
    if (!codigoGrupoSireex) {
      const { data: grupoRow } = await supabaseAdmin
        .from('inscripcion_grupo_sireex')
        .select('grupo_sireex:grupos_sireex(codigo)')
        .eq('inscripcion_id', inscripcion_id)
        .maybeSingle()
      codigoGrupoSireex = (grupoRow?.grupo_sireex as any)?.codigo ?? null
    }

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
      sede,
      modalidad,
      codigo_grupo_sireex: codigoGrupoSireex,
      modalidad_texto: modalidadTexto,
      fecha_inscripcion_texto: fechaInscripcionTexto,
    }
    const datosFirmanteSnapshot = { ...firmante }

    // Municipio DINÁMICO (sede del estudiante) — solo para el párrafo legal.
    // El encabezado y el cierre siempre dicen "Antigua Guatemala".
    const municipioSede = sede?.municipio?.nombre ?? 'Antigua Guatemala'

    const textoGenerado = generarTextoConstancia({
      fechaActual: fechaFormateadaGT(),
      nombreCompleto,
      cui: est.cui_pendiente ? null : est.cui,
      codigoEstudiante: est.codigo_estudiante,
      nombreEtapaFormateado: formatearEtapaParaTexto(etapa?.nombre ?? ''),
      codigoGrupoSireex,
      cicloEscolar: insc.ciclo_escolar,
      fechaInscripcion: fechaInscripcionTexto,
      modalidad: modalidadTexto,
      municipio: municipioSede,
      nombreFirmante: firmante.nombre_completo,
      cargoFirmante: firmante.cargo,
      dependenciaFirmante: firmante.dependencia,
    })

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
    } catch { /* no bloquear */ }

    return ok({ ok: true, constancia: creada })
  } catch (e: any) {
    return err('Error inesperado al generar la constancia: ' + (e?.message ?? String(e)), 500)
  }
}

// GET → listar/consultar constancias
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

      // El director es validador GLOBAL. El técnico solo las de sus inscripciones.
      if (s.rol === 'tecnico') {
        const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
        const { data: insc } = await supabaseAdmin.from('inscripciones').select('tecnico_id').eq('id', data.inscripcion_id).maybeSingle()
        if (!tec?.id || insc?.tecnico_id !== tec.id) return err('Sin permiso sobre esta constancia', 403)
      }

      const [enriquecida] = await enriquecerConTecnicos([data])
      return ok(enriquecida)
    }

    const estudianteId = p.get('estudiante_id')
    const inscripcionId = p.get('inscripcion_id')
    const estado = p.get('estado')

    if (estudianteId) q = q.eq('estudiante_id', estudianteId)
    if (inscripcionId) q = q.eq('inscripcion_id', inscripcionId)
    if (estado) q = q.eq('estado', estado)

    // El director valida constancias de TODAS las sedes
    if (s.rol === 'director') {
      const { data, error } = await q.order('generado_en', { ascending: false }).limit(200)
      if (error) return err(error.message, 500)
      const enriquecidas = await enriquecerConTecnicos(data ?? [])
      return ok({ data: enriquecidas })
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
    const enriquecidas = await enriquecerConTecnicos(data ?? [])
    return ok({ data: enriquecidas })
  } catch (e: any) {
    return err('Error inesperado al consultar constancias: ' + (e?.message ?? String(e)), 500)
  }
}
