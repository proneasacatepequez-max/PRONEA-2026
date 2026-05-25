'use client'
// src/app/login/page.tsx
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<any>({})
  const [avisos, setAvisos] = useState<any[]>([])
  const [slider, setSlider] = useState<any[]>([])
  const [sliderIdx, setSliderIdx] = useState(0)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    fetch('/api/public/info-login').then(r => r.json()).then(d => {
      setInfo(d.info ?? {})
      setAvisos(d.avisos ?? [])
      setSlider(d.slider ?? [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (slider.length > 1) {
      const t = setInterval(() => setSliderIdx(i => (i + 1) % slider.length), 4000)
      return () => clearInterval(t)
    }
  }, [slider.length])

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, contrasena: pass }),
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Credenciales incorrectas'); return }
      router.push(sp.get('redirect') ?? d.redireccion)
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  const hoy = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // ESTRUCTURA COMPLETA DE ETAPAS EDUCATIVAS
  const ETAPAS_EDUCATIVAS = [
    {
      nivel: 'Primaria Acelerada',
      icono: '📗',
      color: 'from-green-500/20 to-green-600/20',
      etapas: [
        { nombre: '1ra. Etapa Primaria', grados: '1ero, 2do y 3ero Primaria', edad: '13 años en adelante' },
        { nombre: '2da. Etapa Primaria', grados: '4to, 5to y 6to Primaria', edad: '13 años en adelante' }
      ]
    },
    {
      nivel: 'Básico',
      icono: '📘',
      color: 'from-blue-500/20 to-blue-600/20',
      etapas: [
        { nombre: '1ra. Etapa Básico', grados: '1ero y 2do Básico', edad: '15 años en adelante' },
        { nombre: '2da. Etapa Básico', grados: '3ero Básico', edad: '15 años en adelante' }
      ]
    },
    {
      nivel: 'Bachillerato',
      icono: '📙',
      color: 'from-purple-500/20 to-purple-600/20',
      etapas: [
        { nombre: '4to. Bachillerato', grados: 'Cuarto Bachillerato', edad: '17 años en adelante' },
        { nombre: '5to. Bachillerato', grados: 'Quinto Bachillerato', edad: '17 años en adelante' }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">

        {/* ── FORMULARIO ── */}
        <div className="w-full md:w-96 flex-shrink-0 flex flex-col p-8 md:p-10 bg-white">
          {/* Logo y Sacatepéquez - Espacio reducido */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-32 h-32 mb-1">
              <Image
                src="/images/logo-pronea.png"
                alt="PRONEA"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="text-blue-700 text-sm font-bold tracking-widest uppercase text-center">
              {info.departamento ?? 'Sacatepéquez'}
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-500 mb-6 capitalize">{hoy}</p>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-semibold rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={login} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Correo electrónico</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none text-gray-800"
                placeholder="usuario@correo.com"
                value={correo} 
                onChange={e => setCorreo(e.target.value)} 
                required 
                autoComplete="email" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none pr-12 text-gray-800"
                  placeholder="••••••••"
                  value={pass} 
                  onChange={e => setPass(e.target.value)} 
                  required 
                  autoComplete="current-password" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-bold py-3 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="mt-auto pt-6 text-center text-xs text-blue-600 font-semibold">
            PRONEA Sacatepéquez © 2026 · v4.0 | AUTOR: MARCOS SIAN
          </div>
        </div>

        {/* ── PANEL INFORMATIVO CON JERARQUÍA VISUAL ── */}
        <div className="flex-1 bg-gradient-to-br from-blue-800 to-blue-950 text-white overflow-y-auto relative">
          {slider.map((img: any, i: number) => (
            <div key={img.id ?? i} className={`absolute inset-0 transition-opacity duration-1000 ${i === sliderIdx ? 'opacity-100' : 'opacity-0'}`}>
              <img src={img.url_imagen} alt="" className="w-full h-full object-cover opacity-10" />
            </div>
          ))}

          <div className="relative p-6 md:p-7 space-y-6">
            
            {/* TÍTULO PRINCIPAL - Grande */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/20">
              <div className="relative w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden p-2">
                <Image
                  src="/images/logo-pronea.png"
                  alt="PRONEA"
                  fill
                  className="object-contain brightness-0 invert"
                />
              </div>
              <div>
                <h1 className="text-lg font-black leading-tight text-white">
                  {info.nombre_completo ?? 'Programa Nacional de Educación Alternativa'}
                </h1>
                <p className="text-xs text-blue-200 mt-0.5">Dirección General de Educación Extraescolar — DIGEEX</p>
              </div>
            </div>

            {/* SECCIÓN CONTACTO */}
            <div>
              <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">📋 Contacto</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '👤', label: 'Director', val: info.director_nombre ?? 'Mario Alfonso Toj Tepáz' },
                  { icon: '📞', label: 'Teléfono', val: info.telefono ?? '47109679 o al 57123828' },
                  { icon: '💬', label: 'WhatsApp', val: info.whatsapp ?? '47109679' },
                  { icon: '✉️', label: 'Correo', val: info.correo ?? 'proneasacatepequez@gmail.com' },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="bg-white/10 rounded-lg px-3 py-2 hover:bg-white/15 transition-all">
                    <div className="text-blue-300 text-xs font-semibold">{icon} {label}</div>
                    <div className="text-sm font-medium mt-0.5 truncate text-white">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN HORARIO */}
            {info.horario_atencion && (
              <div>
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2">🕐 Horario de Atención</h3>
                <div className="bg-white/10 rounded-lg px-3 py-2 text-sm text-white">{info.horario_atencion}</div>
              </div>
            )}

            {/* SECCIÓN MODALIDADES - JERARQUÍA CLARA */}
            <div>
              <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-3">📚 Modalidades de Estudio</h3>
              <div className="space-y-3">
                {ETAPAS_EDUCATIVAS.map((nivel) => (
                  <div key={nivel.nivel} className={`bg-gradient-to-r ${nivel.color} rounded-xl overflow-hidden border border-white/15`}>
                    {/* Título del nivel - Grande */}
                    <div className="bg-white/20 px-4 py-2.5 flex items-center gap-2">
                      <span className="text-xl">{nivel.icono}</span>
                      <span className="font-bold text-base text-white">{nivel.nivel}</span>
                    </div>
                    {/* Subtítulos y contenido */}
                    <div className="p-3 space-y-2">
                      {nivel.etapas.map((etapa, idx) => (
                        <div key={idx} className="bg-white/10 rounded-lg p-2.5 hover:bg-white/15 transition-all">
                          <div className="flex items-center justify-between mb-1">
                            {/* Subtítulo - Mediano */}
                            <span className="text-sm font-semibold text-white">{etapa.nombre}</span>
                            {/* Texto pequeño - Edad */}
                            <span className="text-[10px] bg-blue-500/30 px-2 py-0.5 rounded-full text-blue-100">
                              {etapa.edad}
                            </span>
                          </div>
                          {/* Texto descriptivo - Pequeño */}
                          <p className="text-xs text-blue-200 pl-1">{etapa.grados}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN AVISOS */}
            {avisos.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider mb-2">📢 Avisos Importantes</h3>
                {avisos.map((a: any) => (
                  <div key={a.id} className="border-l-2 border-yellow-400 bg-yellow-400/15 rounded-r-lg px-3 py-2.5 mb-2">
                    <p className="text-xs font-semibold text-white">⚡ {a.mensaje}</p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
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
