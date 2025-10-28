
import { NextResponse } from 'next/server';
import { consultarTiposNegociacao, consultarTipVendaPorModelo, consultarTiposOperacao, consultarDadosModeloNota } from '@/lib/sankhya-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const nunota = searchParams.get('nunota');

    // Se passar NUNOTA, busca os dados do modelo
    if (nunota) {
      const resultado = await consultarDadosModeloNota(nunota);
      return NextResponse.json(resultado);
    }

    if (tipo === 'operacao') {
      const tiposOperacao = await consultarTiposOperacao();
      return NextResponse.json({ tiposOperacao });
    }

    const tiposNegociacao = await consultarTiposNegociacao();
    return NextResponse.json({ tiposNegociacao });
  } catch (error: any) {
    console.error('Erro ao buscar tipos de negociação:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar tipos de negociação' },
      { status: 500 }
    );
  }
}

// Novo endpoint para buscar por modelo
export async function POST(request: Request) {
  try {
    const { codTipOper } = await request.json();
    
    if (!codTipOper) {
      return NextResponse.json(
        { error: 'Modelo da nota é obrigatório' },
        { status: 400 }
      );
    }

    const resultado = await consultarTipVendaPorModelo(codTipOper);
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Erro ao buscar CODTIPVENDA e NUNOTA por modelo:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar dados do modelo' },
      { status: 500 }
    );
  }
}
