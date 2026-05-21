// src/app/api/discapacidades/route.ts — dropdown para ajustes
import { supabaseAdmin } from '@/lib/supabase'
import { ok } from '@/lib/auth'

const ESTATICO = [
  {id:1,nombre:'Ninguna'},{id:2,nombre:'Intelectual Leve'},{id:3,nombre:'Intelectual Moderada'},
  {id:4,nombre:'Intelectual Grave'},{id:5,nombre:'Intelectual Profunda'},{id:6,nombre:'TEA (Autismo)'},
  {id:7,nombre:'Visual (Ceguera)'},{id:8,nombre:'Baja Visión'},{id:9,nombre:'Auditiva (Sordera)'},
  {id:10,nombre:'Pérdida Auditiva Leve'},{id:11,nombre:'Física o Motora'},{id:12,nombre:'Mental / Psicosocial'},
  {id:13,nombre:'Múltiple'},{id:14,nombre:'Gente Pequeña'},{id:15,nombre:'Problemas de Aprendizaje'},
  {id:16,nombre:'Pendiente de Diagnóstico'},
]

export async function GET() {
  const { data } = await supabaseAdmin.from('discapacidades').select('id,nombre').order('nombre')
  if (data?.length) return ok(data)
  const { data: d2 } = await supabaseAdmin.from('tipos_discapacidad').select('id,nombre').order('nombre')
  if (d2?.length) return ok(d2)
  return ok(ESTATICO)
}
