
import { NextResponse } from 'next/server';
import { salvarLead } from '@/lib/leads-service';
import { usersService } from '@/lib/users-service';
import { adicionarProdutoLead } from '@/lib/lead-produtos-service';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const leadData = await request.json();

    console.log('📥 Dados recebidos na API /api/leads/salvar:', JSON.stringify(leadData, null, 2));
    console.log('🔑 CODPARC recebido:', leadData.CODPARC);

    // Obter usuário autenticado do cookie
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    
    if (!userCookie) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    let currentUser;
    try {
      currentUser = JSON.parse(userCookie.value);
    } catch (e) {
      return NextResponse.json({ error: 'Sessão inválida' }, { status: 401 });
    }

    // Passar o ID do usuário criador se for um novo lead
    const codUsuarioCriador = leadData.CODLEAD ? undefined : currentUser.id;

    // Extrair produtos do leadData
    const produtos = leadData.PRODUTOS || [];
    delete leadData.PRODUTOS;

    console.log('🛒 Produtos extraídos do leadData:', {
      quantidade: produtos.length,
      produtos: produtos,
      leadDataCompleto: leadData
    });

    const leadSalvo = await salvarLead(leadData, codUsuarioCriador);

    console.log('✅ Lead salvo com sucesso:', {
      CODLEAD: leadSalvo.CODLEAD,
      NOME: leadSalvo.NOME
    });

    // Determinar o CODLEAD a usar - buscar o CODLEAD recém-criado
    let codLeadParaProdutos = leadSalvo.CODLEAD || leadData.CODLEAD;

    // Se ainda não temos CODLEAD, buscar o último lead criado
    if (!codLeadParaProdutos) {
      console.log('⚠️ CODLEAD não encontrado no leadSalvo, buscando último lead...');
      const { consultarLeads } = await import('@/lib/leads-service');
      const leads = await consultarLeads();
      if (leads && leads.length > 0) {
        const ultimoLead = leads[leads.length - 1];
        codLeadParaProdutos = ultimoLead.CODLEAD;
        console.log('✅ Último lead encontrado:', codLeadParaProdutos);
      }
    }

    console.log('🔑 CODLEAD para vinculação de produtos:', codLeadParaProdutos);

    // Salvar produtos vinculados ao lead
    if (produtos && produtos.length > 0 && codLeadParaProdutos) {
      console.log(`📦 Iniciando salvamento de ${produtos.length} produto(s)...`);
      
      // Aguardar um delay maior para garantir que o lead foi persistido
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      for (let i = 0; i < produtos.length; i++) {
        const produto = produtos[i];
        
        // Validar se o produto tem dados mínimos necessários
        if (!produto.CODPROD || !produto.DESCRPROD) {
          console.warn(`⚠️ Produto ${i + 1} sem dados essenciais, pulando:`, produto);
          continue;
        }
        
        console.log(`📌 Salvando produto ${i + 1}/${produtos.length}:`, {
          CODLEAD: String(codLeadParaProdutos),
          CODPROD: produto.CODPROD,
          DESCRPROD: produto.DESCRPROD,
          QUANTIDADE: produto.QUANTIDADE || produto.QTDNEG || 1,
          VLRUNIT: produto.VLRUNIT || 0,
          VLRTOTAL: produto.VLRTOTAL || 0
        });

        try {
          await adicionarProdutoLead({
            CODLEAD: String(codLeadParaProdutos),
            CODPROD: produto.CODPROD,
            DESCRPROD: produto.DESCRPROD,
            QUANTIDADE: produto.QUANTIDADE || produto.QTDNEG || 1,
            VLRUNIT: produto.VLRUNIT || 0,
            VLRTOTAL: produto.VLRTOTAL || 0
          });
          console.log(`✅ Produto ${i + 1} salvo com sucesso`);
          
          // Delay entre produtos para evitar sobrecarga
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (produtoError: any) {
          console.error(`❌ Erro ao salvar produto ${i + 1}:`, produtoError);
          throw new Error(`Falha ao salvar produto "${produto.DESCRPROD}": ${produtoError.message}`);
        }
      }

      console.log('✅ Todos os produtos foram salvos com sucesso');
    } else {
      console.log('⚠️ Nenhum produto para salvar:', {
        temProdutos: produtos && produtos.length > 0,
        temCodLead: !!codLeadParaProdutos,
        produtos: produtos
      });
    }

    return NextResponse.json(leadSalvo);
  } catch (error: any) {
    console.error('❌ Erro ao salvar lead:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar lead' },
      { status: 500 }
    );
  }
}
