// src/app/api/estudiantes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
import { leerConfig } from '@/lib/permisos'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const p = req.nextUrl.searchParams
  const ciclo = p.get('ciclo')??"2026", etapa_id = p.get('etapa_id'), buscar = p.get('buscar')

  // ── Coordinador: usar vista con visibilidad aplicada ──
  if(s.rol==='coordinador_digeex') {
    let q = supabaseAdmin.from('v_estudiantes_coordinador').select('*').eq('ciclo_escolar',parseInt(ciclo))
    if(etapa_id) q = q.eq('etapa',etapa_id)
    const { data, error } = await q
    if(error) return err(error.message,500)
    let r = data??[]
    if(buscar) {
      const b = buscar.toLowerCase()
      r = r.filter((x:any)=>x.nombre_estudiante?.toLowerCase().includes(b)||x.codigo_estudiante?.includes(b)||x.cui?.includes(b))
    }
    return ok({ data:r, total:r.length })
  }

  // ── Otros roles: consulta directa ──
  let q = supabaseAdmin.from('inscripciones')
    .select(`id,ciclo_escolar,estado,version_libro,tiene_ajuste_discapacidad,fecha_inscripcion,codigo_sireex,
      etapa:etapas(id,nombre,codigo,nivel),
      tecnico:tecnicos(id,primer_nombre,primer_apellido,codigo_tecnico),
      sede:sedes(id,nombre),
      modalidad:modalidades(nombre),
      seccion:secciones(codigo),
      institucion:instituciones(id,nombre),
      estudiante:estudiantes(id,codigo_estudiante,primer_nombre,segundo_nombre,primer_apellido,segundo_apellido,cui,cui_pendiente,telefono,correo,discapacidad_id,activo,discapacidad:tipos_discapacidad(nombre,codigo))
    `,{ count:'exact' }).eq('ciclo_escolar',parseInt(ciclo))

  if(s.rol==='tecnico') {
    const { data:tec } = await supabaseAdmin.from('tecnicos').select('id').eq('usuario_id',s.sub).single()
    if(tec) q = q.eq('tecnico_id',tec.id)
  }
  if(s.rol==='enlace_institucional') {
    const { data:en } = await supabaseAdmin.from('enlaces_institucionales').select('institucion_id').eq('usuario_id',s.sub).single()
    if(en) q = q.eq('institucion_id',en.institucion_id)
  }
  if(etapa_id) q = q.eq('etapa_id',parseInt(etapa_id))

  const { data, error, count } = await q
  if(error) return err(error.message,500)
  let r = data??[]
  if(buscar) {
    const b = buscar.toLowerCase()
    r = r.filter((i:any)=>{ const e=i.estudiante; return e?.primer_nombre?.toLowerCase().includes(b)||e?.primer_apellido?.toLowerCase().includes(b)||e?.codigo_estudiante?.toLowerCase().includes(b)||e?.cui?.includes(b) })
  }
  return ok({ data:r, total:count??0 })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)

  // Verificar permiso para enlace
  if(s.rol==='enlace_institucional') {
    const { data:pg } = await supabaseAdmin.from('permisos_globales').select('activo').eq('permiso','inscribir_estudiantes_enlace').single()
    if(!pg?.activo) return err('Permiso de inscripción para enlace no está activo',403)
    const { data:en } = await supabaseAdmin.from('enlaces_institucionales').select('id').eq('usuario_id',s.sub).single()
    const { data:aut } = await supabaseAdmin.from('autorizaciones_director')
      .select('id').eq('enlace_id',en?.id??'').eq('permiso','inscribir_estudiantes_enlace')
      .eq('activo',true).not('autorizado_por_admin','is',null).lte('fecha_inicio',new Date().toISOString().split('T')[0]).single()
    if(!aut) return err('No tienes autorización del director para inscribir estudiantes',403)
  }
  if(!['tecnico','administrador','enlace_institucional'].includes(s.rol)) return err('Sin permiso',403)

  const b = await req.json()
  if(!b.primer_nombre||!b.primer_apellido||!b.telefono||!b.etapa_id||!b.sede_id) return err('Campos requeridos incompletos')

  // Verificar documentos obligatorios
  const docOblig = await leerConfig('documentos_obligatorios','true')
  if(docOblig==='true' && (!b.documentos||b.documentos.length===0)) {
    return err('Los documentos son obligatorios para la inscripción. El administrador puede cambiar esto en Configuración.',400)
  }

  const { count } = await supabaseAdmin.from('estudiantes').select('*',{count:'exact',head:true})
  const codigo = `EST-${b.ciclo_escolar??2026}-${String((count??0)+1).padStart(4,'0')}`
  const correoU = b.correo ?? `${codigo.toLowerCase().replace(/-/g,'.')}@pronea.gt`

  const hash = await bcrypt.hash(`PRONEA${b.ciclo_escolar??2026}`,10)
  const { data:usu, error:eU } = await supabaseAdmin.from('usuarios')
    .insert({ correo:correoU, contrasena_hash:hash, rol:'estudiante', primer_ingreso:true }).select('id').single()
  if(eU) return err(eU.message,500)

  const { data:est, error:eE } = await supabaseAdmin.from('estudiantes').insert({
    usuario_id:usu.id, codigo_estudiante:codigo,
    primer_nombre:b.primer_nombre?.trim(), segundo_nombre:b.segundo_nombre?.trim()??null,
    primer_apellido:b.primer_apellido?.trim(), segundo_apellido:b.segundo_apellido?.trim()??null,
    apellido_casada:b.apellido_casada?.trim()??null,
    cui:b.cui_pendiente?null:b.cui?.replace(/\s/g,'')??null, cui_pendiente:b.cui_pendiente??false,
    fecha_nacimiento:b.fecha_nacimiento??null, genero:b.genero??null,
    telefono:b.telefono?.trim(), correo:correoU, correo_classroom:b.correo_classroom?.trim()??null,
    municipio_id:b.municipio_id??null, discapacidad_id:b.discapacidad_id??null,
    conflicto_ley:b.conflicto_ley??false, becado_por:b.becado_por?.trim()??null,
  }).select('id').single()
  if(eE) return err(eE.message,500)

  const { data:insc, error:eI } = await supabaseAdmin.from('inscripciones').insert({
    estudiante_id:est.id, etapa_id:b.etapa_id, tecnico_id:b.tecnico_id??s.sub,
    sede_id:b.sede_id, institucion_id:b.institucion_id??null,
    modalidad_id:b.modalidad_id??null, seccion_id:b.seccion_id??null,
    ciclo_escolar:b.ciclo_escolar??2026, repite_etapa:b.repite_etapa??false,
    estado:'en_curso', version_libro:b.version_libro??'nuevo',
    codigo_sireex:b.codigo_sireex??null, observaciones:b.observaciones??null, creado_por:s.sub,
  }).select('id').single()
  if(eI) return err(eI.message,500)

  if(b.documentos?.length>0) {
    const docs = b.documentos.filter((d:any)=>d.url_google_drive).map((d:any)=>({ estudiante_id:est.id, tipo_documento_id:d.tipo_documento_id, url_google_drive:d.url_google_drive, estado:'en_revision' }))
    if(docs.length>0) await supabaseAdmin.from('documentos_estudiante').insert(docs)
  }

  await supabaseAdmin.from('auditoria').insert({ usuario_id:s.sub, accion:'INSERT', tabla_afectada:'estudiantes', registro_id:est.id, datos_nuevos:{ codigo, version_libro:b.version_libro } })
  return ok({ ok:true, estudiante_id:est.id, inscripcion_id:insc.id, codigo_estudiante:codigo }, 201)
}
