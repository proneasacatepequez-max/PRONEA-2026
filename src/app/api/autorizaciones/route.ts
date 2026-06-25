// src/app/api/autorizaciones/route.ts
// FIX CRÍTICO #4: Crear y actualizar autorizaciones correctamente
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Listar autorizaciones
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    let query = supabase
      .from('autorizaciones_director')
      .select(`
        id, director_id, enlace_id, permiso, activo,
        fecha_inicio, fecha_fin, fecha_firma,
        director:directores(id, primer_nombre, primer_apellido),
        enlace:enlaces_institucionales(
          id, primer_nombre, primer_apellido, usuario_id,
          sede:sedes(id, nombre)
        )
      `)

    // Si es director, mostrar solo sus autorizaciones
    if (session.rol === 'director') {
      const { data: director } = await supabase
        .from('directores')
        .select('id')
        .eq('usuario_id', session.id)
        .single()

      if (director) {
        query = query.eq('director_id', director.id)
      }
    }

    const { data, error } = await query.order('fecha_firma', { ascending: false })

    if (error) {
      console.error('GET error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (err: any) {
    console.error('GET exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// POST - Crear autorización
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    const body = await req.json()

    // Validaciones
    if (!body.enlace_id) {
      return NextResponse.json({ error: 'enlace_id es requerido' }, { status: 400 })
    }
    if (!body.permiso) {
      return NextResponse.json({ error: 'permiso es requerido' }, { status: 400 })
    }

    // Obtener director del usuario actual
    const { data: director, error: directorError } = await supabase
      .from('directores')
      .select('id, sede_id')
      .eq('usuario_id', session.id)
      .single()

    if (directorError || !director) {
      return NextResponse.json(
        { error: 'Director no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que enlace existe y pertenece a la misma sede
    const { data: enlace, error: enlaceError } = await supabase
      .from('enlaces_institucionales')
      .select('id, sede_id')
      .eq('id', body.enlace_id)
      .single()

    if (enlaceError || !enlace) {
      return NextResponse.json(
        { error: 'Enlace no encontrado' },
        { status: 404 }
      )
    }

    if (enlace.sede_id !== director.sede_id) {
      return NextResponse.json(
        { error: 'El enlace no pertenece a tu sede' },
        { status: 403 }
      )
    }

    // ✅ CORREGIDO: Verificar que el permiso existe en permisos_globales
    const { data: permiso, error: permisoError } = await supabase
      .from('permisos_globales')
      .select('permiso')
      .eq('permiso', body.permiso)
      .eq('activo', true)
      .single()

    if (permisoError || !permiso) {
      return NextResponse.json(
        { error: `El permiso '${body.permiso}' no existe o no está activo` },
        { status: 404 }
      )
    }

    // Verificar que no existe autorización duplicada activa
    const { data: existing } = await supabase
      .from('autorizaciones_director')
      .select('id')
      .eq('enlace_id', body.enlace_id)
      .eq('permiso', body.permiso)
      .eq('activo', true)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Este enlace ya tiene esta autorización activa' },
        { status: 409 }
      )
    }

    const today = new Date().toISOString().split('T')[0]

    const { data: inserted, error: insertError } = await supabase
      .from('autorizaciones_director')
      .insert({
        director_id: director.id,
        enlace_id: body.enlace_id,
        permiso: body.permiso,
        activo: true,
        fecha_inicio: body.fecha_inicio || today,
        fecha_fin: body.fecha_fin || null,
        observaciones: body.observaciones || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar autorización: ' + insertError.message },
        { status: 500 }
      )
    }

    console.log('✅ Autorización creada:', inserted.id)

    return NextResponse.json(
      {
        ok: true,
        id: inserted.id,
        mensaje: '✅ Autorización creada correctamente',
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('POST exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// PATCH - Actualizar autorización
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const updates: any = {}
    if (body.activo !== undefined) updates.activo = body.activo
    if (body.fecha_fin !== undefined) updates.fecha_fin = body.fecha_fin
    if (body.observaciones !== undefined) updates.observaciones = body.observaciones

    const { data, error } = await supabase
      .from('autorizaciones_director')
      .update(updates)
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: '✅ Autorización actualizada correctamente',
    })
  } catch (err: any) {
    console.error('PATCH exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// DELETE - Revocar autorización
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id es requerido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('autorizaciones_director')
      .update({ activo: false })
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      mensaje: '✅ Autorización revocada correctamente',
    })
  } catch (err: any) {
    console.error('DELETE exception:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
