import { NextResponse } from 'next/server';
import { removerProdutoLead } from '@/lib/lead-produtos-service';

export async function POST(request: Request) {
  try {
    const { codItem, codLead } = await request.json();

    if (!codItem) {
      return NextResponse.json({ error: 'CODITEM é obrigatório' }, { status: 400 });
    }

    if (!codLead) {
      return NextResponse.json({ error: 'CODLEAD é obrigatório' }, { status: 400 });
    }

    console.log('📥 Recebido pedido para remover produto:', { codItem, codLead });

    const { novoValorTotal } = await removerProdutoLead(codItem, codLead);

    console.log('✅ Produto removido/inativado com sucesso. Novo valor total:', novoValorTotal);

    return NextResponse.json({ 
      success: true,
      novoValorTotal: novoValorTotal
    });
  } catch (error: any) {
    console.error('❌ Erro ao remover produto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao remover produto' },
      { status: 500 }
    );
  }
}