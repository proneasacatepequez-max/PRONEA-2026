'use client'
// src/app/login/page.tsx
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const sp = useSearchParams()
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const hoy = new Date().toLocaleDateString('es-GT', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Información de PRONEA
  const proneaInfo = {
    nombre: 'PRONEA',
    departamento: 'Sacatepéquez',
    nombreCompleto: 'Programa Nacional de Educación Alternativa',
    digee: 'Dirección General de Educación Extraescolar — DIGEEX',
    director: 'Mario Alfonso Toj Tepáz',
    telefono: '47109679',
    telefono2: '57123828',
    whatsapp: '47109679',
    correo: 'proneasacatepequez@gmail.com',
    horario: 'Lunes a Viernes: 8:00 AM - 4:00 PM',
    modalidades: [
      { nombre: 'Primaria Acelerada', descripcion: 'Semipresencial, A distancia y Virtual', edad: '13 años en adelante', icono: '🎓', color: 'from-green-500 to-emerald-600' },
      { nombre: 'Básico', descripcion: 'Semipresencial, A distancia y Virtual', edad: '15 años en adelante', icono: '📚', color: 'from-blue-500 to-indigo-600' },
      { nombre: 'Bachillerato', descripcion: 'Semipresencial, A distancia y Virtual', edad: '17 años en adelante', icono: '⭐', color: 'from-purple-500 to-pink-600' }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Patrón de fondo decorativo */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Contenedor principal */}
      <div className="w-full max-w-6xl relative z-10">
        {/* Tarjeta principal */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          <div className="grid lg:grid-cols-2">
            
            {/* ── COLUMNA IZQUIERDA: FORMULARIO DE LOGIN ── */}
            <div className="p-8 lg:p-10 bg-white/95 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-lg">
                  P
                </div>
                <div>
                  <div className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {proneaInfo.nombre}
                  </div>
                  <div className="text-gray-500 text-xs font-bold tracking-widest uppercase">
                    {proneaInfo.departamento}
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-2">Bienvenido</h2>
                <p className="text-gray-500 text-sm capitalize">{hoy}</p>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-lg mb-6 flex items-start gap-3 animate-shake">
                  <span className="text-lg">⚠️</span>
                  <span className="flex-1 text-sm font-medium">{error}</span>
                </div>
              )}

              <form onSubmit={login} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <input 
                      type="email" 
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                      placeholder="usuario@correo.com"
                      value={correo} 
                      onChange={e => setCorreo(e.target.value)} 
                      required 
                      autoComplete="email" 
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none"
                      placeholder="••••••••"
                      value={pass} 
                      onChange={e => setPass(e.target.value)} 
                      required 
                      autoComplete="current-password" 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 rounded-xl hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Verificando...
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

            {/* ── COLUMNA DERECHA: INFORMACIÓN DE PRONEA ── */}
            <div className="p-8 lg:p-10 text-white overflow-y-auto max-h-[80vh] lg:max-h-none">
              {/* Encabezado */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                  <span className="text-2xl">🏫</span>
                  <span className="font-semibold text-sm">PRONEA</span>
                </div>
                <h1 className="text-2xl font-bold mb-2">{proneaInfo.nombreCompleto}</h1>
                <p className="text-white/80 text-sm">{proneaInfo.digee}</p>
              </div>

              {/* Misión y Visión */}
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🎯</span>
                    <h3 className="font-bold text-white">Misión</h3>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{proneaInfo.mision}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👁️</span>
                    <h3 className="font-bold text-white">Visión</h3>
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{proneaInfo.vision}</p>
                </div>
              </div>

              {/* Contacto */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>📋</span> Contacto
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <span className="text-lg">👤</span>
                    <div>
                      <p className="text-xs text-white/60">Director</p>
                      <p className="text-sm font-semibold">{proneaInfo.director}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">📞</span>
                    <div>
                      <p className="text-xs text-white/60">Teléfono</p>
                      <p className="text-sm font-semibold">{proneaInfo.telefono}</p>
                      <p className="text-xs text-white/60">{proneaInfo.telefono2}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">💬</span>
                    <div>
                      <p className="text-xs text-white/60">WhatsApp</p>
                      <p className="text-sm font-semibold">{proneaInfo.whatsapp}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-lg">✉️</span>
                    <div>
                      <p className="text-xs text-white/60">Correo</p>
                      <p className="text-sm font-semibold break-all">{proneaInfo.correo}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modalidades de Estudio */}
              <div className="mb-8">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <span>📚</span> Modalidades de Estudio
                </h3>
                <div className="space-y-3">
                  {proneaInfo.modalidades.map((modalidad, idx) => (
                    <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{modalidad.icono}</span>
                          <h4 className="font-bold text-white">{modalidad.nombre}</h4>
                        </div>
                        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                          {modalidad.edad}
                        </span>
                      </div>
                      <p className="text-sm text-white/80">{modalidad.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Valores */}
              <div className="bg-gradient-to-r from-purple-600/30 to-indigo-600/30 backdrop-blur-sm rounded-xl p-5">
                <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                  <span>⭐</span> Nuestros Valores
                </h3>
                <div className="flex flex-wrap gap-2">
                  {proneaInfo.valores.map((valor, idx) => (
                    <span key={idx} className="px-3 py-1 bg-white/20 rounded-full text-sm">
                      {valor}
                    </span>
                  ))}
                </div>
              </div>

              {/* Horario */}
              <div className="mt-4 text-center text-white/60 text-xs">
                <p>🕐 {proneaInfo.horario}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <div className="text-lg font-semibold">Cargando PRONEA...</div>
          <div className="text-sm opacity-75 mt-2">Sistema de Educación Alternativa</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
