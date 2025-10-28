
import { NextResponse } from 'next/server';
import { consultarProdutos } from '@/lib/produtos-service';

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const searchName = searchParams.get('searchName') || '';
    const searchCode = searchParams.get('searchCode') || '';

    const resultado = await consultarProdutos(page, pageSize, searchName, searchCode);
    
    return NextResponse.json(resultado, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('Erro ao consultar produtos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar produtos' },
      { status: 500 }
    );
  }
}
