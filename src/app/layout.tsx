// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
export const metadata: Metadata = {
  title: { template:'%s | PRONEA Sacatepéquez', default:'PRONEA Sacatepéquez' },
  description:'Sistema Gestión Educativa PRONEA Sacatepéquez',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&display=swap" rel="stylesheet"/>
      </head>
      <body className="bg-gray-50 text-gray-700">{children}</body>
    </html>
  )
}
