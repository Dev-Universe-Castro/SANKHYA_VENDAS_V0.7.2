import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchTerm = searchParams.get('search');
    const status = searchParams.get('status');

    let usuarios;

    if (status === 'pendente') {
      usuarios = await usersService.getPending();
    } else if (searchTerm) {
      usuarios = await usersService.search(searchTerm);
    } else {
      usuarios = await usersService.getAll();
    }

    return NextResponse.json(usuarios);
  } catch (error: any) {
    console.error('Erro ao consultar usuários:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar usuários' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';