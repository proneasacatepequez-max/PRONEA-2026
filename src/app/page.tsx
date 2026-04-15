// src/app/page.tsx
import { redirect } from 'next/navigation'
import { getSession, DASHBOARD } from '@/lib/auth'
export default async function Root() {
  const s = await getSession()
  redirect(s ? DASHBOARD[s.rol] : '/login')
}
