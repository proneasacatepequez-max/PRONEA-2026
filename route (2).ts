// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Cliente browser (respeta RLS)
export const supabase = createClient(url, anon)

// Cliente servidor — SOLO en API routes, nunca en componentes 'use client'
export const supabaseAdmin = createClient(url, svc, {
  auth: { autoRefreshToken: false, persistSession: false },
})
