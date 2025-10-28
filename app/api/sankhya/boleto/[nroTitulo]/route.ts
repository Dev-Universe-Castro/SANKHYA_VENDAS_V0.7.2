
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: { nroTitulo: string } }
) {
  try {
    const { nroTitulo } = params;
    
    // TODO: Implementar integração com API Sankhya para gerar/baixar boleto
    // Por enquanto, retorna erro informativo
    
    console.log('Solicitação de download de boleto:', nroTitulo);
    
    return NextResponse.json(
      { 
        error: 'Funcionalidade de download de boleto em desenvolvimento',
        message: 'A integração com a API Sankhya para geração de boletos será implementada em breve.'
      },
      { status: 501 }
    );
  } catch (error: any) {
    console.error('Erro ao baixar boleto:', error);
    
    return NextResponse.json(
      { 
        error: 'Erro ao baixar boleto',
        details: error.message
      },
      { status: 500 }
    );
  }
}
