"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Plus, Search, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Lead } from "@/lib/leads-service"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"

interface LeadCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  funilSelecionado?: any
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
}

interface Produto {
  CODPROD: string
  DESCRPROD: string
  QTDNEG: number
  VLRUNIT: number
  PERCDESC: number
  VLRCOMERC?: string
  ESTOQUE?: string
  quantidade?: number; // Adicionado para compatibilidade com a estrutura esperada no save
  VLRTOTAL?: number; // Adicionado para compatibilidade com a estrutura esperada no save
}

const TIPOS_TAG = [
  'Ads Production',
  'Landing Page',
  'Dashboard',
  'UX Design',
  'Video Production',
  'Typeface',
  'Web Design'
]

export function LeadCreateModal({ isOpen, onClose, onSave, funilSelecionado }: LeadCreateModalProps) {
  const [formData, setFormData] = useState<Partial<Lead>>({
    NOME: "",
    DESCRICAO: "",
    VALOR: 0,
    CODESTAGIO: "",
    DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
    TIPO_TAG: "",
    COR_TAG: "#3b82f6",
    CODPARC: undefined,
    CODFUNIL: undefined
  })
  const [isSaving, setIsSaving] = useState(false)
  const [parceiros, setParceiros] = useState<Partner[]>([])
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [estagios, setEstagios] = useState<any[]>([])
  const { toast } = useToast()
  const [partnerSearch, setPartnerSearch] = useState("")
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().split('T')[0])
  const [dataConclusao, setDataConclusao] = useState("")
  const [produtosSelecionados, setProdutosSelecionados] = useState<Produto[]>([])
  const [showItemModal, setShowItemModal] = useState(false)
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [itemAtual, setItemAtual] = useState<Produto>({
    CODPROD: '',
    DESCRPROD: '',
    QTDNEG: 1,
    VLRUNIT: 0,
    PERCDESC: 0
  })
  const [valorUnitarioProduto, setValorUnitarioProduto] = useState<number>(0)

  useEffect(() => {
    if (isOpen) {
      // Reset form
      setFormData({
        NOME: "",
        DESCRICAO: "",
        VALOR: 0,
        CODESTAGIO: "",
        DATA_VENCIMENTO: new Date().toISOString().split('T')[0],
        TIPO_TAG: "",
        COR_TAG: "#3b82f6",
        CODPARC: undefined,
        CODFUNIL: undefined,
      })
      setDataInicio(new Date().toISOString().split('T')[0])
      setDataConclusao("")
      setPartnerSearch("")
      setProdutosSelecionados([])
      setValorUnitarioProduto(0)
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadPartners()
      if (funilSelecionado) {
        setEstagios(funilSelecionado.estagios)
        if (funilSelecionado.estagios.length > 0) {
          setFormData(prev => ({
            ...prev,
            CODFUNIL: funilSelecionado.CODFUNIL,
            CODESTAGIO: funilSelecionado.estagios[0].CODESTAGIO
          }))
        }
      }
    }
  }, [isOpen, funilSelecionado])

  const loadPartners = async (searchTerm: string = "") => {
    try {
      setIsLoadingPartners(true)
      const url = `/api/sankhya/parceiros?page=1&pageSize=50&searchName=${encodeURIComponent(searchTerm)}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Falha ao carregar parceiros')
      const data = await response.json()
      setParceiros(data.parceiros || [])
      // Armazenar no cache se a busca for geral (sem termo)
      if (searchTerm === "") {
        sessionStorage.setItem('cached_parceiros', JSON.stringify(data.parceiros || []))
        console.log('✅ Parceiros armazenados no cache (LeadCreateModal)')
      }
    } catch (error: any) {
      setParceiros([])
      console.error('Erro ao carregar parceiros:', error)
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
    if (value.length >= 2) {
      loadPartners(value)
    } else if (value.length === 0) {
      // Se o campo de busca for limpo, tentar carregar do cache
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        setParceiros(JSON.parse(cachedParceiros))
        console.log('✅ Parceiros carregados do cache após limpar busca (LeadCreateModal)')
      } else {
        loadPartners() // Se não houver cache, carregar da API
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.NOME || formData.NOME.trim() === "") {
      toast({
        title: "Atenção",
        description: "Por favor, preencha o nome do negócio.",
        variant: "destructive",
      })
      return
    }

    if (!dataInicio) {
      toast({
        title: "Atenção",
        description: "Data de criação é obrigatória.",
        variant: "destructive",
      })
      return
    }

    if (!formData.CODFUNIL && !funilSelecionado) {
      toast({
        title: "Atenção",
        description: "Nenhum funil foi selecionado.",
        variant: "destructive",
      })
      return
    }

    if (!formData.CODESTAGIO) {
      toast({
        title: "Atenção",
        description: "Por favor, selecione um estágio.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      // Calcular valor total dos produtos
      const valorTotalProdutos = produtosSelecionados.reduce((total, p) => total + calcularTotalProduto(p), 0)

      // Mapear produtos com campos corretos
      const produtosParaSalvar = produtosSelecionados.map(p => ({
        CODPROD: p.CODPROD,
        DESCRPROD: p.DESCRPROD,
        QUANTIDADE: p.QTDNEG, // Mapear QTDNEG para QUANTIDADE
        VLRUNIT: p.VLRUNIT,
        VLRTOTAL: p.VLRTOTAL || calcularTotalProduto(p)
      }));

      const dataToSave = {
        NOME: String(formData.NOME),
        DESCRICAO: String(formData.DESCRICAO || ""),
        VALOR: Number(valorTotalProdutos || formData.VALOR || 0), // Valor now comes from products
        CODESTAGIO: String(formData.CODESTAGIO || ""),
        CODFUNIL: String(formData.CODFUNIL || funilSelecionado?.CODFUNIL || ""),
        DATA_VENCIMENTO: String(dataConclusao || formData.DATA_VENCIMENTO || ""),
        TIPO_TAG: String(formData.TIPO_TAG || ""),
        COR_TAG: String(formData.COR_TAG || "#3b82f6"),
        CODPARC: formData.CODPARC ? String(formData.CODPARC) : undefined,
        PRODUTOS: produtosParaSalvar // Include selected products com campos corretos
      }

      console.log('📦 Dados enviados para salvar:', dataToSave)
      console.log('📦 Produtos a salvar:', dataToSave.PRODUTOS)
      console.log('📦 Total de produtos:', dataToSave.PRODUTOS.length)

      if (!dataToSave.NOME) {
        toast({
          title: "Erro",
          description: "Nome do negócio é obrigatório",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      if (!dataToSave.CODESTAGIO) {
        toast({
          title: "Erro",
          description: "Estágio é obrigatório",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      console.log('🚀 Enviando requisição para salvar lead...')

      const response = await fetch('/api/leads/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao criar negócio')
      }

      toast({
        title: "Sucesso",
        description: "Negócio criado com sucesso!",
      })

      onSave()
      onClose()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao criar negócio. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const parceiroSelecionado = parceiros.find(p => p.CODPARC === formData.CODPARC)

  const calcularTotalProduto = (produto: Produto) => {
    return (produto.QTDNEG * produto.VLRUNIT) * (1 - (produto.PERCDESC / 100));
  };

  const calcularValorTotal = () => {
    return produtosSelecionados.reduce((total, p) => total + calcularTotalProduto(p), 0);
  };

  const abrirModalNovoProduto = () => {
    setItemAtual({ CODPROD: '', DESCRPROD: '', QTDNEG: 1, VLRUNIT: 0, PERCDESC: 0 });
    setCurrentItemIndex(null);
    setValorUnitarioProduto(0);
    setShowProdutoModal(true);
  };

  const abrirModalEditarProduto = (index: number) => {
    const produto = produtosSelecionados[index];
    setItemAtual({ ...produto });
    setCurrentItemIndex(index);
    setValorUnitarioProduto(produto.VLRUNIT); // Set the unit price from the selected product
    setShowItemModal(true);
  };

  const removerProduto = (index: number) => {
    setProdutosSelecionados(produtosSelecionados.filter((_, i) => i !== index));
  };

  const confirmarProduto = () => {
    if (!itemAtual.DESCRPROD || itemAtual.QTDNEG <= 0 || valorUnitarioProduto <= 0) { // Use valorUnitarioProduto here
      toast({
        title: "Atenção",
        description: "Por favor, preencha todos os campos obrigatórios do produto.",
        variant: "destructive",
      });
      return;
    }

    const produtoCalculado = {
      ...itemAtual,
      VLRUNIT: valorUnitarioProduto, // Use the state value for VLRUNIT
      VLRTOTAL: calcularTotalProduto({ ...itemAtual, VLRUNIT: valorUnitarioProduto }) // Calculate VLRTOTAL here
    };

    if (currentItemIndex !== null) {
      const newProdutos = [...produtosSelecionados];
      newProdutos[currentItemIndex] = produtoCalculado;
      setProdutosSelecionados(newProdutos);
    } else {
      setProdutosSelecionados([...produtosSelecionados, produtoCalculado]);
    }
    setShowItemModal(false);
  };



  const handleConfirmarProdutoEstoque = async (produto: any, preco: number, quantidade: number) => {
    setShowProdutoModal(false);

    const vlrtotal = preco * quantidade
    const produtoCalculado = {
      CODPROD: produto.CODPROD,
      DESCRPROD: produto.DESCRPROD,
      QTDNEG: quantidade,
      VLRUNIT: preco,
      PERCDESC: 0,
      VLRTOTAL: vlrtotal
    };

    setProdutosSelecionados([...produtosSelecionados, produtoCalculado]);

    toast({
      title: "Sucesso",
      description: "Produto adicionado com sucesso!",
    });
  };



  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {isSaving && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">Criando negócio...</p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving ? onClose : undefined} />

      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/50 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Adicionar novo negócio</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <style jsx>{`
            .scrollbar-hide {
              -ms-overflow-style: none;
              scrollbar-width: none;
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {/* Dados básicos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Dados básicos</h3>

            <div className="space-y-2">
              <Label htmlFor="NOME">
                Nome do negócio <span className="text-red-500">*</span>
              </Label>
              <Input
                id="NOME"
                value={formData.NOME}
                onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                placeholder="Digite o nome do negócio"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="parceiro">Cliente (opcional)</Label>
              <Select
                value={formData.CODPARC ? String(formData.CODPARC) : undefined}
                onValueChange={(value) => setFormData({ ...formData, CODPARC: String(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2">
                    <Input
                      placeholder="Buscar cliente..."
                      value={partnerSearch}
                      onChange={(e) => handlePartnerSearch(e.target.value)}
                    />
                  </div>
                  {isLoadingPartners ? (
                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                  ) : parceiros.length === 0 ? (
                    <SelectItem value="empty" disabled>
                      {partnerSearch ? "Nenhum cliente encontrado" : "Digite para buscar"}
                    </SelectItem>
                  ) : (
                    parceiros.map((partner) => (
                      <SelectItem key={partner.CODPARC} value={partner.CODPARC}>
                        {partner.NOMEPARC}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="responsavel">Responsável</Label>
                <Input
                  id="responsavel"
                  value="Eu (PAULO CHAGAS)"
                  disabled
                  className="bg-muted"
                />
              </div>

              {/* Valor Total field removed as it's now derived from products */}

              <div className="space-y-2">
                <Label htmlFor="CODFUNIL">Funil</Label>
                <Select
                  value={formData.CODFUNIL || funilSelecionado?.CODFUNIL}
                  disabled
                >
                  <SelectTrigger>
                    <SelectValue placeholder={funilSelecionado?.NOME || "Selecione um funil"} />
                  </SelectTrigger>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dataInicio">
                  Data de criação <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dataConclusao">Data de conclusão</Label>
                <Input
                  id="dataConclusao"
                  type="date"
                  value={dataConclusao}
                  onChange={(e) => {
                    setDataConclusao(e.target.value)
                    setFormData({ ...formData, DATA_VENCIMENTO: e.target.value })
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="DESCRICAO">Descrição</Label>
              <Textarea
                id="DESCRICAO"
                value={formData.DESCRICAO}
                onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                rows={3}
                placeholder="Escreva detalhes importantes sobre esse cliente"
              />
            </div>
          </div>

          {/* Produtos e serviços */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Produtos e serviços</h3>
            <p className="text-sm text-muted-foreground">
              Adicione produtos ou serviços com valor e quantidade na sua oportunidade de venda.
            </p>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={abrirModalNovoProduto}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Produto
            </Button>

            {produtosSelecionados.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Produto</th>
                      <th className="px-3 py-2 text-right font-medium">Qtd</th>
                      <th className="px-3 py-2 text-right font-medium">Vlr. Unit.</th>
                      <th className="px-3 py-2 text-right font-medium">Desc. %</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-center font-medium w-20">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosSelecionados.map((produto, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-3 py-2">
                          <div className="font-medium">{produto.DESCRPROD}</div>
                          <div className="text-xs text-muted-foreground">Cód: {produto.CODPROD}</div>
                        </td>
                        <td className="px-3 py-2 text-right">{produto.QTDNEG}</td>
                        <td className="px-3 py-2 text-right">
                          {produto.VLRUNIT.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-2 text-right">{produto.PERCDESC}%</td>
                        <td className="px-3 py-2 text-right font-medium text-green-700">
                          {calcularTotalProduto(produto).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 justify-center">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => abrirModalEditarProduto(index)}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removerProduto(index)}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="bg-muted px-3 py-2 flex justify-between items-center font-semibold">
                  <span>Valor Total:</span>
                  <span className="text-lg text-green-700">
                    {calcularValorTotal().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="border-t bg-background/50 px-6 py-4 flex gap-3 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-primary hover:bg-primary/90"
            disabled={isSaving}
          >
            {isSaving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </div>

      {/* Modal de Editar Produto */}
      {currentItemIndex !== null && (
        <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Editar Produto</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Produto</Label>
                <Input
                  value={itemAtual.DESCRPROD || ''}
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantidade *</Label>
                  <Input
                    type="number"
                    value={itemAtual.QTDNEG}
                    onChange={(e) => setItemAtual({ ...itemAtual, QTDNEG: parseFloat(e.target.value) || 0 })}
                    min="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Valor Unitário (R$) *</Label>
                  <Input
                    type="number"
                    value={valorUnitarioProduto}
                    onChange={(e) => setValorUnitarioProduto(parseFloat(e.target.value) || 0)}
                    step="0.01"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Desconto (%)</Label>
                  <Input
                    type="number"
                    value={itemAtual.PERCDESC}
                    onChange={(e) => setItemAtual({ ...itemAtual, PERCDESC: parseFloat(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total do Produto:</span>
                  <span className="text-xl font-bold text-green-700">
                    {formatCurrency(calcularTotalProduto({ ...itemAtual, VLRUNIT: valorUnitarioProduto }))}
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowItemModal(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmarProduto}>
                Atualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Seleção de Produto - Usando ProdutoSelectorModal */}
      <ProdutoSelectorModal
        isOpen={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        onConfirm={handleConfirmarProdutoEstoque}
        titulo="Buscar Produto"
      />
    </div>
  )
}