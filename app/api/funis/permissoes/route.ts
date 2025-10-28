import { NextResponse } from 'next/server';
import { consultarFunis, consultarFunisUsuario, atribuirFunilUsuario, removerFunilUsuario } from '@/lib/funis-service';

// GET: Retorna todos os funis ou os funis de um usuário específico
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codUsuario = searchParams.get('codUsuario');

    if (codUsuario) {
      // Retornar funis permitidos para o usuário
      const funisPermitidos = await consultarFunisUsuario(Number(codUsuario));
      return NextResponse.json({ funisPermitidos });
    } else {
      // Retornar todos os funis (para administradores escolherem)
      const funis = await consultarFunis(undefined, true);
      return NextResponse.json(funis);
    }
  } catch (error: any) {
    console.error('❌ Erro ao consultar permissões de funis:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar permissões de funis' },
      { status: 500 }
    );
  }
}

// POST: Atualizar permissões de funis de um usuário
export async function POST(request: Request) {
  try {
    const { codUsuario, codigosFunis } = await request.json();

    if (!codUsuario) {
      return NextResponse.json(
        { error: 'codUsuario é obrigatório' },
        { status: 400 }
      );
    }

    // Obter funis atuais do usuário
    const funisAtuais = await consultarFunisUsuario(codUsuario);

    // Remover funis que não estão mais selecionados
    for (const codFunil of funisAtuais) {
      if (!codigosFunis.includes(codFunil)) {
        await removerFunilUsuario(codFunil, codUsuario);
      }
    }

    // Adicionar novos funis
    for (const codFunil of codigosFunis) {
      if (!funisAtuais.includes(codFunil)) {
        await atribuirFunilUsuario(codFunil, codUsuario);
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Permissões atualizadas com sucesso'
    });
  } catch (error: any) {
    console.error('❌ Erro ao atualizar permissões de funis:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar permissões de funis' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;