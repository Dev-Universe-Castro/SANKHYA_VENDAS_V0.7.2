import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarParceiros } from '@/lib/sankhya-api';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const searchName = searchParams.get('searchName') || '';
    const searchCode = searchParams.get('searchCode') || '';

    // Obter o usuário logado a partir do cookie
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user');

    let codVendedor: number | undefined = undefined;
    let codVendedoresEquipe: number[] | undefined = undefined;

    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        const userCodVend = user.codVendedor ? parseInt(user.codVendedor) : null;
        
        console.log('👤 Usuário do cookie:', { 
          id: user.id, 
          name: user.name, 
          role: user.role, 
          codVendedor: userCodVend 
        });

        // Se for vendedor, filtrar por seu código
        if (user.role === 'Vendedor' && userCodVend) {
          codVendedor = userCodVend;
          console.log('🔍 Filtro de vendedor aplicado:', codVendedor);
        }
        
        // Se for gerente, buscar vendedores da equipe
        if (user.role === 'Gerente' && userCodVend) {
          try {
            const vendedoresResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/vendedores?tipo=vendedores&codGerente=${userCodVend}`
            );
            
            if (vendedoresResponse.ok) {
              const vendedores = await vendedoresResponse.json();
              if (vendedores && vendedores.length > 0) {
                codVendedoresEquipe = vendedores.map((v: any) => parseInt(v.CODVEND));
                console.log('👥 Vendedores da equipe do gerente:', codVendedoresEquipe);
              } else {
                console.log('⚠️ Nenhum vendedor encontrado para o gerente');
                // Se não há vendedores na equipe, retornar vazio
                codVendedoresEquipe = [];
              }
            } else {
              console.error('❌ Erro na resposta da API de vendedores:', vendedoresResponse.status);
              codVendedoresEquipe = [];
            }
          } catch (error) {
            console.error('❌ Erro ao buscar vendedores da equipe:', error);
            codVendedoresEquipe = [];
          }
        }
      } catch (e) {
        console.error('❌ Erro ao parsear cookie do usuário:', e);
      }
    } else {
      console.log('⚠️ Nenhum cookie de usuário encontrado');
    }

    console.log('📊 Parâmetros finais para busca:', {
      codVendedor,
      codVendedoresEquipe,
      page,
      pageSize
    });

    const parceiros = await consultarParceiros(
      page,
      pageSize,
      searchName,
      searchCode,
      codVendedor,
      codVendedoresEquipe
    );

    return NextResponse.json(parceiros, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar parceiros:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar parceiros' },
      { status: 500 }
    );
  }
}