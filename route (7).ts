'use client'
// src/app/login/page.tsx
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const [correo, setCorreo] = useState('')
  const [pass, setPass] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState<any>({ info:{}, avisos:[], acuerdos:[], slider:[] })
  const [sliderIdx, setSliderIdx] = useState(0)

  useEffect(() => {
    fetch('/api/public/info-login').then(r=>r.json()).then(setInfo).catch(()=>{})
  }, [])

  useEffect(() => {
    if (info.slider?.length > 1) {
      const t = setInterval(() => setSliderIdx(i => (i+1) % info.slider.length), 4500)
      return () => clearInterval(t)
    }
  }, [info.slider?.length])

  const login = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ correo, contrasena: pass })
      })
      const d = await res.json()
      if (!res.ok) { setError(d.error ?? 'Error al ingresar'); return }
      router.push(sp.get('redirect') ?? d.redireccion)
    } catch { setError('Error de conexión') } finally { setLoading(false) }
  }

  const hoy = new Date().toLocaleDateString('es-GT',{weekday:'long',year:'numeric',month:'long',day:'numeric'})

  return (
    <div className="min-h-screen bg-gradient-to-br from-pronea-dark to-pronea flex items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden flex min-h-[600px]">

        {/* ── FORMULARIO ── */}
        <div className="w-96 flex-shrink-0 flex flex-col p-10">
          <div className="flex items-center gap-3 mb-10">
            {info.info?.logo_url
              ? <img src={info.info.logo_url} alt="Logo" className="h-12 w-auto object-contain"/>
              : <div className="w-12 h-12 bg-pronea rounded-xl flex items-center justify-center text-white font-extrabold text-xl">P</div>
            }
            <div>
              <div className="text-pronea font-extrabold text-xl leading-none">{info.info?.nombre_corto ?? 'PRONEA'}</div>
              <div className="text-gray-400 text-[10px] font-bold tracking-widest uppercase">Sacatepéquez</div>
            </div>
          </div>

          <h2 className="text-2xl font-extrabold text-gray-800 mb-1">Bienvenido</h2>
          <p className="text-sm text-gray-500 mb-7 capitalize">{hoy}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-lg px-4 py-3 mb-4 flex items-center gap-2">
              <span>⚠️</span>{error}
            </div>
          )}

          <form onSubmit={login} className="flex flex-col gap-4">
            <div>
              <label className="lbl">Correo electrónico</label>
              <input type="email" className="inp" placeholder="usuario@pronea.gob.gt"
                value={correo} onChange={e=>setCorreo(e.target.value)} required autoComplete="email"/>
            </div>
            <div>
              <label className="lbl">Contraseña</label>
              <input type="password" className="inp" placeholder="••••••••"
                value={pass} onChange={e=>setPass(e.target.value)} required autoComplete="current-password"/>
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-p justify-center py-3 text-base mt-2 disabled:opacity-60">
              {loading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verificando...</span>
                : 'Ingresar al Sistema'}
            </button>
          </form>

          <div className="flex justify-between mt-4">
            <button className="text-xs text-pronea-secondary font-semibold hover:underline">¿Olvidó su contraseña?</button>
            <button className="text-xs text-pronea-secondary font-semibold hover:underline">¿Primer ingreso?</button>
          </div>
          <div className="mt-auto pt-8 text-center text-xs text-gray-300">Sistema PRONEA © 2026 · v4.0</div>
        </div>

        {/* ── PANEL DERECHO ── */}
        <div className="flex-1 bg-gradient-to-br from-pronea to-pronea-dark text-white overflow-y-auto relative">
          {info.slider?.length > 0 && (
            <div className="absolute inset-0">
              {info.slider.map((img:any, i:number) => (
                <div key={img.id} className={`absolute inset-0 transition-opacity duration-700 ${i===sliderIdx?'opacity-100':'opacity-0'}`}>
                  <img src={img.url_imagen} alt={img.titulo??''} className="w-full h-full object-cover opacity-20"/>
                </div>
              ))}
            </div>
          )}
          <div className="relative p-8">
            <div className="flex items-center gap-3 mb-6 pb-5 border-b border-white/15">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🏫</div>
              <div>
                <h2 className="font-extrabold text-base leading-tight">Programa Nacional de Educación Alternativa</h2>
                <p className="text-white/60 text-xs mt-0.5">Dirección General de Educación Extraescolar — DIGEEX</p>
              </div>
            </div>

            {/* Contacto */}
            <div className="mb-5">
              <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">📋 Contacto</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  {icon:'👤',label:'Director',val:info.info?.director_nombre??'—'},
                  {icon:'📞',label:'Teléfono',val:info.info?.telefono??'—'},
                  {icon:'💬',label:'WhatsApp',val:info.info?.whatsapp??'—'},
                  {icon:'✉️',label:'Correo',val:info.info?.correo??'—'},
                ].map(({icon,label,val})=>(
                  <div key={label} className="bg-white/8 rounded-lg px-3 py-2">
                    <div className="text-white/50 text-[10px] font-bold">{icon} {label}</div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horario */}
            {info.info?.horario_atencion && (
              <div className="mb-5">
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">🕐 Horario</div>
                <div className="bg-white/8 rounded-lg px-3 py-2 text-xs">{info.info.horario_atencion}</div>
              </div>
            )}

            {/* Acuerdos */}
            {info.acuerdos?.length > 0 && (
              <div className="mb-5">
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">📄 Acuerdos vigentes</div>
                {info.acuerdos.map((a:any) => (
                  <div key={a.id} className="bg-white/8 rounded-lg px-3 py-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-400 text-gray-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full">{a.numero}</span>
                      {a.url_documento && <a href={a.url_documento} target="_blank" rel="noreferrer" className="text-yellow-300 text-[10px] hover:underline">Ver PDF</a>}
                    </div>
                    <div className="text-xs mt-1 text-white/80">{a.descripcion}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Avisos */}
            {info.avisos?.length > 0 && (
              <div>
                <div className="text-white/50 text-[10px] font-bold uppercase tracking-widest mb-2">📢 Avisos</div>
                {info.avisos.map((a:any) => (
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
