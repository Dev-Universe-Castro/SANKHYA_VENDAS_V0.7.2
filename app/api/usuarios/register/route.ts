
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const resultado = await usersService.register(body);

    return NextResponse.json(resultado);
  } catch (error: any) {
    console.error('Erro ao registrar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao registrar usuário' },
      { status: 500 }
    );
  }
}
