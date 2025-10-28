
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Search, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { authService } from '@/lib/auth-service'

interface Pedido {
  NUNOTA: string
  CODPARC: string
  NOMEPARC: string
  CODVEND: string
  NOMEVEND: string
  VLRNOTA: number
  DTNEG: string
}

export default function PedidosTable() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(false)
  const [numeroPedido, setNumeroPedido] = useState('')
  const [nomeCliente, setNomeCliente] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  useEffect(() => {
    // Não carregar pedidos automaticamente
    setPedidos([])
  }, [])

  const carregarPedidos = async (filtroDataInicio?: string, filtroDataFim?: string, filtroNumeroPedido?: string, filtroNomeCliente?: string) => {
    // Validar se pelo menos um filtro foi aplicado
    if (!filtroDataInicio && !filtroDataFim && !filtroNumeroPedido && !filtroNomeCliente) {
      toast.error("Por favor, aplique pelo menos um filtro antes de buscar os pedidos");
      return;
    }

    try {
      setLoading(true);
      const user = authService.getCurrentUser();

      if (!user) {
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }

      const params = new URLSearchParams({
        userId: user.id.toString(),
        ...(filtroDataInicio && { dataInicio: filtroDataInicio }),
        ...(filtroDataFim && { dataFim: filtroDataFim }),
        ...(filtroNumeroPedido && { numeroPedido: filtroNumeroPedido }),
        ...(filtroNomeCliente && { nomeCliente: filtroNomeCliente })
      });

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const response = await fetch(`/api/sankhya/pedidos/listar?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'public, max-age=60',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao buscar pedidos');
      }

      const data = await response.json();
      setPedidos(Array.isArray(data) ? data : []);
      toast.success(`${Array.isArray(data) ? data.length : 0} pedido(s) encontrado(s)`);
    } catch (error: any) {
      console.error('Erro ao buscar pedidos:', error);
      toast.error(error.name === 'AbortError'
        ? "Tempo de carregamento excedido"
        : error.message || "Erro ao carregar pedidos"
      );
      setPedidos([]);
    } finally {
      setLoading(false);
    }
  };

  const formatarData = (data: string) => {
    if (!data) return 'N/A'
    // Se vier no formato DD/MM/YYYY, retorna como está
    if (data.includes('/')) return data
    // Se vier no formato YYYY-MM-DD, converte
    const [ano, mes, dia] = data.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">Pedidos de Venda</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Gerencie os pedidos de venda no sistema Sankhya
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros de Busca */}
          <div className="bg-white border rounded-lg p-3 md:p-4 space-y-3 md:space-y-4 mb-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Filtros de Busca</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Número do Pedido */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="numeroPedido" className="text-xs md:text-sm font-medium">
                  Número do Pedido
                </Label>
                <Input
                  id="numeroPedido"
                  type="number"
                  placeholder="Ex: 123456"
                  value={numeroPedido}
                  onChange={(e) => setNumeroPedido(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              {/* Nome do Cliente */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="nomeCliente" className="text-xs md:text-sm font-medium">
                  Nome do Cliente
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="nomeCliente"
                    placeholder="Digite o nome..."
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    className="pl-10 h-9 md:h-10 text-sm"
                  />
                </div>
              </div>

              {/* Data de Negociação Início */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataInicio" className="text-xs md:text-sm font-medium">
                  Data Negociação (Início)
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              {/* Data de Negociação Fim */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataFim" className="text-xs md:text-sm font-medium">
                  Data Negociação (Fim)
                </Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              {/* Botão de Buscar */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button 
                  onClick={() => carregarPedidos(dataInicio, dataFim, numeroPedido, nomeCliente)}
                  disabled={loading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Buscando...' : 'Buscar Pedidos'}
                </Button>
              </div>
            </div>
          </div>

          {/* Informações sobre os resultados */}
          {pedidos.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-green-800">
                <span className="font-semibold">Exibindo:</span>
                <Badge variant="outline" className="bg-white">
                  {pedidos.length} pedido(s)
                </Badge>
              </div>
            </div>
          )}

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[600px]">
              <Table>
                <TableHeader className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                  <TableRow>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">NUNOTA</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Parceiro</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Vendedor</TableHead>
                    <TableHead className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">Data Negociação</TableHead>
                    <TableHead className="px-6 py-4 text-right text-sm font-semibold text-white uppercase tracking-wider">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-green-500 border-t-transparent"></div>
                          <p className="text-sm font-medium text-gray-700">Buscando pedidos...</p>
                          <p className="text-xs text-gray-500">Isso pode levar alguns segundos</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : pedidos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        {numeroPedido || nomeCliente || dataInicio || dataFim 
                          ? 'Nenhum pedido encontrado com os critérios de busca' 
                          : 'Utilize os filtros acima para buscar pedidos'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidos.map((pedido) => (
                      <TableRow key={pedido.NUNOTA} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <Badge variant="outline" className="border-green-300 text-green-700">
                            {pedido.NUNOTA}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{pedido.NOMEPARC}</div>
                            <div className="text-xs text-gray-500">Cód: {pedido.CODPARC}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{pedido.NOMEVEND}</div>
                            <div className="text-xs text-gray-500">Cód: {pedido.CODVEND}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-700">
                          {formatarData(pedido.DTNEG)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-green-700">
                          {formatarValor(pedido.VLRNOTA)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
