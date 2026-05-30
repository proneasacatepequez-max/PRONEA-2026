// src/app/api/public/info-login/route.ts
// CORRECCIÓN: usar supabaseAdmin para evitar problemas de RLS en tablas públicas
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0]

  const [
    { data: info    },
    { data: avisos  },
    { data: acuerdos },
    { data: slider  },
  ] = await Promise.all([
    supabaseAdmin.from('info_establecimiento').select('*').eq('id', 1).single(),
    supabaseAdmin.from('avisos').select('id,mensaje,fecha_inicio,fecha_fin')
      .eq('activo', true).lte('fecha_inicio', hoy),
    supabaseAdmin.from('acuerdos_ministeriales')
      .select('id,numero,descripcion,url_documento').eq('activo', true),
    supabaseAdmin.from('slider_imagenes')
      .select('id,titulo,url_imagen,url_enlace,orden').eq('activo', true).order('orden'),
  ])

  return NextResponse.json({
    info:     info     ?? {},
    avisos:   avisos   ?? [],
    acuerdos: acuerdos ?? [],
    slider:   slider   ?? [],
  })
}
