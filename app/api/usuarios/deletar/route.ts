
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    const resultado = await usersService.delete(id);

    return NextResponse.json({ success: resultado });
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao deletar usuário' },
      { status: 500 }
    );
  }
}
