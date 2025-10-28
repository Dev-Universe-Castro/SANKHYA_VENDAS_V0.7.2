import { NextResponse } from 'next/server';
import { consultarAtividades } from '@/lib/lead-atividades-service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead');
    const ativo = searchParams.get('ativo');

    console.log('📥 Consultando atividades para lead:', codLead);
    const atividades = await consultarAtividades(codLead || '', ativo || 'S');
    console.log('📤 Retornando', atividades.length, 'atividades');

    return NextResponse.json(atividades, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro ao consultar atividades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar atividades' },
      { status: 500 }
    );
  }
}