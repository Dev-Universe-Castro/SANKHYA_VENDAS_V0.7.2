
import { NextResponse } from 'next/server';
import { usersService } from '@/lib/users-service';
import { cryptoService } from '@/lib/crypto-service';
import { SUPER_ADMIN } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se é o super admin padrão do sistema
    if (email === SUPER_ADMIN.email && password === SUPER_ADMIN.password) {
      const { password: _, ...userWithoutPassword } = SUPER_ADMIN;
      
      const response = NextResponse.json({ user: userWithoutPassword });
      response.cookies.set('user', JSON.stringify(userWithoutPassword), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/'
      });
      
      return response;
    }

    // Buscar usuário por email - otimizado
    const users = await usersService.getByEmail(email);
    
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Encontrar primeiro usuário ativo
    const user = users.find((u) => u.status === 'ativo');
    
    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos, ou usuário não aprovado' },
        { status: 401 }
      );
    }

    // Validar senha
    const isPasswordValid = await cryptoService.comparePassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    // Criar resposta com cookie de sessão
    const response = NextResponse.json({ user: userWithoutPassword });
    response.cookies.set('user', JSON.stringify(userWithoutPassword), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });
    
    return response;

  } catch (error: any) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { error: 'Erro ao fazer login. Tente novamente.' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
