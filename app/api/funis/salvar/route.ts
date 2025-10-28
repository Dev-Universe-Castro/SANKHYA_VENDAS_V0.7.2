
import { NextResponse } from 'next/server';
import { salvarFunil } from '@/lib/funis-service';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const funil = await salvarFunil(data);
    
    // Garantir que o objeto é serializável
    const funilSerializavel = {
      CODFUNIL: funil.CODFUNIL,
      NOME: funil.NOME,
      DESCRICAO: funil.DESCRICAO,
      COR: funil.COR,
      ATIVO: funil.ATIVO,
      DATA_CRIACAO: funil.DATA_CRIACAO,
      DATA_ATUALIZACAO: funil.DATA_ATUALIZACAO
    };
    
    return NextResponse.json(funilSerializavel);
  } catch (error: any) {
    console.error('❌ API - Erro ao salvar funil:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar funil' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
