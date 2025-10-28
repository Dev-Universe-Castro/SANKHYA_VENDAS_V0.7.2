
import { NextResponse } from 'next/server';
import { criarVendedor } from '@/lib/vendedores-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log("🔄 API Route - Recebendo requisição para criar vendedor:", body);
    
    const resultado = await criarVendedor(body);
    
    console.log("✅ API Route - Vendedor criado com sucesso:", resultado);
    
    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('❌ API Route - Erro ao criar vendedor:', {
      message: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      { error: error.message || 'Erro ao criar vendedor' },
      { status: 500 }
    );
  }
}
