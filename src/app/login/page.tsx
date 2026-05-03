'use client'
// src/app/login/page.tsx
// CORRECCIÓN: useSearchParams() debe estar dentro de <Suspense>
// Solución: separar en dos componentes — LoginForm usa useSearchParams, LoginPage lo envuelve en Suspense

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface LoginInfo {
  info: any
  avisos: any[]
  acuerdos: any[]
  slider: any[]
}

// ── Componente interno que usa useSearchParams ─────────────────
function LoginForm() {
  const router      = useRouter()
  const sp          = useSearchParams()
  const [correo,  setCorreo]  = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [data,    setData]    = useState<LoginInfo>({ info:{}, avisos:[], acuerdos:[], slider:[] })
  const [sliderIdx, setSliderIdx] = useState(0)

  useEffect(() => {
    fetch('/api/public/info-login')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (data.slider.length > 1) {
      const t = setInterval(() => {
        setSliderIdx(i => (i + 1) % data.slider.length)
      }, 4000)
      return () => clearInterval(t)
    }
  }, [data.slider.length])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ correo, contrasena: pass }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error ?? 'Error al ingresar')
        return
      }
      const redirect = sp.get('redirect') ?? d.redireccion
      router.push(redirect)
    } catch {
      setError('Error de conexión. Verifica tu internet.')
    } finally {
      setLoading(false)
    }
  }

  const info = data.info as any
  const hoy  = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-pronea-dark to-pronea flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex min-h-[600px]">

        {/* ── Formulario de login ── */}
        <div className="w-96 flex-shrink-0 flex flex-col p-10">
          <div className="flex items-center gap-3 mb-10">
            {info.logo_url
              ? <img src={info.logo_url} alt="PRONEA" className="h-12 w-auto object-contain" />
              : <div className="w-12 h-12 bg-pronea rounded-xl flex items-center justify-center text-white font-extrabold text-xl">P</div>
            }
            <div>
              <div className="text-pronea font-extrabold text-xl leading-none">{info.nombre_corto ?? 'PRONEA'}</div>
              <div className="text-gray-400 text-xs font-bold tracking-widest uppercase">{info.departamento ?? 'Sacatepéquez'}</div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-400 mb-8 capitalize">{hoy}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={login} className="flex flex-col gap-4">
            <div>
              <label className="lbl">Correo electrónico</label>
              <input
                type="email"
                className="inp"
                placeholder="usuario@pronea.gob.gt"
                value={correo}
                onChange={e => setCorreo(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="lbl">Contraseña</label>
              <input
                type="password"
                className="inp"
                placeholder="••••••••"
                value={pass}
                onChange={e => setPass(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-p justify-center py-3 text-base mt-2"
            >
              {loading
                ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verificando...
                  </span>
                )
                : 'Ingresar al Sistema'
              }
            </button>
          </form>

          <div className="mt-auto pt-8 text-center text-xs text-gray-300">
            PRONEA Sacatepéquez © 2026 · v4.0
          </div>
        </div>

        {/* ── Panel informativo ── */}
        <div className="flex-1 bg-gradient-to-br from-pronea to-pronea-dark text-white overflow-y-auto relative">
          {data.slider.map((img: any, i: number) => (
            <div
              key={img.id}
              className={`absolute inset-0 transition-opacity duration-1000 ${i === sliderIdx ? 'opacity-100' : 'opacity-0'}`}
            >
              <img src={img.url_imagen} alt="" className="w-full h-full object-cover opacity-15" />
            </div>
          ))}

          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/15">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-content text-2xl flex-shrink-0">🏫</div>
              <div>
                <h2 className="font-extrabold text-base leading-tight">
                  {info.nombre_completo ?? 'Programa Nacional de Educación Alternativa'}
                </h2>
                <p className="text-white/60 text-xs mt-0.5">Dirección General de Educación Extraescolar — DIGEEX</p>
              </div>
            </div>

            <div className="mb-5">
              <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">📋 Contacto</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon:'👤', label:'Director',  val: info.director_nombre ?? '—' },
                  { icon:'📞', label:'Teléfono',  val: info.telefono ?? '—' },
                  { icon:'💬', label:'WhatsApp',  val: info.whatsapp ?? '—' },
                  { icon:'✉️', label:'Correo',    val: info.correo ?? '—' },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="bg-white/8 rounded-lg px-3 py-2">
                    <div className="text-white/50 text-[10px] font-bold">{icon} {label}</div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {info.horario_atencion && (
              <div className="mb-5">
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">🕐 Horario</div>
                <div className="bg-white/8 rounded-lg px-3 py-2 text-xs">{info.horario_atencion}</div>
              </div>
            )}

            {data.avisos.length > 0 && (
              <div>
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">📢 Avisos</div>
                {data.avisos.map((a: any) => (
                  <div key={a.id} className="border-l-2 border-yellow-400 bg-yellow-400/10 rounded-r-lg px-3 py-2 mb-1.5 text-xs font-semibold">
                    ⚡ {a.mensaje}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Componente principal — envuelve LoginForm en Suspense ──────
// Esto es OBLIGATORIO en Next.js 15 cuando se usa useSearchParams()
export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-pronea-dark flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <div className="text-sm font-semibold opacity-75">Cargando PRONEA...</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
