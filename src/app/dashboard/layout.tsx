// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import Sidebar from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children:React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')
  const nombre = session.correo.split('@')[0].replace(/[._]/g,' ').replace(/\b\w/g, c=>c.toUpperCase())
  return (
    <div className="flex min-h-screen">
      <Sidebar rol={session.rol} nombre={nombre} correo={session.correo}/>
      <div className="main">{children}</div>
    </div>
  )
}
