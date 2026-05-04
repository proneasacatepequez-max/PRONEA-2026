// src/app/api/diagnostico/route.ts
// PÁGINA TEMPORAL DE DIAGNÓSTICO — borra este archivo después de resolver el problema
import { NextResponse } from 'next/server'

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    variables: {},
    supabase: {},
    usuario: {},
  }

  // 1. Verificar variables de entorno
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const jwt  = process.env.JWT_SECRET

  results.variables = {
    NEXT_PUBLIC_SUPABASE_URL:      url  ? `✅ ${url.substring(0,40)}...` : '❌ NO DEFINIDA',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? `✅ ${anon.substring(0,20)}...` : '❌ NO DEFINIDA',
    SUPABASE_SERVICE_ROLE_KEY:     svc  ? `✅ ${svc.substring(0,20)}...`  : '❌ NO DEFINIDA',
    JWT_SECRET:                    jwt  ? `✅ (${jwt.length} caracteres)`  : '❌ NO DEFINIDA',
  }

  if (!url || !svc) {
    results.supabase = { error: 'Variables de Supabase no definidas — configura en Vercel → Settings → Environment Variables' }
    return NextResponse.json(results, { status: 200 })
  }

  // 2. Probar conexión a Supabase
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(url, svc, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Ping simple
    const { error: pingError } = await admin.from('usuarios').select('count').limit(1)
    if (pingError) {
      results.supabase = {
        conexion: '❌ ERROR',
        error: pingError.message,
        hint: pingError.message.includes('relation') 
          ? 'La tabla usuarios no existe — ejecuta el SQL de migración en Supabase'
          : 'Verifica que la URL y la clave service_role sean correctas'
      }
    } else {
      results.supabase.conexion = '✅ Conectado correctamente'

      // 3. Verificar si existe el usuario admin
      const { data: usuarios, error: uError } = await admin
        .from('usuarios')
        .select('id, correo, rol, activo, contrasena_hash')
        .in('rol', ['administrador'])
        .limit(5)

      if (uError) {
        results.usuario = { error: uError.message }
      } else if (!usuarios || usuarios.length === 0) {
        results.usuario = {
          status: '❌ NO EXISTE ningún usuario administrador',
          solucion: 'Ejecuta el SQL de creación de admin en Supabase → SQL Editor',
        }
      } else {
        results.usuario = {
          status: `✅ Existen ${usuarios.length} usuario(s) administrador(es)`,
          usuarios: usuarios.map((u: any) => ({
            correo: u.correo,
            rol: u.rol,
            activo: u.activo,
            tiene_hash: u.contrasena_hash ? `✅ Sí (${u.contrasena_hash.substring(0,7)}...)` : '❌ Sin contraseña',
          }))
        }
      }

      // 4. Verificar total de usuarios
      const { count } = await admin.from('usuarios').select('*', { count: 'exact', head: true })
      results.supabase.total_usuarios = count ?? 0
    }
  } catch (e: any) {
    results.supabase = { error: `Error de conexión: ${e.message}` }
  }

  return NextResponse.json(results, {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  })
}
