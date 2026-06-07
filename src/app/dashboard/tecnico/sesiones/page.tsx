'use client'
// src/app/dashboard/tecnico/sesiones/page.tsx — NUEVA PÁGINA (corrige 404)
// Las sesiones se gestionan desde Planif. DUA — redirige automáticamente
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TecnicoSesionesPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/tecnico/dua')
  }, [router])

  return (
    <div className="ap">
      <header className="topbar">
        <div className="page-title">📅 Sesiones DUA</div>
      </header>
      <div className="pc flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-gray-500">Redirigiendo a Planificación DUA...</div>
      </div>
    </div>
  )
}
