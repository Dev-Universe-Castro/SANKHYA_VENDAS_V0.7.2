
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Não cachear rotas de autenticação e escrita
  if (
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname.includes('/salvar') ||
    request.nextUrl.pathname.includes('/deletar') ||
    request.nextUrl.pathname.includes('/criar') ||
    request.method !== 'GET'
  ) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
    return response
  }
  
  // Headers de cache otimizados por tipo de rota (mais agressivos)
  if (request.nextUrl.pathname.startsWith('/api/sankhya/produtos')) {
    response.headers.set('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=3600')
  } else if (request.nextUrl.pathname.startsWith('/api/sankhya/parceiros')) {
    response.headers.set('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=2400')
  } else if (request.nextUrl.pathname.startsWith('/api/sankhya/pedidos')) {
    response.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900')
  } else if (request.nextUrl.pathname.includes('/tipos-')) {
    response.headers.set('Cache-Control', 'public, s-maxage=7200, stale-while-revalidate=14400')
  } else if (request.nextUrl.pathname.startsWith('/api/sankhya')) {
    response.headers.set('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800')
  }
  
  // Compressão de respostas
  if (request.headers.get('accept-encoding')?.includes('gzip')) {
    response.headers.set('Content-Encoding', 'gzip')
  }
  
  // Headers de performance
  response.headers.set('X-DNS-Prefetch-Control', 'on')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  
  // Prefetch de recursos estáticos
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    response.headers.set('Link', '</anigif.gif>; rel=prefetch, </sankhya-logo.jpg>; rel=prefetch')
  }
  
  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
