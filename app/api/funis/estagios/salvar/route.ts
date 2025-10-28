
import { NextResponse } from 'next/server';
import { salvarEstagio } from '@/lib/funis-service';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log('📥 API - Recebendo dados do estágio:', JSON.stringify(data, null, 2));
    
    if (!data.CODFUNIL) {
      throw new Error('CODFUNIL é obrigatório');
    }
    
    if (!data.NOME || data.NOME.trim() === '') {
      throw new Error('Nome do estágio é obrigatório');
    }
    
    const estagio = await salvarEstagio(data);
    
    if (!estagio) {
      throw new Error('Estágio retornou vazio após salvar');
    }
    
    console.log('✅ API - Estágio salvo com sucesso:', JSON.stringify(estagio, null, 2));
    return NextResponse.json(estagio);
  } catch (error: any) {
    console.error('❌ API - Erro ao salvar estágio:', error.message);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar estágio' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
