
import { NextResponse } from 'next/server';
import { redisCacheService } from '@/lib/redis-cache-service';

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pattern = searchParams.get('pattern');

    if (pattern) {
      const count = await redisCacheService.invalidatePattern(pattern);
      return NextResponse.json({ 
        success: true, 
        message: `Cache limpo: ${count} registros com padrão '${pattern}'` 
      });
    } else {
      await redisCacheService.clear();
      return NextResponse.json({ 
        success: true, 
        message: 'Cache completamente limpo' 
      });
    }
  } catch (error: any) {
    console.error('Erro ao limpar cache:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao limpar cache' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const stats = await redisCacheService.getStats();
    return NextResponse.json({ 
      success: true, 
      stats 
    });
  } catch (error: any) {
    console.error('Erro ao obter estatísticas do cache:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao obter estatísticas' },
      { status: 500 }
    );
  }
}
