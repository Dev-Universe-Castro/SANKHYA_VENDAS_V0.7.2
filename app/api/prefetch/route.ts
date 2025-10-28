import { NextRequest, NextResponse } from 'next/server'
import { redisCacheService } from '@/lib/redis-cache-service'
import { consultarParceiros } from '@/lib/sankhya-api'
import { consultarProdutos } from '@/lib/produtos-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando prefetch de parceiros e produtos...')

    // Fazer requisições em paralelo para otimizar tempo
    const [parceirosResult, produtosResult] = await Promise.allSettled([
      prefetchParceiros(),
      prefetchProdutos()
    ])

    // Log de resultados
    const parceirosCount = parceirosResult.status === 'fulfilled' ? parceirosResult.value.count : 0
    const produtosCount = produtosResult.status === 'fulfilled' ? produtosResult.value.count : 0

    const parceirosData = parceirosResult.status === 'fulfilled' ? parceirosResult.value.data : []
    const produtosData = produtosResult.status === 'fulfilled' ? produtosResult.value.data : []

    if (parceirosResult.status === 'fulfilled') {
      console.log(`✅ Parceiros carregados: ${parceirosCount} registros`)
    } else {
      console.error('❌ Erro ao carregar parceiros:', parceirosResult.reason)
    }

    if (produtosResult.status === 'fulfilled') {
      console.log(`✅ Produtos carregados: ${produtosCount} registros`)
    } else {
      console.error('❌ Erro ao carregar produtos:', produtosResult.reason)
    }

    console.log(`✅ Prefetch concluído - ${parceirosCount} parceiros, ${produtosCount} produtos armazenados em cache`)

    // Retornar dados completos para armazenar no sessionStorage do cliente
    return NextResponse.json({
      success: true,
      parceiros: parceirosCount,
      produtos: produtosCount,
      data: {
        parceiros: parceirosData,
        produtos: produtosData
      }
    })
  } catch (error) {
    console.error('❌ Erro no prefetch de dados:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao fazer prefetch' },
      { status: 500 }
    )
  }
}

// Prefetch de parceiros
async function prefetchParceiros(): Promise<{ count: number, data: any[] }> {
  try {
    const cacheKey = 'parceiros:list:1:50:::'
    const cached = await redisCacheService.get(cacheKey)

    if (cached) {
      console.log('✅ Parceiros já estão em cache')
      return { count: cached.parceiros?.length || 0, data: cached.parceiros || [] }
    }

    console.log('🔍 Buscando parceiros da API...')
    const data = await consultarParceiros(1, 50, '', '', undefined, undefined)

    // Salvar no cache Redis (30 minutos)
    await redisCacheService.set(cacheKey, data, 30 * 60)

    return { count: data.parceiros?.length || 0, data: data.parceiros || [] }
  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de parceiros:', error)
    return { count: 0, data: [] }
  }
}

// Prefetch de produtos
async function prefetchProdutos(): Promise<{ count: number, data: any[] }> {
  try {
    const cacheKey = 'produtos:list:all'
    const cached = await redisCacheService.get(cacheKey)

    if (cached) {
      console.log('✅ Produtos já estão em cache')
      return { count: cached.produtos?.length || 0, data: cached.produtos || [] }
    }

    console.log('🔍 Buscando TODOS os produtos da API...')
    // Buscar todos os produtos sem limitação usando consultarProdutosTodos
    const data = await consultarProdutosTodos()

    // Salvar no cache Redis (45 minutos)
    await redisCacheService.set(cacheKey, data, 45 * 60)

    return { count: data.produtos?.length || 0, data: data.produtos || [] }
  } catch (error) {
    console.error('❌ Erro ao fazer prefetch de produtos:', error)
    return { count: 0, data: [] }
  }
}

// Função para buscar TODOS os produtos sem limitação
async function consultarProdutosTodos() {
  // Usar consultarProdutos que já existe e está funcionando
  // Buscar com limite alto para pegar o máximo de produtos
  const resultado = await consultarProdutos(1, 10000, '', '')
  return resultado
}