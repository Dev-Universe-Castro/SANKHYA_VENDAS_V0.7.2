
import { NextResponse } from 'next/server';
import { atualizarEstagioLead, consultarLeads } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const { codLeed, novoEstagio } = await request.json();
    
    // Buscar o lead atual para verificar status
    const leads = await consultarLeads();
    const leadAtual = leads.find(l => l.CODLEAD === codLeed);
    
    if (!leadAtual) {
      return NextResponse.json(
        { error: 'Lead não encontrado' },
        { status: 404 }
      );
    }
    
    // Bloquear alteração se o lead estiver ganho ou perdido
    if (leadAtual.STATUS_LEAD === 'GANHO' || leadAtual.STATUS_LEAD === 'PERDIDO') {
      return NextResponse.json(
        { error: 'Não é possível alterar o estágio de leads ganhos ou perdidos' },
        { status: 403 }
      );
    }
    
    const resultado = await atualizarEstagioLead(codLeed, novoEstagio);
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao atualizar estágio:', error.message);
    
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar estágio' },
      { status: 500 }
    );
  }
}
