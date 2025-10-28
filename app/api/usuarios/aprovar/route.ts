
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    const resultado = await usersService.approve(id);

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Erro ao aprovar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao aprovar usuário' },
      { status: 500 }
    );
  }
}
