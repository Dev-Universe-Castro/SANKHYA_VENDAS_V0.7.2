
import { NextResponse } from 'next/server';
import { consultarGerentes, consultarVendedores } from '@/lib/vendedores-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo');
    const codGerente = searchParams.get('codGerente');

    if (tipo === 'gerentes') {
      const gerentes = await consultarGerentes();
      return NextResponse.json(gerentes);
    } else if (tipo === 'vendedores') {
      const vendedores = await consultarVendedores(codGerente ? parseInt(codGerente) : undefined);
      return NextResponse.json(vendedores);
    }

    return NextResponse.json({ error: 'Tipo não especificado' }, { status: 400 });
  } catch (error: any) {
    console.error('Erro ao consultar vendedores:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar vendedores' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
