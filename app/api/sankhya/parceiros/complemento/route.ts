
import { NextResponse } from 'next/server';
import { consultarComplementoParceiro } from '@/lib/sankhya-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codParc = searchParams.get('codParc');

    if (!codParc) {
      return NextResponse.json(
        { error: 'Código do parceiro é obrigatório' },
        { status: 400 }
      );
    }

    const complemento = await consultarComplementoParceiro(codParc);

    return NextResponse.json({ 
      complemento,
      sugTipNegSaid: complemento?.SUGTIPNEGSAID || null
    });
  } catch (error: any) {
    console.error('Erro ao buscar complemento do parceiro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar complemento do parceiro' },
      { status: 500 }
    );
  }
}
