"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, Search, Edit } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EstoqueModal } from "@/components/estoque-modal"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"

interface ItemPedido {
  CODPROD: string
  DESCRPROD?: string
  QTDNEG: number
  VLRUNIT: number
  PERCDESC: number
  CODLOCALORIG: string
  CONTROLE: string
  AD_QTDBARRA?: number
  CODVOL?: string
  IDALIQICMS?: string
}

export default function PedidoVendaForm() {
  const [loading, setLoading] = useState(false)
  const [parceiros, setParceiros] = useState<any[]>([])
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [parceiroSearch, setParceiroSearch] = useState("")
  const [showParceirosDropdown, setShowParceirosDropdown] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [vendedores, setVendedores] = useState<any[]>([])
  const [tiposNegociacao, setTiposNegociacao] = useState<any[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<any[]>([])
  const [condicaoComercialBloqueada, setCondicaoComercialBloqueada] = useState(false)
  const [condicaoComercialPorModelo, setCondicaoComercialPorModelo] = useState(false)
  const [modeloNota, setModeloNota] = useState<string>("")

  const [pedido, setPedido] = useState({
    CODEMP: "1",
    CODCENCUS: "0",
    NUNOTA: "",
    DTNEG: new Date().toISOString().split('T')[0],
    DTFATUR: "",
    DTENTSAI: "",
    CODPARC: "",
    CODTIPOPER: "974",
    TIPMOV: "P",
    CODTIPVENDA: "1",
    CODVEND: "0",
    OBSERVACAO: "",
    VLOUTROS: 0,
    VLRDESCTOT: 0,
    VLRFRETE: 0,
    TIPFRETE: "S",
    ORDEMCARGA: "",
    CODPARCTRANSP: "0",
    PERCDESC: 0,
    CODNAT: "0",
    TIPO_CLIENTE: "PJ",
    CPF_CNPJ: "",
    IE_RG: "",
    RAZAO_SOCIAL: ""
  })

  const [itens, setItens] = useState<ItemPedido[]>([])

  const [itemAtual, setItemAtual] = useState<ItemPedido>({
    CODPROD: "",
    QTDNEG: 1,
    VLRUNIT: 0,
    PERCDESC: 0,
    CODLOCALORIG: "700",
    CONTROLE: "007",
    AD_QTDBARRA: 1,
    CODVOL: "UN",
    IDALIQICMS: "0"
  })

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [produtos, setProdutos] = useState<any[]>([]) // Estado para os produtos buscados

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    setIsInitialLoading(true)
    try {
      await Promise.all([
        carregarParceiros(),
        carregarVendedorUsuario(),
        carregarTiposNegociacao(),
        carregarTiposOperacao()
      ])
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      toast.error('Erro ao carregar dados. Tente novamente.')
    } finally {
      setIsInitialLoading(false)
    }
  }

  const carregarVendedorUsuario = async () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))

        if (user.codVendedor) {
          setPedido(prev => ({ ...prev, CODVEND: String(user.codVendedor) }))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendedor do usuário:', error)
    }
  }

  const carregarTiposNegociacao = async () => {
    try {
      const response = await fetch('/api/sankhya/tipos-negociacao')
      const data = await response.json()
      setTiposNegociacao(data.tiposNegociacao || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de negociação:', error)
    }
  }

  const carregarTiposOperacao = async () => {
    try {
      const response = await fetch('/api/sankhya/tipos-negociacao?tipo=operacao')
      const data = await response.json()
      setTiposOperacao(data.tiposOperacao || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de operação:', error)
    }
  }

  const carregarParceiros = async () => {
    try {
      // Tentar buscar do cache primeiro
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        try {
          const data = JSON.parse(cachedParceiros)
          // Garantir que é um array
          setParceiros(Array.isArray(data) ? data : [])
          console.log('✅ Parceiros carregados do cache')
          return
        } catch (e) {
          console.error('Erro ao parsear cache de parceiros:', e)
          sessionStorage.removeItem('cached_parceiros')
        }
      }

      const response = await fetch('/api/sankhya/parceiros?pageSize=100')
      const data = await response.json()
      const parceirosList = Array.isArray(data.parceiros) ? data.parceiros : []
      setParceiros(parceirosList)
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error)
      setParceiros([]) // Sempre garantir array vazio em caso de erro
    }
  }

  const buscarParceiros = async (search: string) => {
    setParceiroSearch(search)
    if (search.length < 2) {
      setParceiros([])
      return
    }

    try {
      // Tentar buscar do cache primeiro
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        const allParceiros = JSON.parse(cachedParceiros)
        const filtered = allParceiros.filter((p: any) => 
          p.NOMEPARC.toLowerCase().includes(search.toLowerCase()) ||
          p.CGC_CPF.includes(search)
        )
        setParceiros(filtered)
        setShowParceirosDropdown(true)
        console.log('✅ Parceiros filtrados do cache')
        return
      }

      const response = await fetch(`/api/sankhya/parceiros?searchName=${search}&pageSize=50`)
      const data = await response.json()
      setParceiros(data.parceiros || [])
      setShowParceirosDropdown(true)
    } catch (error) {
      console.error('Erro ao buscar parceiros:', error)
    }
  }

  const verificarComplementoParceiro = async (codParc: string) => {
    try {
      const response = await fetch(`/api/sankhya/parceiros/complemento?codParc=${codParc}`)
      const data = await response.json()

      if (data.sugTipNegSaid && data.sugTipNegSaid !== '0') {
        console.log('🔒 PRIORIDADE 1: Condição comercial do parceiro encontrada:', data.sugTipNegSaid)
        setPedido(prev => ({ ...prev, CODTIPVENDA: String(data.sugTipNegSaid) }))
        setCondicaoComercialBloqueada(true)
        setCondicaoComercialPorModelo(false)
        toast.info('Condição comercial definida pelo cadastro do parceiro')
      } else {
        console.log('ℹ️ Nenhuma condição comercial no parceiro - verificando modelo da nota')
        setCondicaoComercialBloqueada(false)
        // Se tinha modelo preenchido, verificar condição comercial do modelo
        if (modeloNota) {
          console.log('♻️ Reavaliando condição comercial do modelo após mudança de parceiro')
          await buscarDadosModeloNota(modeloNota)
        } else {
          setCondicaoComercialPorModelo(false)
        }
      }
    } catch (error) {
      console.error('Erro ao verificar complemento do parceiro:', error)
      setCondicaoComercialBloqueada(false)
      // Se tinha modelo preenchido, verificar condição comercial do modelo
      if (modeloNota) {
        await buscarDadosModeloNota(modeloNota)
      } else {
        setCondicaoComercialPorModelo(false)
      }
    }
  }

  const verificarTipVendaPorModelo = async (codTipOper: string) => {
    // PRIORIDADE 1: Se tiver condição comercial do parceiro, ignora o modelo
    if (condicaoComercialBloqueada) {
      console.log('⚠️ Ignorando modelo - Condição comercial bloqueada pelo parceiro')
      return;
    }

    try {
      const response = await fetch('/api/sankhya/tipos-negociacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codTipOper })
      })
      const data = await response.json()

      if (data.codTipVenda) {
        console.log('🔒 PRIORIDADE 2: CODTIPVENDA do modelo da nota:', data.codTipVenda)
        setPedido(prev => ({ ...prev, CODTIPVENDA: String(data.codTipVenda) }))
        setCondicaoComercialPorModelo(true)
        toast.info('Condição comercial definida pelo modelo da nota')
      } else {
        console.log('✅ PRIORIDADE 3: Nenhuma condição comercial - campo liberado')
        setCondicaoComercialPorModelo(false)
      }

      // Também buscar o NUNOTA do modelo
      if (data.nunota) {
        console.log('📝 NUNOTA do modelo encontrado:', data.nunota)
        setModeloNota(String(data.nunota))
      } else {
        setModeloNota("")
      }
    } catch (error) {
      console.error('Erro ao verificar CODTIPVENDA do modelo:', error)
      setCondicaoComercialPorModelo(false)
      setModeloNota("")
    }
  }

  const buscarDadosModeloNota = async (nunota: string) => {
    if (!nunota || nunota.trim() === '') {
      return;
    }

    try {
      console.log('🔍 Buscando dados do modelo NUNOTA:', nunota)
      const response = await fetch(`/api/sankhya/tipos-negociacao?nunota=${nunota}`)
      const data = await response.json()

      if (data.codTipOper) {
        console.log('✅ Dados do modelo encontrados:', data)

        // SEMPRE atualizar tipo de operação
        setPedido(prev => ({ 
          ...prev, 
          CODTIPOPER: String(data.codTipOper),
          // PRIORIDADE 1: Se tiver condição comercial do parceiro, NÃO atualiza
          ...(condicaoComercialBloqueada ? {} : { CODTIPVENDA: String(data.codTipVenda || prev.CODTIPVENDA) })
        }))

        // PRIORIDADE 2: Só marca como "por modelo" se NÃO tiver do parceiro
        if (!condicaoComercialBloqueada && data.codTipVenda && data.codTipVenda !== '0') {
          setCondicaoComercialPorModelo(true)
          toast.success('Tipo de operação e condição comercial preenchidos pelo modelo')
        } else if (condicaoComercialBloqueada) {
          toast.info('Tipo de operação preenchido. Condição comercial mantida do parceiro.')
        } else {
          toast.success('Tipo de operação preenchido')
          setCondicaoComercialPorModelo(false)
        }
      } else {
        console.log('ℹ️ Nenhum dado encontrado para este NUNOTA')
        toast.warning('Modelo da nota não encontrado')
      }
    } catch (error) {
      console.error('Erro ao buscar dados do modelo da nota:', error)
      toast.error('Erro ao buscar dados do modelo')
    }
  }

  const selecionarParceiro = (codParc: string) => {
    const parceiro = parceiros.find(p => p.CODPARC === codParc)

    if (parceiro) {
      setPedido({
        ...pedido,
        CODPARC: codParc,
        TIPO_CLIENTE: parceiro.TIPPESSOA === 'J' ? 'PJ' : 'PF',
        CPF_CNPJ: parceiro.CGC_CPF || '',
        IE_RG: parceiro.IDENTINSCESTAD || '',
        RAZAO_SOCIAL: parceiro.RAZAOSOCIAL || parceiro.NOMEPARC || ''
      })

      // Verificar complemento do parceiro
      verificarComplementoParceiro(codParc)
    } else {
      setPedido({ ...pedido, CODPARC: codParc })
    }
  }



  const abrirModalNovoItem = () => {
    setCurrentItemIndex(null)
    setShowProdutoModal(true)
  }

  const abrirModalEditarItem = (index: number) => {
    setCurrentItemIndex(index)
    setShowProdutoModal(true)
  }

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index))
  }

  const confirmarItem = () => {
    if (!itemAtual.CODPROD) {
      toast.error("Selecione um produto")
      return
    }

    if (currentItemIndex !== null) {
      const novosItens = [...itens]
      novosItens[currentItemIndex] = { ...itemAtual }
      setItens(novosItens)
      toast.success("Item atualizado")
    } else {
      setItens([...itens, { ...itemAtual }])
      toast.success("Item adicionado")
    }

    setShowItemModal(false)
    setItemAtual({
      CODPROD: "",
      QTDNEG: 1,
      VLRUNIT: 0,
      PERCDESC: 0,
      CODLOCALORIG: "700",
      CONTROLE: "007",
      AD_QTDBARRA: 1,
      CODVOL: "UN",
      IDALIQICMS: "0"
    })
  }



  const handleConfirmarProdutoEstoque = async (produto: any, preco: number, quantidade: number) => {
    setShowProdutoModal(false)

    const novoItem: ItemPedido = {
      CODPROD: produto.CODPROD,
      DESCRPROD: produto.DESCRPROD,
      QTDNEG: quantidade,
      VLRUNIT: preco,
      PERCDESC: 0,
      CODLOCALORIG: "700",
      CONTROLE: "007",
      AD_QTDBARRA: 1,
      CODVOL: "UN",
      IDALIQICMS: "0"
    }

    if (currentItemIndex !== null) {
      // Editando item existente
      const novosItens = [...itens]
      novosItens[currentItemIndex] = novoItem
      setItens(novosItens)
      toast.success("Item atualizado")
    } else {
      // Adicionando novo item
      setItens([...itens, novoItem])
      toast.success("Item adicionado")
    }

    setCurrentItemIndex(null)
  }



  const calcularTotal = (item: ItemPedido) => {
    const total = item.QTDNEG * item.VLRUNIT
    const desconto = total * (item.PERCDESC / 100)
    return total - desconto
  }

  const calcularTotalPedido = () => {
    return itens.reduce((acc, item) => acc + calcularTotal(item), 0)
  }

  const salvarPedido = async () => {
    if (!pedido.CODPARC) {
      toast.error("Selecione um parceiro")
      return
    }

    if (!pedido.CPF_CNPJ || !pedido.IE_RG || !pedido.RAZAO_SOCIAL) {
      toast.error("Preencha todos os dados do cliente")
      return
    }

    if (!pedido.CODVEND || pedido.CODVEND === "0") {
      toast.error("Selecione um vendedor")
      setShowVendedorModal(true)
      return
    }

    if (itens.length === 0) {
      toast.error("Adicione pelo menos um item ao pedido")
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/sankhya/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...pedido,
          MODELO_NOTA: modeloNota,
          itens: itens.map(item => ({
            CODPROD: item.CODPROD,
            QTDNEG: item.QTDNEG,
            VLRUNIT: item.VLRUNIT,
            PERCDESC: item.PERCDESC,
            CODLOCALORIG: item.CODLOCALORIG,
            CONTROLE: item.CONTROLE,
            AD_QTDBARRA: item.AD_QTDBARRA,
            CODVOL: item.CODVOL,
            IDALIQICMS: item.IDALIQICMS
          }))
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao criar pedido')
      }

      toast.success("Pedido criado com sucesso!")

      setPedido({
        CODEMP: "1",
        CODCENCUS: "0",
        NUNOTA: "",
        DTNEG: new Date().toISOString().split('T')[0],
        DTFATUR: "",
        DTENTSAI: "",
        CODPARC: "",
        CODTIPOPER: "974",
        TIPMOV: "P",
        CODTIPVENDA: "1",
        CODVEND: "0",
        OBSERVACAO: "",
        VLOUTROS: 0,
        VLRDESCTOT: 0,
        VLRFRETE: 0,
        TIPFRETE: "S",
        ORDEMCARGA: "",
        CODPARCTRANSP: "0",
        PERCDESC: 0,
        CODNAT: "0",
        TIPO_CLIENTE: "PJ",
        CPF_CNPJ: "",
        IE_RG: "",
        RAZAO_SOCIAL: ""
      })
      setParceiroSearch("")
      setItens([])
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar pedido")
    } finally {
      setLoading(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-16 h-16 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-base text-gray-600 font-medium">Carregando formulário...</p>
        <p className="text-sm text-gray-500">Aguarde enquanto buscamos os dados necessários</p>
      </div>
    )
  }

  // Busca de produtos atualizada para usar cache
  const buscarProdutos = async (termo: string) => {
    if (termo.length < 2) {
      setProdutos([])
      return
    }

    try {
      setIsLoading(true)
      console.log('🔍 Buscando produtos no cache local...');

      // Buscar do cache local
      const cachedProdutos = sessionStorage.getItem('cached_produtos')
      if (cachedProdutos) {
        const allProdutos = JSON.parse(cachedProdutos)
        const termoLower = termo.toLowerCase()

        const filtered = allProdutos.filter((p: any) =>
          p.DESCRPROD?.toLowerCase().includes(termoLower) ||
          p.CODPROD?.toString().includes(termo)
        ).slice(0, 20)

        setProdutos(filtered)
        console.log('✅ Produtos filtrados do cache:', filtered.length)
      } else {
        console.warn('⚠️ Cache de produtos não encontrado')
        setProdutos([])
      }
    } catch (error) {
      console.error('❌ Erro ao buscar produtos do cache:', error)
      setProdutos([])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Accordion type="multiple" defaultValue={["parceiro", "itens"]} className="space-y-4">
        {/* Dados do Parceiro */}
        <AccordionItem value="parceiro" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded"></div>
              <span className="text-lg font-semibold text-green-800">Dados do Parceiro</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-3 relative">
                <Label htmlFor="parceiro" className="text-gray-700 font-medium">Parceiro *</Label>
                <div className="relative">
                  <Input
                    id="parceiro"
                    value={parceiroSearch}
                    onChange={(e) => buscarParceiros(e.target.value)}
                    onFocus={() => parceiroSearch.length >= 2 && setShowParceirosDropdown(true)}
                    placeholder="Digite o nome do parceiro..."
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                  />
                  {showParceirosDropdown && parceiros.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {parceiros.map((p) => (
                        <div
                          key={p.CODPARC}
                          className="px-4 py-2 hover:bg-green-50 cursor-pointer transition-colors"
                          onClick={() => {
                            selecionarParceiro(p.CODPARC)
                            setParceiroSearch(p.NOMEPARC)
                            setShowParceirosDropdown(false)
                          }}
                        >
                          <div className="font-medium text-gray-800">{p.NOMEPARC}</div>
                          <div className="text-sm text-gray-500">{p.CGC_CPF}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {pedido.CODPARC && (
                  <div className="text-xs text-green-600 mt-1">
                    ✓ Parceiro selecionado: {pedido.CODPARC}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo_cliente" className="text-gray-700 font-medium">Tipo Cliente *</Label>
                <Select value={pedido.TIPO_CLIENTE} onValueChange={(value) => setPedido({ ...pedido, TIPO_CLIENTE: value })}>
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj" className="text-gray-700 font-medium">CPF/CNPJ *</Label>
                <Input
                  id="cpf_cnpj"
                  value={pedido.CPF_CNPJ}
                  onChange={(e) => setPedido({ ...pedido, CPF_CNPJ: e.target.value })}
                  placeholder="00.000.000/0000-00"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ie_rg" className="text-gray-700 font-medium">IE/RG *</Label>
                <Input
                  id="ie_rg"
                  value={pedido.IE_RG}
                  onChange={(e) => setPedido({ ...pedido, IE_RG: e.target.value })}
                  placeholder="123.123.123"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="razao_social" className="text-gray-700 font-medium">Razão Social *</Label>
                <Input
                  id="razao_social"
                  value={pedido.RAZAO_SOCIAL}
                  onChange={(e) => setPedido({ ...pedido, RAZAO_SOCIAL: e.target.value })}
                  placeholder="Nome ou Razão Social"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Dados da Nota */}
        <AccordionItem value="nota" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded"></div>
              <span className="text-lg font-semibold text-green-800">Dados da Nota</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dtneg" className="text-gray-700 font-medium">Data de Negociação *</Label>
                <Input
                  id="dtneg"
                  type="date"
                  value={pedido.DTNEG}
                  onChange={(e) => setPedido({ ...pedido, DTNEG: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dtfatur" className="text-gray-700 font-medium">Data de Faturamento</Label>
                <Input
                  id="dtfatur"
                  type="date"
                  value={pedido.DTFATUR}
                  onChange={(e) => setPedido({ ...pedido, DTFATUR: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dtentsai" className="text-gray-700 font-medium">Data de Entrada/Saída</Label>
                <Input
                  id="dtentsai"
                  type="date"
                  value={pedido.DTENTSAI}
                  onChange={(e) => setPedido({ ...pedido, DTENTSAI: e.target.value })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="codtipoper" className="text-gray-700 font-medium">Tipo Operação *</Label>
                <Select 
                  value={pedido.CODTIPOPER} 
                  onValueChange={(value) => {
                    setPedido({ ...pedido, CODTIPOPER: value })

                    // Verificar CODTIPVENDA se o modelo foi preenchido
                    if (value && !condicaoComercialBloqueada) {
                      verificarTipVendaPorModelo(value)
                    }
                  }}
                >
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue placeholder="Selecione o tipo de operação">
                      {tiposOperacao.find(t => String(t.CODTIPOPER) === String(pedido.CODTIPOPER))?.DESCROPER || 'Selecione'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPOPER} value={String(tipo.CODTIPOPER)}>
                        {tipo.DESCROPER}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="modelonota" className="text-gray-700 font-medium">Modelo da Nota *</Label>
                <Input
                  id="modelonota"
                  type="number"
                  value={modeloNota}
                  onChange={(e) => setModeloNota(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      buscarDadosModeloNota(e.target.value)
                    }
                  }}
                  placeholder="Digite o NUNOTA do modelo"
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipmov" className="text-gray-700 font-medium">Tipo de Movimento</Label>
                <Select value={pedido.TIPMOV} onValueChange={(value) => setPedido({ ...pedido, TIPMOV: value })}>
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Pedido</SelectItem>
                    <SelectItem value="V">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codtipvenda" className="text-gray-700 font-medium">
                  Condição Comercial *
                  {condicaoComercialBloqueada && pedido.CODTIPVENDA !== '0' && (
                    <span className="ml-2 text-xs text-orange-600 font-semibold">(🔒 Prioridade 1: Parceiro)</span>
                  )}
                  {!condicaoComercialBloqueada && condicaoComercialPorModelo && pedido.CODTIPVENDA !== '0' && (
                    <span className="ml-2 text-xs text-blue-600">(📋 Prioridade 2: Modelo)</span>
                  )}
                  {(!condicaoComercialBloqueada && !condicaoComercialPorModelo) || pedido.CODTIPVENDA === '0' ? (
                    <span className="ml-2 text-xs text-green-600">(✅ Seleção manual)</span>
                  ) : null}
                </Label>
                <Select 
                  value={String(pedido.CODTIPVENDA)} 
                  onValueChange={(value) => {
                    // Permitir alteração manual se:
                    // 1. Não estiver bloqueado pelo parceiro (OU valor for 0)
                    // 2. Não estiver bloqueado pelo modelo (OU valor for 0)
                    const podeAlterar = pedido.CODTIPVENDA === '0' || (!condicaoComercialBloqueada && !condicaoComercialPorModelo)
                    if (podeAlterar) {
                      setPedido({ ...pedido, CODTIPVENDA: value })
                    }
                  }}
                  disabled={pedido.CODTIPVENDA !== '0' && (condicaoComercialBloqueada || condicaoComercialPorModelo)}
                >
                  <SelectTrigger className={`border-gray-300 focus:border-green-500 focus:ring-green-500 ${(pedido.CODTIPVENDA !== '0' && (condicaoComercialBloqueada || condicaoComercialPorModelo)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Selecione a condição comercial">
                      {tiposNegociacao.find(t => String(t.CODTIPVENDA) === String(pedido.CODTIPVENDA))?.DESCRTIPVENDA || 'Selecione'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNegociacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPVENDA} value={String(tipo.CODTIPVENDA)}>
                        {tipo.DESCRTIPVENDA}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="codvend" className="text-gray-700 font-medium">Vendedor *</Label>
                <div className="flex gap-2">
                  <Input
                    id="codvend"
                    value={pedido.CODVEND}
                    readOnly
                    placeholder="Cód. Vendedor"
                    className="border-gray-300 focus:border-green-500 focus:ring-green-500 bg-gray-50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Verificar se o usuário tem vendedor vinculado
                      const userStr = document.cookie
                        .split('; ')
                        .find(row => row.startsWith('user='))
                        ?.split('=')[1]

                      if (userStr) {
                        const user = JSON.parse(decodeURIComponent(userStr))
                        if (user.codVendedor) {
                          toast.error("Você tem um vendedor vinculado e não pode alterá-lo")
                          return
                        }
                      }

                      setShowVendedorModal(true)
                    }}
                    className="border-green-300 text-green-700 hover:bg-green-50"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="observacao" className="text-gray-700 font-medium">Observações</Label>
                <Textarea
                  id="observacao"
                  value={pedido.OBSERVACAO}
                  onChange={(e) => setPedido({ ...pedido, OBSERVACAO: e.target.value })}
                  rows={3}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Valores */}
        <AccordionItem value="valores" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-6 bg-green-600 rounded"></div>
              <span className="text-lg font-semibold text-green-800">Valores</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vlrfrete" className="text-gray-700 font-medium">Valor do Frete (R$)</Label>
                <Input
                  id="vlrfrete"
                  type="number"
                  step="0.01"
                  value={pedido.VLRFRETE}
                  onChange={(e) => setPedido({ ...pedido, VLRFRETE: parseFloat(e.target.value) || 0 })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipfrete" className="text-gray-700 font-medium">Tipo de Frete</Label>
                <Select value={pedido.TIPFRETE} onValueChange={(value) => setPedido({ ...pedido, TIPFRETE: value })}>
                  <SelectTrigger className="border-gray-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">S - Sem Frete</SelectItem>
                    <SelectItem value="C">C - CIF</SelectItem>
                    <SelectItem value="F">F - FOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vloutros" className="text-gray-700 font-medium">Outros Valores (R$)</Label>
                <Input
                  id="vloutros"
                  type="number"
                  step="0.01"
                  value={pedido.VLOUTROS}
                  onChange={(e) => setPedido({ ...pedido, VLOUTROS: parseFloat(e.target.value) || 0 })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="percdesc" className="text-gray-700 font-medium">Desconto (%)</Label>
                <Input
                  id="percdesc"
                  type="number"
                  step="0.01"
                  value={pedido.PERCDESC}
                  onChange={(e) => setPedido({ ...pedido, PERCDESC: parseFloat(e.target.value) || 0 })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vlrdesctot" className="text-gray-700 font-medium">Desconto Total (R$)</Label>
                <Input
                  id="vlrdesctot"
                  type="number"
                  step="0.01"
                  value={pedido.VLRDESCTOT}
                  onChange={(e) => setPedido({ ...pedido, VLRDESCTOT: parseFloat(e.target.value) || 0 })}
                  className="border-gray-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Itens do Pedido */}
        <AccordionItem value="itens" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-4 py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-green-600 rounded"></div>
                <span className="text-lg font-semibold text-green-800">
                  Itens do Pedido
                  {itens.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                      {itens.length}
                    </span>
                  )}
                </span>
              </div>
              <Button 
                onClick={(e) => {
                  e.stopPropagation()
                  abrirModalNovoItem()
                }} 
                size="sm" 
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Item
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-3">
            {itens.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">#</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Vlr. Unit.</TableHead>
                      <TableHead className="text-right">Desc. %</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.DESCRPROD}</div>
                            <div className="text-xs text-gray-500">Cód: {item.CODPROD}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.QTDNEG}</TableCell>
                        <TableCell className="text-right">
                          {item.VLRUNIT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">{item.PERCDESC}%</TableCell>
                        <TableCell className="text-right font-medium text-green-700">
                          {calcularTotal(item).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirModalEditarItem(index)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Card className="border-green-200 shadow-md">
        <CardContent className="pt-6 bg-gradient-to-br from-green-50 to-white">
          <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-lg border border-green-200">
            <span className="text-xl font-bold text-gray-700">Total do Pedido:</span>
            <span className="text-2xl font-bold text-green-700">
              {calcularTotalPedido().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
          <Button onClick={salvarPedido} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
            <Save className="w-4 h-4 mr-2" />
            {loading ? "Salvando..." : "Salvar Pedido"}
          </Button>
        </CardContent>
      </Card>



      {/* Modal de Seleção de Produto - Agora usando ProdutoSelectorModal */}
      <ProdutoSelectorModal
        isOpen={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        onConfirm={handleConfirmarProdutoEstoque}
        titulo="Buscar Produto para Pedido"
        // Passando a função buscarProdutos para o modal
        buscarProdutos={buscarProdutos}
        produtos={produtos}
        isLoading={isLoading}
      />

      {/* Modal de Seleção de Vendedor */}
      <Dialog open={showVendedorModal} onOpenChange={setShowVendedorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-green-800">Selecionar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {vendedores.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/vendedores?tipo=vendedores')
                        if (response.ok) {
                          const data = await response.json()
                          setVendedores(data)
                        }
                      } catch (error) {
                        toast.error("Erro ao carregar vendedores")
                      }
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Carregar Vendedores
                  </Button>
                </div>
              ) : (
                vendedores.map((vendedor) => (
                  <Card
                    key={vendedor.CODVEND}
                    className="cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => {
                      setPedido({ ...pedido, CODVEND: String(vendedor.CODVEND) })
                      setShowVendedorModal(false)
                      toast.success(`Vendedor ${vendedor.APELIDO} selecionado`)
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{vendedor.APELIDO}</p>
                          <p className="text-xs text-muted-foreground">Cód: {vendedor.CODVEND}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}