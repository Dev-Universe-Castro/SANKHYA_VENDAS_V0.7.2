
import { NextResponse } from 'next/server';
import { consultarParceiros } from '@/lib/sankhya-api';
import { cacheService } from '@/lib/cache-service';
import { cookies } from 'next/headers';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    // Validação
    if (query.length < 2) {
      return NextResponse.json(
        { parceiros: [], total: 0 },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          }
        }
      );
    }

    // Obter filtros do usuário
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');
    let codVendedor: number | undefined;
    let codVendedoresEquipe: number[] | undefined;

    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        const userCodVend = user.codVendedor ? parseInt(user.codVendedor) : null;
        
        if (user.role === 'Vendedor' && userCodVend) {
          codVendedor = userCodVend;
        }
        
        if (user.role === 'Gerente' && userCodVend) {
          const vendedoresResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/vendedores?tipo=vendedores&codGerente=${userCodVend}`
          );
          
          if (vendedoresResponse.ok) {
            const vendedores = await vendedoresResponse.json();
            if (vendedores && vendedores.length > 0) {
              codVendedoresEquipe = vendedores.map((v: any) => parseInt(v.CODVEND));
            } else {
              codVendedoresEquipe = [];
            }
          }
        }
      } catch (e) {
        console.error('Erro ao parsear cookie:', e);
      }
    }

    // Verificar cache
    const cacheKey = `search:parceiros:${query}:${limit}:${codVendedor}:${codVendedoresEquipe?.join(',')}`;
    const cached = cacheService.get<any>(cacheKey);
    
    if (cached !== null) {
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=180',
        },
      });
    }

    // Buscar parceiros
    const resultado = await consultarParceiros(
      1,
      limit,
      query,
      '',
      codVendedor,
      codVendedoresEquipe
    );
    
    // Salvar no cache (5 minutos para buscas frequentes)
    cacheService.set(cacheKey, resultado, 5 * 60 * 1000);

    return NextResponse.json(resultado, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Erro na busca rápida de parceiros:', error);
    return NextResponse.json(
      { error: error.message || 'Erro na busca' },
      { status: 500 }
    );
  }
}
