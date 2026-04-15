// src/app/api/notas/route.ts
// Validación de rol:
//   admin/tecnico → pueden siempre
//   enlace → SOLO con permiso global + autorización director confirmada
//   coordinador → BLOQUEADO
//   director/estudiante → BLOQUEADOS
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getSession, ok, err } from '@/lib/auth'
import { verificarPermiso } from '@/lib/permisos'

export async function GET(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autorizado',401)
  const p = req.nextUrl.searchParams
  const inscripcion_id = p.get('inscripcion_id'), num = p.get('numero_libro')??"1", tipo = p.get('tipo')??"tareas"
  if(!inscripcion_id) return err('inscripcion_id requerido')

  const { data:insc } = await supabaseAdmin.from('inscripciones')
    .select('id,etapa_id,version_libro,tiene_ajuste_discapacidad').eq('id',inscripcion_id).single()
  if(!insc) return err('Inscripción no encontrada',404)

  const { data:libro } = await supabaseAdmin.from('libros')
    .select('id,nombre,numero,version,total_tareas').eq('etapa_id',insc.etapa_id)
    .eq('numero',parseInt(num)).eq('version',insc.version_libro).eq('activo',true).single()
  if(!libro) return err(`No existe Libro ${num} versión "${insc.version_libro}". Verifica la tabla libros.`,404)

  if(tipo==='tareas') {
    const { data:tareas } = await supabaseAdmin.from('tareas_catalogo')
      .select('id,numero_tarea,nombre,paginas,puntos_max,area:areas(id,nombre,codigo)')
      .eq('libro_id',libro.id).eq('activo',true).order('numero_tarea')
    const ids = (tareas??[]).map((t:any)=>t.id)
    const { data:notas } = await supabaseAdmin.from('notas_tareas')
      .select('tarea_id,nota,con_ajuste').eq('inscripcion_id',inscripcion_id).in('tarea_id',ids)
    const nm = Object.fromEntries((notas??[]).map((n:any)=>[n.tarea_id,n]))
    let omitidas: Set<string> = new Set()
    if(insc.tiene_ajuste_discapacidad) {
      const { data:adj } = await supabaseAdmin.from('ajustes_discapacidad')
        .select('tareas_omitidas_ajuste(tarea_id)').eq('inscripcion_id',inscripcion_id).eq('activo',true)
      adj?.forEach((a:any)=>a.tareas_omitidas_ajuste?.forEach((t:any)=>omitidas.add(t.tarea_id)))
    }
    return ok({ libro, version_libro:insc.version_libro,
      tareas:(tareas??[]).map((t:any)=>({ ...t, nota:nm[t.id]?.nota??null, con_ajuste:nm[t.id]?.con_ajuste??false, omitida:omitidas.has(t.id) }))
    })
  }
  const { data:examenes } = await supabaseAdmin.from('examenes_catalogo')
    .select('id,nombre,puntos_max,area:areas(id,nombre,codigo)').eq('libro_id',libro.id).eq('activo',true)
  const eids = (examenes??[]).map((e:any)=>e.id)
  const { data:notas } = await supabaseAdmin.from('notas_examenes')
    .select('examen_id,nota_original,puntos_obtenidos').eq('inscripcion_id',inscripcion_id).in('examen_id',eids)
  const nm = Object.fromEntries((notas??[]).map((n:any)=>[n.examen_id,n]))
  return ok({ libro, version_libro:insc.version_libro,
    examenes:(examenes??[]).map((e:any)=>({ ...e, nota_original:nm[e.id]?.nota_original??null, puntos_obtenidos:nm[e.id]?.puntos_obtenidos??null }))
  })
}

export async function POST(req: NextRequest) {
  const s = await getSession(req); if(!s) return err('No autenticado',401)
  const ip = req.headers.get('x-forwarded-for') ?? undefined

  // ── Validación de roles ────────────────────────────────
  if(s.rol==='coordinador_digeex') {
    await supabaseAdmin.rpc('registrar_intento_no_autorizado',{ p_usuario_id:s.sub, p_permiso:'ingresar_notas_enlace', p_accion:'Coordinador intentó ingresar nota', p_ip:ip??null }).catch(()=>{})
    return err('El coordinador no puede ingresar notas',403)
  }
  if(s.rol==='director')   return err('El director no ingresa notas directamente',403)
  if(s.rol==='estudiante') return err('Los estudiantes no pueden modificar notas',403)

  if(s.rol==='enlace_institucional') {
    const { permitido } = await verificarPermiso(s.sub, 'ingresar_notas_enlace', ip)
    if(!permitido) return err('No tienes autorización para ingresar notas. Solicita al director que te autorice o contacta al administrador.',403)
  }
  // admin y tecnico pasan sin restricción adicional

  const { tipo, inscripcion_id, tarea_id, examen_id, nota, nota_original } = await req.json()

  // Verificar que el enlace solo registre notas de su institución
  if(s.rol==='enlace_institucional') {
    const { data:insc } = await supabaseAdmin.from('inscripciones').select('institucion_id').eq('id',inscripcion_id).single()
    const { data:en } = await supabaseAdmin.from('enlaces_institucionales').select('institucion_id').eq('usuario_id',s.sub).single()
    if(!insc||!en||insc.institucion_id!==en.institucion_id) {
      await supabaseAdmin.rpc('registrar_intento_no_autorizado',{ p_usuario_id:s.sub, p_permiso:'ingresar_notas_enlace', p_accion:'Nota en institución diferente', p_ip:ip??null }).catch(()=>{})
      return err('Solo puedes ingresar notas de estudiantes de tu institución',403)
    }
  }

  if(tipo==='tarea') {
    if(!tarea_id||nota===undefined||nota<0||nota>5) return err('tarea_id y nota(0-5) requeridos')
    const { error } = await supabaseAdmin.from('notas_tareas').upsert(
      { inscripcion_id, tarea_id, nota, registrado_por:s.sub, actualizado_en:new Date().toISOString() },
      { onConflict:'inscripcion_id,tarea_id' }
    )
    if(error) return err(error.message,500)
    await supabaseAdmin.from('auditoria').insert({ usuario_id:s.sub, accion:'INSERT_NOTA_TAREA', tabla_afectada:'notas_tareas', registro_id:inscripcion_id, datos_nuevos:{ tarea_id, nota, via:s.rol } })
    return ok({ ok:true, tipo:'tarea', nota })
  }
  if(tipo==='examen') {
    if(!examen_id||nota_original===undefined||nota_original<0||nota_original>100) return err('examen_id y nota_original(0-100) requeridos')
    const { error } = await supabaseAdmin.from('notas_examenes').upsert(
      { inscripcion_id, examen_id, nota_original, registrado_por:s.sub, actualizado_en:new Date().toISOString() },
      { onConflict:'inscripcion_id,examen_id' }
    )
    if(error) return err(error.message,500)
    await supabaseAdmin.from('auditoria').insert({ usuario_id:s.sub, accion:'INSERT_NOTA_EXAMEN', tabla_afectada:'notas_examenes', registro_id:inscripcion_id, datos_nuevos:{ examen_id, nota_original, via:s.rol } })
    return ok({ ok:true, tipo:'examen', nota_original })
  }
  return err('tipo debe ser tarea o examen')
}
