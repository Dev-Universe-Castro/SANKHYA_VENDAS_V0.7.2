"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, Search } from "lucide-react"
import { format } from "date-fns"
import { toast } from "sonner"

interface Titulo {
  nroTitulo: string
  parceiro: string
  codParceiro: string
  valor: number
  dataVencimento: string
  dataNegociacao: string
  status: "Aberto" | "Baixado"
  tipoFinanceiro: "Real" | "Provisão"
  tipoTitulo: string
  contaBancaria?: string
  historico?: string
  numeroParcela: number
  origemFinanceiro: string
  codigoEmpresa: number
  codigoNatureza: number
  boleto: {
    codigoBarras: string | null
    nossoNumero: string | null
    linhaDigitavel: string | null
    numeroRemessa: string | null
  }
}

interface Pagination {
  page: string
  offset: string
  total: string
  hasMore: string
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
}

export default function TitulosReceberTable() {
  const [titulos, setTitulos] = useState<Titulo[]>([])
  const [loading, setLoading] = useState(false)
  const [showDetalhes, setShowDetalhes] = useState(false)
  const [selectedTitulo, setSelectedTitulo] = useState<Titulo | null>(null)

  // Filtros
  const [parceiroSelecionado, setParceiroSelecionado] = useState<string>("")
  const [dataNegociacaoInicio, setDataNegociacaoInicio] = useState<string>("")
  const [dataNegociacaoFinal, setDataNegociacaoFinal] = useState<string>("")
  const [tipoFinanceiro, setTipoFinanceiro] = useState<string>("3") // 1=Pendente, 2=Baixado, 3=Todos
  const [statusFinanceiro, setStatusFinanceiro] = useState<string>("3") // 1=Real, 2=Provisão, 3=Todos

  // Busca de parceiros
  const [parceiros, setParceiros] = useState<Partner[]>([])
  const [partnerSearch, setPartnerSearch] = useState("")
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (partnerSearch.length >= 3) {
        buscarParceiros(partnerSearch)
      } else {
        setParceiros([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [partnerSearch])

  const buscarParceiros = async (search: string) => {
    setIsLoadingPartners(true)
    try {
      const response = await fetch(`/api/sankhya/parceiros/search?search=${encodeURIComponent(search)}`)
      if (!response.ok) throw new Error('Erro ao buscar parceiros')
      const data = await response.json()
      setParceiros(data.parceiros || [])
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error)
      toast.error('Erro ao buscar parceiros')
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const carregarTitulos = async () => {
    if (!parceiroSelecionado) {
      toast.error("Selecione um parceiro para buscar os títulos")
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        codParceiro: parceiroSelecionado,
        tipoFinanceiro,
        statusFinanceiro,
      })

      if (dataNegociacaoInicio) params.append('dataNegociacaoInicio', dataNegociacaoInicio)
      if (dataNegociacaoFinal) params.append('dataNegociacaoFinal', dataNegociacaoFinal)

      const response = await fetch(`/api/sankhya/titulos-receber?${params}`)
      if (!response.ok) throw new Error('Erro ao carregar títulos')

      const data = await response.json()
      setTitulos(data.titulos || [])

      if (data.titulos && data.titulos.length > 0) {
        toast.success(`${data.titulos.length} título(s) encontrado(s)`)
      } else {
        toast.info("Nenhum título encontrado")
      }
    } catch (error) {
      console.error('Erro ao carregar títulos:', error)
      toast.error('Erro ao carregar títulos. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
  }

  const handlePartnerSelect = (value: string) => {
    setParceiroSelecionado(value)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    try {
      const [year, month, day] = dateString.split('-')
      return `${day}/${month}/${year}`
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string) => {
    return status === "Aberto" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
  }

  const getTipoFinanceiroColor = (tipo: string) => {
    return tipo === "Real" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
  }

  const baixarBoleto = async (titulo: Titulo) => {
    try {
      const response = await fetch(`/api/sankhya/boleto/${titulo.nroTitulo}`)

      if (!response.ok) throw new Error('Erro ao baixar boleto')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `boleto_${titulo.nroTitulo}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success("Boleto baixado com sucesso!")
    } catch (error) {
      console.error('Erro ao baixar boleto:', error)
      toast.error('Erro ao baixar boleto. Tente novamente.')
    }
  }

  const abrirDetalhes = (titulo: Titulo) => {
    setSelectedTitulo(titulo)
    setShowDetalhes(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Financeiro</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">Consulta e gerenciamento de títulos a receber</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Busca */}
          <div className="bg-white border rounded-lg p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Filtros de Busca</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
              {/* Parceiro */}
              <div className="space-y-1.5 md:space-y-2 lg:col-span-2">
                <Label htmlFor="parceiro" className="text-xs md:text-sm font-medium">Parceiro *</Label>
                <Select
                  value={parceiroSelecionado}
                  onValueChange={handlePartnerSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um parceiro..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        placeholder="Buscar parceiro..."
                        value={partnerSearch}
                        onChange={(e) => handlePartnerSearch(e.target.value)}
                        className="h-8"
                      />
                    </div>
                    {isLoadingPartners ? (
                      <SelectItem value="loading" disabled>Carregando...</SelectItem>
                    ) : parceiros.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        {partnerSearch ? "Nenhum parceiro encontrado" : "Digite para buscar"}
                      </SelectItem>
                    ) : (
                      parceiros.map((partner) => (
                        <SelectItem key={partner.CODPARC} value={partner.CODPARC}>
                          <div className="truncate max-w-[300px]">
                            {partner.NOMEPARC} - {partner.CGC_CPF}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Início */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataInicio" className="text-xs md:text-sm font-medium">Data Início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataNegociacaoInicio}
                  onChange={(e) => setDataNegociacaoInicio(e.target.value)}
                  className="w-full h-9 md:h-10"
                />
              </div>

              {/* Data Fim */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="dataFim" className="text-xs md:text-sm font-medium">Data Fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataNegociacaoFinal}
                  onChange={(e) => setDataNegociacaoFinal(e.target.value)}
                  className="w-full h-9 md:h-10"
                />
              </div>

              {/* Status: Pendente ou Baixado */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="tipoFinanceiro" className="text-xs md:text-sm font-medium">Status</Label>
                <Select
                  value={tipoFinanceiro}
                  onValueChange={setTipoFinanceiro}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Todos</SelectItem>
                    <SelectItem value="1">Pendente</SelectItem>
                    <SelectItem value="2">Baixado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo: Real ou Provisão */}
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="statusFinanceiro" className="text-xs md:text-sm font-medium">Tipo</Label>
                <Select
                  value={statusFinanceiro}
                  onValueChange={setStatusFinanceiro}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Todos</SelectItem>
                    <SelectItem value="1">Real</SelectItem>
                    <SelectItem value="2">Provisão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Buscar */}
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button 
                  onClick={carregarTitulos}
                  disabled={!parceiroSelecionado || loading}
                  className="w-full h-9 md:h-10 text-sm"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Buscando...' : 'Buscar Títulos'}
                </Button>
              </div>
            </div>
          </div>

          {/* Informações sobre os resultados */}
          {titulos.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <span className="font-semibold">Exibindo:</span>
                <Badge variant="outline" className="bg-white">
                  {titulos.filter(t => t.tipoFinanceiro === "Real").length} Real
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {titulos.filter(t => t.tipoFinanceiro === "Provisão").length} Provisão
                </Badge>
                <span>•</span>
                <Badge variant="outline" className="bg-white">
                  {titulos.filter(t => t.status === "Aberto").length} Aberto
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {titulos.filter(t => t.status === "Baixado").length} Baixado
                </Badge>
              </div>
            </div>
          )}

          {/* Tabela de Títulos */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Nº Título</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Parceiro</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Valor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Vencimento</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Negociação</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Tipo</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider whitespace-nowrap">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        Carregando títulos...
                      </td>
                    </tr>
                  ) : titulos.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-8 text-center text-sm text-muted-foreground">
                        Nenhum título encontrado. Use os filtros acima para buscar.
                      </td>
                    </tr>
                  ) : (
                    titulos.map((titulo) => (
                      <tr key={titulo.nroTitulo} className="hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{titulo.nroTitulo}</td>
                        <td className="px-6 py-4 text-sm text-foreground max-w-[200px] truncate">{titulo.parceiro}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-foreground">{formatCurrency(titulo.valor)}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{formatDate(titulo.dataVencimento)}</td>
                        <td className="px-6 py-4 text-sm text-foreground">{formatDate(titulo.dataNegociacao)}</td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={getStatusColor(titulo.status)}>
                            {titulo.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <Badge className={getTipoFinanceiroColor(titulo.tipoFinanceiro)}>
                            {titulo.tipoFinanceiro}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => abrirDetalhes(titulo)}
                            >
                              Detalhes
                            </Button>
                            {titulo.tipoTitulo === "Boleto" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => baixarBoleto(titulo)}
                              >
                                <Download className="w-4 h-4 mr-1" />
                                Boleto
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={showDetalhes} onOpenChange={setShowDetalhes}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Título</DialogTitle>
            <DialogDescription>
              Informações completas sobre o título selecionado
            </DialogDescription>
          </DialogHeader>

          {selectedTitulo && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nº Título</Label>
                  <p className="font-semibold">{selectedTitulo.nroTitulo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo</Label>
                  <p className="font-semibold">{selectedTitulo.tipoTitulo}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Parceiro</Label>
                  <p className="font-semibold">{selectedTitulo.parceiro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Código Parceiro</Label>
                  <p className="font-semibold">{selectedTitulo.codParceiro}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  <p className="font-semibold text-lg">{formatCurrency(selectedTitulo.valor)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge className={getStatusColor(selectedTitulo.status)}>
                    {selectedTitulo.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Vencimento</Label>
                  <p className="font-semibold">{formatDate(selectedTitulo.dataVencimento)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Data Negociação</Label>
                  <p className="font-semibold">{formatDate(selectedTitulo.dataNegociacao)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo Financeiro</Label>
                  <Badge className={getTipoFinanceiroColor(selectedTitulo.tipoFinanceiro)}>
                    {selectedTitulo.tipoFinanceiro}
                  </Badge>
                </div>
                {selectedTitulo.contaBancaria && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Conta Bancária</Label>
                    <p className="font-semibold">{selectedTitulo.contaBancaria}</p>
                  </div>
                )}
              </div>

              {selectedTitulo.historico && (
                <div>
                  <Label className="text-xs text-muted-foreground">Histórico</Label>
                  <p className="text-sm mt-1">{selectedTitulo.historico}</p>
                </div>
              )}

              {selectedTitulo.tipoTitulo === "Boleto" && selectedTitulo.boleto.nossoNumero && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Informações do Boleto</h4>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nosso Número</Label>
                      <p className="font-mono text-sm">{selectedTitulo.boleto.nossoNumero}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}