
import { NextResponse } from 'next/server';
import { deletarFunil } from '@/lib/funis-service';
import { consultarLeads } from '@/lib/leads-service';

export async function POST(request: Request) {
  try {
    const { codFunil } = await request.json();
    
    if (!codFunil) {
      return NextResponse.json({ error: 'codFunil é obrigatório' }, { status: 400 });
    }

    // Verificar se existem leads ativos neste funil
    const leads = await consultarLeads(undefined, true); // Admin vê todos os leads
    const leadsAtivosNoFunil = leads.filter(lead => 
      lead.CODFUNIL === codFunil && lead.ATIVO === 'S'
    );

    if (leadsAtivosNoFunil.length > 0) {
      return NextResponse.json({ 
        error: `Não é possível inativar este funil. Existem ${leadsAtivosNoFunil.length} lead(s) ativo(s) nele.` 
      }, { status: 400 });
    }

    await deletarFunil(codFunil);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ API - Erro ao deletar funil:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar funil' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
