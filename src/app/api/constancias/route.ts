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
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

// POST → generar una nueva constancia (estado inicial: pendiente_validacion)
export async function POST(req: NextRequest) {
  const s = await getSession(req)
  if (!s || !ROLES_GENERAN.includes(s.rol)) return err('Sin permiso', 403)

  const { inscripcion_id, firmante_id } = await req.json().catch(() => ({}))
  if (!inscripcion_id) return err('inscripcion_id requerido', 400)

  // 1) Inscripción + estudiante + etapa + sede + modalidad + técnico, todo
  //    fresco desde la BD — nunca se confía en datos que mande el cliente
  //    para el snapshot legal.
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

  if (errInsc || !insc) return err('Inscripción no encontrada', 404)

  // Técnico solo puede generar constancias de estudiantes que él inscribió
  if (s.rol === 'tecnico') {
    const { data: tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id', s.sub).maybeSingle()
    if (!tec || tec.id !== insc.tecnico_id) return err('Esta inscripción no te pertenece', 403)
  }

  const est: any = insc.estudiante
  const etapa: any = insc.etapa
  const sede: any = insc.sede
  const modalidad: any = insc.modalidad

  // 2) Código de grupo SIREEX (si ya fue asignado)
  const { data: grupoRow } = await supabaseAdmin
    .from('inscripcion_grupo_sireex')
    .select('grupo_sireex:grupos_sireex(codigo)')
    .eq('inscripcion_id', inscripcion_id)
    .maybeSingle()
  const codigoGrupoSireex = (grupoRow?.grupo_sireex as any)?.codigo ?? null

  // 3) Firmante (opcional en el body, si no viene se usa el predeterminado activo)
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

  const datosEstudianteSnapshot = { ...est, nombre_completo: nombreCompleto, etapa, sede, modalidad, codigo_grupo_sireex: codigoGrupoSireex }
  const datosFirmanteSnapshot = { ...firmante }

  const textoGenerado = generarTextoConstancia({
    fechaActual: fechaFormateadaGT(),
    nombreCompleto,
    cui: est.cui_pendiente ? null : est.cui,
    codigoEstudiante: est.codigo_estudiante,
    nombreEtapaFormateado: formatearEtapaParaTexto(etapa?.nombre ?? ''),
    codigoGrupoSireex,
    cicloEscolar: insc.ciclo_escolar,
    fechaInscripcion: fechaCortaGT(insc.fecha_inscripcion),
    modalidad: modalidad?.nombre ?? 'Presencial',
    municipio: sede?.municipio?.nombre ?? sede?.nombre ?? 'Antigua Guatemala',
    nombreFirmante: firmante.nombre_completo,
    cargoFirmante: firmante.cargo,
    dependenciaFirmante: firmante.dependencia,
  })

  // 4) Número correlativo único.
  // Nota: se calcula contando filas existentes — es seguro para el volumen
  // de uso esperado (generación manual, no un proceso masivo concurrente).
  // Si algún día se generan muchas al mismo tiempo, esto se puede migrar a
  // una función de Postgres que use nextval() sobre constancias_numero_seq
  // directamente en la base de datos.
  const { count } = await supabaseAdmin.from('constancias_inscripcion').select('*', { count: 'exact', head: true })
  const siguiente = (count ?? 0) + 1
  const numeroConstancia = `CNST-${insc.ciclo_escolar}-${String(siguiente).padStart(6, '0')}`

  const { data: creada, error: errIns } = await supabaseAdmin.from('constancias_inscripcion').insert({
    numero_constancia: numeroConstancia,
    estudiante_id: est.id,
    inscripcion_id: insc.id,
    firmante_id: firmante.id,
    datos_estudiante_snapshot: datosEstudianteSnapshot,
    datos_firmante_snapshot: datosFirmanteSnapshot,
    texto_generado: textoGenerado,
    estado: 'pendiente_validacion',
    generado_por: s.sub,
  }).select().single()

  if (errIns) return err(errIns.message, 500)

  await supabaseAdmin.from('auditoria').insert({
    usuario_id: s.sub, accion: 'generar_constancia', tabla_afectada: 'constancias_inscripcion',
    registro_id: creada.id, datos_nuevos: { numero_constancia: numeroConstancia, estudiante_id: est.id },
  }).catch(() => {})

  return ok({ ok: true, constancia: creada })
}

// GET → listar/consultar constancias (por estudiante_id, inscripcion_id, o estado)
export async function GET(req: NextRequest) {
  const s = await getSession(req)
  if (!s) return err('No autorizado', 401)

  const p = req.nextUrl.searchParams
  const id = p.get('id')

  let q = supabaseAdmin.from('constancias_inscripcion').select(`
    id, numero_constancia, estado, motivo_rechazo,
    datos_estudiante_snapshot, datos_firmante_snapshot, texto_generado,
    generado_por, generado_en, validado_por, validado_en, exportado_por, exportado_en,
    estudiante_id, inscripcion_id,
    generado_por_usuario:usuarios!constancias_inscripcion_generado_por_fkey(correo)
  `)

  if (id) {
    const { data, error } = await q.eq('id', id).single()
    if (error || !data) return err('Constancia no encontrada', 404)

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

  // El director solo ve las constancias de estudiantes de SU sede —
  // igual que el resto de bandejas del director en este sistema.
  if (s.rol === 'director') {
    const { data: dir } = await supabaseAdmin.from('directores').select('sede_id').eq('usuario_id', s.sub).maybeSingle()
    if (!dir?.sede_id) return ok({ data: [] })
    const { data: inscsDeLaSede } = await supabaseAdmin.from('inscripciones').select('id').eq('sede_id', dir.sede_id)
    const idsPermitidos = (inscsDeLaSede ?? []).map((i: any) => i.id)
    if (idsPermitidos.length === 0) return ok({ data: [] })
    q = q.in('inscripcion_id', idsPermitidos)
  }

  const { data, error } = await q.order('generado_en', { ascending: false }).limit(200)
  if (error) return err(error.message, 500)
  return ok({ data: data ?? [] })
}
