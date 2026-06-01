// src/app/dashboard/enlace/perfil/page.tsx
'use client'
import PerfilEditor from '@/components/perfil/PerfilEditor'
export default function EnlacePerfilPage() {
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc max-w-4xl"><PerfilEditor rol="enlace_institucional" /></div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// src/app/dashboard/coordinador/perfil/page.tsx  
// ─────────────────────────────────────────────────────────────
// (archivo separado — crear en carpeta coordinador/perfil/)

