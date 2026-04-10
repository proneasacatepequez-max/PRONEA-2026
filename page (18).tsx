// src/app/api/public/info-login/route.ts
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const hoy = new Date().toISOString().split('T')[0]
  const [{ data:info }, { data:avisos }, { data:acuerdos }, { data:slider }] = await Promise.all([
    supabase.from('info_establecimiento').select('*').eq('id',1).single(),
    supabase.from('avisos').select('id,mensaje,fecha_inicio,fecha_fin').eq('activo',true).lte('fecha_inicio',hoy),
    supabase.from('acuerdos_ministeriales').select('id,numero,descripcion,url_documento').eq('activo',true),
    supabase.from('slider_imagenes').select('*').eq('activo',true).order('orden'),
  ])
  return NextResponse.json({ info:info??{}, avisos:avisos??[], acuerdos:acuerdos??[], slider:slider??[] })
}
