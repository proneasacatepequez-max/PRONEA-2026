// src/app/dashboard/enlace/page.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'
import { verificarPermiso } from '@/lib/permisos'

export default async function EnlaceDashboard() {
  const s = await getSession(); if(!s||s.rol!=='enlace_institucional') redirect('/login')
  const { data:en } = await supabaseAdmin.from('enlaces_institucionales')
    .select('id,primer_nombre,primer_apellido,cargo,institucion:instituciones(id,nombre,tipo)').eq('usuario_id',s.sub).single()
  if(!en) redirect('/login')
  const instId = (en.institucion as any)?.id
  const [{ count:est }, pNotas, pInscribir] = await Promise.all([
    supabaseAdmin.from('inscripciones').select('*',{count:'exact',head:true}).eq('institucion_id',instId).eq('ciclo_escolar',2026),
    verificarPermiso(s.sub,'ingresar_notas_enlace'),
    verificarPermiso(s.sub,'inscribir_estudiantes_enlace'),
  ])

  return (
    <div className="ap">
      <header className="topbar"><div><div className="page-title">{(en.institucion as any)?.nombre}</div><div className="text-xs text-gray-400">{en.primer_nombre} {en.primer_apellido} — {en.cargo}</div></div></header>
      <div className="pc">
        {/* Estado de mis permisos */}
        <div className="card mb-5">
          <div className="card-title">🔐 Mis permisos actuales</div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div><div className="text-sm font-bold text-gray-700">Ingresar notas</div><div className="text-xs text-gray-400">Registrar notas de tareas y exámenes</div></div>
              {pNotas.permitido ? <span className="perm-on">✅ Autorizado</span> : <span className="perm-off">🚫 Sin permiso</span>}
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div><div className="text-sm font-bold text-gray-700">Inscribir estudiantes</div><div className="text-xs text-gray-400">Registrar nuevos estudiantes</div></div>
              {pInscribir.permitido ? <span className="perm-on">✅ Autorizado</span> : <span className="perm-off">🚫 Sin permiso</span>}
            </div>
          </div>
          {!pNotas.permitido&&!pInscribir.permitido&&(
            <div className="mt-3 text-xs bg-yellow-50 text-yellow-700 p-2 rounded-lg font-semibold">
              ⚠️ No tienes permisos activos. Solicita al director que te autorice y espera la confirmación del administrador.
            </div>
          )}
        </div>

        <div className="g2">
          <div className="sc blue"><div className="text-3xl mb-1">🎓</div><div className="text-3xl font-extrabold text-gray-800">{est??0}</div><div className="text-sm text-gray-500 font-semibold">Estudiantes inscritos</div></div>
          <div className={`sc ${pNotas.permitido?'green':'red'}`}><div className="text-3xl mb-1">{pNotas.permitido?'✅':'🚫'}</div><div className="text-base font-extrabold text-gray-800">{pNotas.permitido?'Puedo ingresar notas':'Sin permiso de notas'}</div><div className="text-sm text-gray-500 font-semibold">Estado de permisos</div></div>
        </div>

        <div className="card">
          <div className="card-title">⚡ Acciones</div>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/dashboard/enlace/estudiantes" className="btn btn-p justify-center">🎓 Ver estudiantes</Link>
            {pNotas.permitido
              ? <Link href="/dashboard/enlace/notas" className="btn btn-s justify-center">📝 Ingresar notas</Link>
              : <div className="btn btn-g justify-center opacity-50 cursor-not-allowed">📝 Notas (sin permiso)</div>
            }
          </div>
        </div>
      </div>
    </div>
  )
}
