'use client'
// src/app/dashboard/coordinador/exportar/page.tsx
// FIX: redirige a grupos donde ya está el botón de exportar Excel
// El botón exportar inferior era redundante — se eliminó del coordinador/grupos
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CoordinadorExportarPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/dashboard/coordinador/grupos')
  }, [router])
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">📥 Exportar SIREEX</div></header>
      <div className="pc flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin" />
        <div className="text-sm text-gray-500">Redirigiendo a Grupos SIREEX...</div>
      </div>
    </div>
  )
}

