
import { NextResponse } from 'next/server';
import { listarPedidos, listarPedidosPorGerente } from '@/lib/pedidos-lista-service';
import { usersService } from '@/lib/users-service';
import { cookies } from 'next/headers';

// Revalidar a cada 1 minuto
export const revalidate = 60;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dataInicio = searchParams.get('dataInicio') || undefined;
    const dataFim = searchParams.get('dataFim') || undefined;
    const numeroPedido = searchParams.get('numeroPedido') || undefined;
    const nomeCliente = searchParams.get('nomeCliente') || undefined;

    console.log('📋 Buscando pedidos - userId:', userId, 'numeroPedido:', numeroPedido, 'nomeCliente:', nomeCliente);

    // Tentar obter usuário do cookie se userId não for fornecido
    let usuario;
    
    if (userId) {
      // Buscar usuário da API Sankhya
      usuario = await usersService.getById(parseInt(userId));
    } else {
      // Tentar obter do cookie
      const cookieStore = cookies();
      const userCookie = cookieStore.get('user');
      
      if (userCookie?.value) {
        try {
          usuario = JSON.parse(userCookie.value);
          console.log('✅ Usuário obtido do cookie:', { id: usuario.id, name: usuario.name });
        } catch (e) {
          console.error('Erro ao parsear cookie de usuário:', e);
        }
      }
    }

    if (!usuario) {
      console.error('❌ Usuário não autenticado - userId:', userId);
      return NextResponse.json(
        { error: 'Usuário não autenticado' },
        { status: 401 }
      );
    }

    let pedidos;

    console.log('👤 Tipo de usuário:', usuario.tipo || usuario.role);
    console.log('🔢 Código vendedor:', usuario.codVendedor);

    const tipoUsuario = usuario.tipo || usuario.role?.toLowerCase();

    if (tipoUsuario === 'administrador') {
      // Administrador vê todos os pedidos sem filtro de vendedor
      console.log('🔓 Administrador - Listando todos os pedidos');
      pedidos = await listarPedidos(undefined, dataInicio, dataFim, numeroPedido, nomeCliente);
    }
    else if (tipoUsuario === 'gerente' && usuario.codVendedor) {
      // Gerente vê pedidos de seus vendedores
      console.log('👔 Gerente - Listando pedidos da equipe');
      pedidos = await listarPedidosPorGerente(usuario.codVendedor.toString(), dataInicio, dataFim, numeroPedido, nomeCliente);
    }
    else if (tipoUsuario === 'vendedor' && usuario.codVendedor) {
      // Vendedor vê apenas seus pedidos
      console.log('💼 Vendedor - Listando pedidos próprios');
      pedidos = await listarPedidos(usuario.codVendedor.toString(), dataInicio, dataFim, numeroPedido, nomeCliente);
    }
    else {
      console.log('⚠️ Usuário sem permissão ou codVendedor');
      pedidos = [];
    }

    console.log('✅ Pedidos encontrados:', pedidos.length);
    
    return NextResponse.json(pedidos, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
      }
    });
  } catch (error: any) {
    console.error('Erro ao listar pedidos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao listar pedidos' },
      { status: 500 }
    );
  }
}
