
import { NextResponse } from 'next/server';
import { deletarEstagio } from '@/lib/funis-service';
import { consultarLeads } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const { codEstagio } = await request.json();
    
    if (!codEstagio) {
      return NextResponse.json({ error: 'codEstagio é obrigatório' }, { status: 400 });
    }

    // Verificar se existem leads ativos neste estágio
    const leads = await consultarLeads(undefined, true); // Admin vê todos os leads
    const leadsAtivosNoEstagio = leads.filter(lead => 
      lead.CODESTAGIO === codEstagio && lead.ATIVO === 'S'
    );

    if (leadsAtivosNoEstagio.length > 0) {
      return NextResponse.json({ 
        error: `Não é possível inativar este estágio. Existem ${leadsAtivosNoEstagio.length} lead(s) ativo(s) nele.` 
      }, { status: 400 });
    }

    await deletarEstagio(codEstagio);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ API - Erro ao deletar estágio:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar estágio' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
