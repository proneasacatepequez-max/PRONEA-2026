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
  const [showPassword, setShowPassword] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)

  const hoy = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Información de PRONEA
  const proneaInfo = {
    nombre: 'PRONEA',
    departamento: 'Sacatepéquez',
    nombreCompleto: 'Programa Nacional de Educación Alternativa',
    lema: 'Está donde tú estás',
    digee: 'Dirección General de Educación Extraescolar — DIGEEX',
    director: 'Mario Alfonso Toj Tepáz',
    telefono: '47109679',
    telefono2: '57123828',
    whatsapp: '47109679',
    correo: 'proneasacatepequez@gmail.com',
    horario: 'Lunes a Viernes: 8:00 AM - 4:00 PM',
    modalidades: [
      { nombre: 'Primaria Acelerada', descripcion: 'Semipresencial, A distancia y Virtual', edad: '13 años en adelante', icono: '🎓' },
      { nombre: 'Básico', descripcion: 'Semipresencial, A distancia y Virtual', edad: '15 años en adelante', icono: '📚' },
      { nombre: 'Bachillerato', descripcion: 'Semipresencial, A distancia y Virtual', edad: '17 años en adelante', icono: '⭐' }
    ],
    mision: 'Ofrecer educación de calidad a través de modalidades flexibles que se adapten a las necesidades de la población guatemalteca.',
    vision: 'Ser el programa líder en educación alternativa en Guatemala, reconocido por su innovación y compromiso con la inclusión educativa.',
    valores: ['Excelencia', 'Inclusión', 'Compromiso', 'Innovación', 'Responsabilidad']
  }

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
      if (!res.ok) { 
        setError(d.error ?? 'Credenciales incorrectas')
        return 
      }
      router.push(sp.get('redirect') ?? d.redireccion)
    } catch { 
      setError('Error de conexión') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative">
      {/* Patrón de fondo profesional */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #2563EB 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* Contenedor principal */}
      <div className="w-full max-w-6xl relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 transition-all duration-300">
          <div className="grid lg:grid-cols-2">
            
            {/* ── COLUMNA IZQUIERDA: FORMULARIO ── */}
            <div className="p-10 bg-white">
              {/* Logo y título */}
              <div className="mb-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative w-16 h-16 flex-shrink-0">
                    <Image
                      src="/images/logo-pronea.png"
                      alt="PRONEA"
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-800 tracking-tight">
                      {proneaInfo.nombre}
                    </div>
                    <div className="text-blue-600 text-xs font-semibold tracking-wider uppercase">
                      {proneaInfo.departamento}
                    </div>
                    <div className="text-gray-500 text-xs italic mt-1">
                      {proneaInfo.lema}
                    </div>
                  </div>
                </div>
                
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido</h1>
                <p className="text-gray-500 text-sm capitalize">{hoy}</p>
              </div>

              {/* Mensaje de error */}
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3 animate-slideDown">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={login} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'transform scale-[1.01]' : ''}`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input 
                      type="email" 
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-gray-800"
                      placeholder="usuario@correo.com"
                      value={correo} 
                      onChange={e => setCorreo(e.target.value)} 
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required 
                      autoComplete="email" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'transform scale-[1.01]' : ''}`}>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all outline-none text-gray-800"
                      placeholder="••••••••"
                      value={pass} 
                      onChange={e => setPass(e.target.value)} 
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required 
                      autoComplete="current-password" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 rounded-xl shadow-md hover:shadow-lg transform hover:scale-[1.01] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando credenciales...
                    </span>
                  ) : 'Ingresar al Sistema'}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-400">
                  PRONEA Sacatepéquez © 2026 · v4.0
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Desarrollado por MARCOS SIAN
                </p>
              </div>
            </div>

            {/* ── COLUMNA DERECHA: INFORMACIÓN INSTITUCIONAL ── */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-10 text-white overflow-y-auto max-h-[85vh] lg:max-h-none">
              {/* Logo grande */}
              <div className="text-center mb-8">
                <div className="relative w-32 h-32 mx-auto mb-4 bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                  <Image
                    src="/images/logo-pronea-white.png"
                    alt="PRONEA"
                    fill
                    className="object-contain p-3"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">{proneaInfo.nombreCompleto}</h2>
                <p className="text-blue-100 text-sm italic">{proneaInfo.lema}</p>
                <div className="w-20 h-0.5 bg-blue-400 mx-auto mt-4"></div>
                <p className="text-blue-100 text-xs mt-3">{proneaInfo.digee}</p>
              </div>

              {/* Misión y Visión */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h3 className="font-bold text-white">Misión</h3>
                  </div>
                  <p className="text-sm text-blue-50 leading-relaxed">{proneaInfo.mision}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👁️</span>
                    <h3 className="font-bold text-white">Visión</h3>
                  </div>
                  <p className="text-sm text-blue-50 leading-relaxed">{proneaInfo.vision}</p>
                </div>
              </div>

              {/* Contacto Directo */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">📋</span> Contacto Directo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <span className="text-xl">👤</span>
                    <div>
                      <p className="text-xs text-blue-200">Director</p>
                      <p className="text-sm font-semibold">{proneaInfo.director}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">📞</span>
                    <div>
                      <p className="text-xs text-blue-200">Teléfono</p>
                      <p className="text-sm font-semibold">{proneaInfo.telefono}</p>
                      <p className="text-xs text-blue-200">{proneaInfo.telefono2}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">💬</span>
                    <div>
                      <p className="text-xs text-blue-200">WhatsApp</p>
                      <p className="text-sm font-semibold">{proneaInfo.whatsapp}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">✉️</span>
                    <div>
                      <p className="text-xs text-blue-200">Correo</p>
                      <p className="text-sm font-semibold break-all">{proneaInfo.correo}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modalidades */}
              <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="text-2xl">📚</span> Modalidades
                </h3>
                <div className="space-y-3">
                  {proneaInfo.modalidades.map((modalidad, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/15 transition-all group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl group-hover:scale-110 transition-transform">{modalidad.icono}</span>
                          <h4 className="font-bold text-white">{modalidad.nombre}</h4>
                        </div>
                        <span className="text-xs bg-blue-500/30 px-3 py-1 rounded-full font-semibold">
                          {modalidad.edad}
                        </span>
                      </div>
                      <p className="text-sm text-blue-100 pl-9">{modalidad.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores y Horario */}
              <div className="bg-blue-700/50 backdrop-blur-sm rounded-xl p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <span className="text-2xl">⭐</span> Valores
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {proneaInfo.valores.map((valor, idx) => (
                      <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                        {valor}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-blue-500/30">
                  <p className="text-center text-blue-100 text-sm">
                    🕐 {proneaInfo.horario}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-blue-200 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <div className="text-lg font-semibold text-gray-700">Cargando PRONEA</div>
          <div className="text-sm text-gray-500 mt-2">Sistema de Educación Alternativa</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
