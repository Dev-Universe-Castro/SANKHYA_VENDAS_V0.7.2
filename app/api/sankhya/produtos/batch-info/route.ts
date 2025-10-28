
import { NextResponse } from 'next/server';
import { buscarPrecoProduto, consultarEstoqueProduto } from '@/lib/produtos-service';

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codigosParam = searchParams.get('codigos');

    if (!codigosParam) {
      return NextResponse.json(
        { error: 'Parâmetro codigos é obrigatório' },
        { status: 400 }
      );
    }

    const codigos = codigosParam.split(',').map(c => c.trim()).filter(c => c);

    if (codigos.length === 0) {
      return NextResponse.json(
        { error: 'Nenhum código de produto válido fornecido' },
        { status: 400 }
      );
    }

    console.log(`🔍 Buscando informações em lote para ${codigos.length} produtos...`);

    // Buscar preços e estoques em paralelo para todos os produtos
    const promises = codigos.map(async (codProd) => {
      try {
        const [preco, estoqueData] = await Promise.all([
          buscarPrecoProduto(codProd, 0, true), // silent=true
          consultarEstoqueProduto(codProd, '', true) // silent=true
        ]);

        const estoqueTotal = estoqueData.estoqueTotal || 0;

        return {
          codProd,
          preco,
          estoqueTotal,
          success: true
        };
      } catch (error: any) {
        console.error(`❌ Erro ao buscar dados do produto ${codProd}:`, error.message);
        return {
          codProd,
          preco: 0,
          estoqueTotal: 0,
          success: false,
          error: error.message
        };
      }
    });

    const results = await Promise.all(promises);

    console.log(`✅ Busca em lote concluída: ${results.filter(r => r.success).length}/${codigos.length} sucessos`);

    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, max-age=300', // 5 minutos
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar informações em lote:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar informações' },
      { status: 500 }
    );
  }
}
