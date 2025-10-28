import { NextResponse } from 'next/server';
import { salvarParceiro } from '@/lib/sankhya-api';
import cacheService from '@/lib/cacheService'; // Assumindo que cacheService está disponível aqui

export async function POST(request: Request) {
  try {
    const body = await request.json();

    console.log("🔄 API Route - Recebendo requisição para salvar parceiro:", body);

    const resultado = await salvarParceiro(body);

    // Invalidar cache de parceiros
    cacheService.invalidateParceiros();
    console.log('✅ Cache de parceiros invalidado após salvar');

    return NextResponse.json(resultado, { status: 200 });
  } catch (error: any) {
    console.error('❌ API Route - Erro ao salvar parceiro:', {
      message: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      { error: error.message || 'Erro ao salvar parceiro' },
      { status: 500 }
    );
  }
}