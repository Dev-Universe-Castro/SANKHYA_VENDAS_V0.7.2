
import { NextResponse } from 'next/server';
import { consultarEstagiosFunil } from '@/lib/funis-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codFunil = searchParams.get('codFunil');
    
    if (!codFunil) {
      return NextResponse.json({ error: 'codFunil é obrigatório' }, { status: 400 });
    }

    const estagios = await consultarEstagiosFunil(codFunil);
    return NextResponse.json(estagios);
  } catch (error: any) {
    console.error('❌ API - Erro ao consultar estágios:', error.message);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar estágios' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;
