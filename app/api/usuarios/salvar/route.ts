
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';

export async function POST(request: Request) {
  try {
    const { userData, mode } = await request.json();
    
    let user;
    if (mode === 'edit' && 'id' in userData) {
      user = await usersService.update(userData.id, userData);
    } else {
      user = await usersService.create(userData);
    }
    
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Erro ao salvar usuário:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar usuário' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
