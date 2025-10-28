
import { NextResponse } from 'next/server';
import { consultarAtividades } from '@/lib/lead-atividades-service';
import { cookies } from 'next/headers';

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead');

    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const currentUser = JSON.parse(userCookie.value);

    // Buscar atividades ao invés de eventos
    let atividades = [];
    
    if (codLead) {
      atividades = await consultarAtividades(codLead);
    } else {
      // Se não especificar lead, buscar todas atividades do usuário
      // Adaptado para retornar no formato esperado pelo calendário
      const todasAtividades = await consultarAtividades('');
      atividades = todasAtividades;
    }

    // Transformar atividades em formato de eventos para o calendário
    const eventosFromAtividades = atividades.map(atividade => {
      // Usar STATUS direto do banco, se não existir calcular automaticamente
      let status = atividade.STATUS || 'AGUARDANDO';
      
      // Se não tiver STATUS no banco, calcular baseado na data
      if (!atividade.STATUS) {
        const dataInicio = new Date(atividade.DATA_INICIO || atividade.DATA_HORA);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        dataInicio.setHours(0, 0, 0, 0);

        if (dataInicio < hoje) {
          status = 'ATRASADO';
        } else {
          status = 'AGUARDANDO';
        }
      }

      return {
        CODEVENTO: atividade.CODATIVIDADE,
        CODATIVIDADE: atividade.CODATIVIDADE,
        CODLEAD: atividade.CODLEAD,
        TIPO: atividade.TIPO,
        TITULO: atividade.DESCRICAO.substring(0, 100),
        DESCRICAO: atividade.DESCRICAO,
        DATA_INICIO: atividade.DATA_INICIO || atividade.DATA_HORA,
        DATA_FIM: atividade.DATA_FIM || atividade.DATA_INICIO || atividade.DATA_HORA,
        STATUS: status,
        COR: atividade.COR
      };
    });

    return NextResponse.json(eventosFromAtividades);
  } catch (error: any) {
    console.error('Erro ao consultar atividades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar atividades' },
      { status: 500 }
    );
  }
}
