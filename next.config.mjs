/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Otimizações de performance
  swcMinify: true,
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  // Prefetch automático de links
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
    optimizeCss: true,
    // Otimizações para alta concorrência
    cpus: 4,
    workerThreads: true,
    // Otimizações adicionais
    serverMinification: true,
    instrumentationHook: true,
  },
  // Cache agressivo
  cacheMaxMemorySize: 100 * 1024 * 1024, // 100MB
  // Compressão agressiva
  compress: true,
  generateEtags: true,
  // Otimizações de compilação
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Configurações de cache agressivo para múltiplos usuários
  onDemandEntries: {
    maxInactiveAge: 120 * 1000, // 2 minutos
    pagesBufferLength: 10, // Mais páginas em cache
  },
  // Headers de cache otimizados
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=60, stale-while-revalidate=120',
          },
        ],
      },
    ];
  },
}

export default nextConfig
