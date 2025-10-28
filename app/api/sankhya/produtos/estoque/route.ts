
import { NextResponse } from 'next/server';
import { consultarEstoqueProduto } from '@/lib/produtos-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codProd = searchParams.get('codProd');
    const searchLocal = searchParams.get('searchLocal') || '';

    if (!codProd) {
      return NextResponse.json(
        { error: 'Código do produto é obrigatório' },
        { status: 400 }
      );
    }

    const resultado = await consultarEstoqueProduto(codProd, searchLocal);
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Erro ao consultar estoque:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar estoque' },
      { status: 500 }
    );
  }
}
