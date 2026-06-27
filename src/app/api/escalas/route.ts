// src/app/api/escala-asignaciones/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const ciclo    = req.nextUrl.searchParams.get('ciclo') || '2026'
    const etapa_id = req.nextUrl.searchParams.get('etapa_id')
    const id       = req.nextUrl.searchParams.get('id')

    let query = supabase
      .from('escala_asignaciones')
      .select(`
        id, etapa_id, libro_id, area_id, tecnico_id, ciclo_escolar,
        estado, observaciones, creado_en,
        etapa:etapas(id, codigo, nombre),
        libro:libros(id, numero, nombre),
        area:areas(id, nombre),
        tecnico:tecnicos(id, primer_nombre, primer_apellido, codigo_tecnico)
      `)
      .eq('ciclo_escolar', parseInt(ciclo))

    if (id) {
      query = query.eq('id', id)
      const { data, error } = await query.single()
      if (error) return NextResponse.json({ error: error.message }, { status: 404 })
      return NextResponse.json(data)
    }

    if (etapa_id) query = query.eq('etapa_id', parseInt(etapa_id))

    const { data, error } = await query.order('creado_en', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data || [])
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    if (!body.etapa_id)   return NextResponse.json({ error: 'etapa_id es requerido' },   { status: 400 })
    if (!body.tecnico_id) return NextResponse.json({ error: 'tecnico_id es requerido' }, { status: 400 })

    const { data: tecnico, error: tecnicoError } = await supabase
      .from('tecnicos').select('id').eq('id', body.tecnico_id).single()

    if (tecnicoError || !tecnico)
      return NextResponse.json({ error: 'Técnico no existe' }, { status: 404 })

    if (body.libro_id || body.area_id) {
      const { data: existing } = await supabase
        .from('escala_asignaciones')
        .select('id')
        .eq('etapa_id', body.etapa_id)
        .eq('libro_id', body.libro_id || null)
        .eq('area_id',  body.area_id  || null)
        .eq('ciclo_escolar', body.ciclo_escolar || 2026)
        .single()

      if (existing)
        return NextResponse.json(
          { error: 'Ya existe una asignación para esta combinación de etapa/libro/área' },
          { status: 409 }
        )
    }

    const { data: inserted, error: insertError } = await supabase
      .from('escala_asignaciones')
      .insert({
        etapa_id:      parseInt(body.etapa_id),
        libro_id:      body.libro_id      || null,
        area_id:       body.area_id       ? parseInt(body.area_id) : null,
        tecnico_id:    body.tecnico_id,
        ciclo_escolar: body.ciclo_escolar || 2026,
        estado:        'pendiente',
        observaciones: body.observaciones || null,
      })
      .select()
      .single()

    if (insertError)
      return NextResponse.json({ error: 'Error al guardar asignación: ' + insertError.message }, { status: 500 })

    return NextResponse.json({ ok: true, id: inserted.id, mensaje: '✅ Técnico asignado correctamente' }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

    const updates: any = {}
    if (body.tecnico_id)             updates.tecnico_id    = body.tecnico_id
    if (body.estado)                 updates.estado        = body.estado
    if (body.observaciones !== undefined) updates.observaciones = body.observaciones
    updates.actualizado_en = new Date().toISOString()

    const { error } = await supabase
      .from('escala_asignaciones').update(updates).eq('id', body.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mensaje: '✅ Asignación actualizada' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id es requerido' }, { status: 400 })

    const { error } = await supabase.from('escala_asignaciones').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mensaje: '✅ Asignación eliminada' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
