/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.googleusercontent.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: '**.googleapis.com' },
      { protocol: 'https', hostname: '**.drive.google.com' },
    ],
  },
  // CORRECCIÓN: removidos ignoreBuildErrors e ignoreDuringBuilds
  // Los errores de TypeScript y ESLint ahora detienen el build correctamente
  // Esto evita que errores reales lleguen a producción sin aviso
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  // Optimizaciones de producción
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

module.exports = nextConfig
