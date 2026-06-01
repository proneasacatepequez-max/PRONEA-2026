// ─────────────────────────────────────────────────────────────
// src/app/dashboard/tecnico/perfil/page.tsx
// ─────────────────────────────────────────────────────────────
'use client'
import PerfilEditor from '@/components/perfil/PerfilEditor'

export default function TecnicoPerfilPage() {
  return (
    <div className="ap">
      <header className="topbar"><div className="page-title">👤 Mi Perfil</div></header>
      <div className="pc max-w-4xl"><PerfilEditor rol="tecnico" /></div>
    </div>
  )
}
