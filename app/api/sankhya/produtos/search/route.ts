
import { NextResponse } from 'next/server';
import { consultarProdutos } from '@/lib/produtos-service';
import { cacheService } from '@/lib/cache-service';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('termo') || '';
    const limit = parseInt(searchParams.get('limit') || '20');

    console.log('🔍 Busca rápida de produtos:', { query, limit });

    // Validação
    if (query.length < 2) {
      console.log('⚠️ Query muito curta:', query.length);
      return NextResponse.json(
        { produtos: [], total: 0 },
        { 
          status: 200,
          headers: {
            'Cache-Control': 'no-store',
          }
        }
      );
    }

    // Verificar cache
    const cacheKey = `search:produtos:${query}:${limit}`;
    const cached = cacheService.get<any>(cacheKey);
    
    if (cached !== null) {
      console.log('✅ Retornando do cache:', cached.produtos?.length || 0, 'produtos');
      return NextResponse.json(cached, {
        headers: {
          'X-Cache': 'HIT',
          'Cache-Control': 'public, max-age=180',
        },
      });
    }

    console.log('🌐 Buscando produtos da API...');
    
    // Buscar produtos (somente dados básicos, sem estoque/preço)
    const resultado = await consultarProdutos(1, limit, query, '');
    
    console.log('📦 Produtos encontrados:', resultado.produtos?.length || 0);
    
    // Salvar no cache (3 minutos)
    cacheService.set(cacheKey, resultado, 3 * 60 * 1000);

    return NextResponse.json(resultado, {
      headers: {
        'X-Cache': 'MISS',
        'Cache-Control': 'public, max-age=180',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro na busca rápida:', error);
    return NextResponse.json(
      { error: error.message || 'Erro na busca' },
      { status: 500 }
    );
  }
}
