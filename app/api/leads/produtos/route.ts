
import { NextResponse } from 'next/server';
import { consultarProdutosLead } from '@/lib/lead-produtos-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead');

    if (!codLead) {
      return NextResponse.json({ error: 'CODLEAD é obrigatório' }, { status: 400 });
    }

    const produtos = await consultarProdutosLead(codLead);
    // Filtrar apenas produtos ativos
    const produtosAtivos = produtos.filter(p => p.ATIVO === 'S');
    return NextResponse.json(produtosAtivos);
  } catch (error: any) {
    console.error('Erro ao consultar produtos do lead:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar produtos' },
      { status: 500 }
    );
  }
}
