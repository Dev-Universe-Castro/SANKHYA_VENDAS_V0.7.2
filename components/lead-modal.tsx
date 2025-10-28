"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, Mail, Phone, MessageSquare, FileText, Users, Calendar as CalendarIcon, DollarSign, User, Clock, Plus, CheckCircle2, AlertCircle, MoreVertical, CheckCircle, XCircle, Trash2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { Lead } from "@/lib/leads-service"
import { useToast } from "@/hooks/use-toast"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { atualizarStatusLead } from "@/lib/lead-atividades-service"
import PedidoVendaFromLead from "@/components/pedido-venda-from-lead"
import { useLeadContext, formatLeadContextForAI } from "@/hooks/use-lead-context"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"

// Placeholder for the EstoqueModal component.
// This component needs to be defined elsewhere or imported.
// For now, we assume it exists and has the props `isOpen`, `onClose`, `product`, and `onConfirm`.
// const EstoqueModal = dynamic(() => import('@/components/estoque-modal')); // Example if it's a dynamic import

// Define a type for the product, if not already defined elsewhere.
// interface Produto {
//   CODPROD: string;
//   DESCRPROD: string;
//   // Add other relevant properties like VLRCOMERC, estoque, etc.
// }


interface LeadModalProps {
  isOpen: boolean
  onClose: () => void
  lead: Lead | null
  onSave: () => void
  funilSelecionado?: any
  onLeadUpdated?: () => void // Callback para notificar que o lead foi atualizado
}

interface Partner {
  CODPARC: string
  NOMEPARC: string
  CGC_CPF: string
  TIPPESSOA?: 'J' | 'F'
  IDENTINSCESTAD?: string
  RAZAOSOCIAL?: string
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

interface AtividadeItemProps {
  atividade: any
  codLead: string
  onReload: () => void
  isLeadPerdido?: boolean // Adicionado para indicar se o lead está perdido ou ganho
}

function AtividadeItem({ atividade, codLead, onReload, isLeadPerdido }: AtividadeItemProps) {
  const { toast } = useToast()
  const [editandoAtividade, setEditandoAtividade] = useState(false)
  const [tituloAtividade, setTituloAtividade] = useState(atividade.DESCRICAO?.split('|')[0] || atividade.DESCRICAO || '')
  const [descricaoAtividade, setDescricaoAtividade] = useState(atividade.DESCRICAO?.split('|')[1] || '')
  const [tipoAtividade, setTipoAtividade] = useState(atividade.TIPO)
  const [corAtividade, setCorAtividade] = useState(atividade.COR || '#22C55E')
  const [dataInicioAtividade, setDataInicioAtividade] = useState(atividade.DATA_INICIO ? atividade.DATA_INICIO.slice(0, 16) : new Date().toISOString().slice(0, 16))
  const [dataFimAtividade, setDataFimAtividade] = useState(atividade.DATA_FIM ? atividade.DATA_FIM.slice(0, 16) : new Date().toISOString().slice(0, 16))
  const [salvandoAtividade, setSalvandoAtividade] = useState(false)
  const [concluindoAtividade, setConcluindoAtividade] = useState(false)
  const [inativandoAtividade, setInativandoAtividade] = useState(false)
  const estaRealizado = atividade.STATUS === 'REALIZADO'

  const marcarRealizadoAtividade = async () => {
    try {
      setConcluindoAtividade(true)
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: atividade.CODATIVIDADE, STATUS: 'REALIZADO' })
      })

      if (!response.ok) throw new Error('Erro ao marcar como concluído')

      toast({
        title: "Sucesso",
        description: "Tarefa concluída",
      })

      await onReload()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setConcluindoAtividade(false)
    }
  }

  const marcarAguardandoAtividade = async () => {
    try {
      setConcluindoAtividade(true)
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: atividade.CODATIVIDADE, STATUS: 'AGUARDANDO' })
      })

      if (!response.ok) throw new Error('Erro ao alterar status')

      toast({
        title: "Sucesso",
        description: "Status alterado para Aguardando",
      })

      await onReload()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setConcluindoAtividade(false)
    }
  }

  const salvarEdicaoAtividade = async () => {
    try {
      setSalvandoAtividade(true)

      // Adicionar ':00Z' para forçar UTC e evitar conversão de timezone
      const dataInicioUTC = dataInicioAtividade + ':00Z'
      const dataFimUTC = dataFimAtividade + ':00Z'

      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: atividade.CODATIVIDADE,
          TITULO: tituloAtividade,
          DESCRICAO: descricaoAtividade,
          TIPO: tipoAtividade,
          COR: corAtividade,
          DATA_INICIO: dataInicioUTC,
          DATA_FIM: dataFimUTC
        })
      })

      if (!response.ok) throw new Error('Erro ao atualizar')

      setEditandoAtividade(false)
      await onReload()

      toast({
        title: "Sucesso",
        description: "Atividade atualizada",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSalvandoAtividade(false)
    }
  }

  const inativarAtividade = async () => {
    try {
      setInativandoAtividade(true)
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: atividade.CODATIVIDADE,
          ATIVO: 'N'
        })
      })

      if (!response.ok) throw new Error('Erro ao inativar')

      toast({
        title: "Sucesso",
        description: "Atividade inativada",
      })

      await onReload()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setInativandoAtividade(false)
    }
  }

  return (
    <div className={`border rounded-lg p-3 space-y-3 ${isLeadPerdido ? 'bg-gray-100' : 'bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 flex items-start gap-2">
          {atividade.STATUS === 'REALIZADO' && <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />}
          {atividade.STATUS === 'ATRASADO' && <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />}
          {atividade.STATUS === 'AGUARDANDO' && <Clock className="w-5 h-5 text-blue-600 mt-0.5" />}
          <div className="flex-1">
            <h3 className="font-semibold text-sm">{atividade.DESCRICAO?.split('|')[0] || atividade.DESCRICAO}</h3>
            <p className="text-xs text-muted-foreground mt-1">{atividade.DESCRICAO?.split('|')[1] || ''}</p>
          </div>
        </div>
        <Badge className={`${atividade.STATUS === 'REALIZADO' ? 'bg-green-500' : atividade.STATUS === 'ATRASADO' ? 'bg-red-500' : 'bg-blue-500'} text-white ml-2 flex-shrink-0`}>
          {atividade.STATUS === 'REALIZADO' ? 'Concluído' : atividade.STATUS === 'ATRASADO' ? 'Atrasado' : 'Aguardando'}
        </Badge>
      </div>

      {editandoAtividade ? (
        <div className="space-y-3 pt-3 border-t">
          <div>
            <Label className="text-xs">Título</Label>
            <Input
              value={tituloAtividade}
              onChange={(e) => setTituloAtividade(e.target.value)}
              className="text-xs"
              disabled={salvandoAtividade || isLeadPerdido} // Desabilitar se lead perdido
            />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea
              value={descricaoAtividade}
              onChange={(e) => setDescricaoAtividade(e.target.value)}
              className="text-xs"
              disabled={salvandoAtividade || isLeadPerdido} // Desabilitar se lead perdido
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Tipo</Label>
            <Select value={tipoAtividade} onValueChange={setTipoAtividade} disabled={salvandoAtividade || isLeadPerdido}>
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TAREFA">Tarefa</SelectItem>
                <SelectItem value="REUNIAO">Reunião</SelectItem>
                <SelectItem value="LIGACAO">Ligação</SelectItem>
                <SelectItem value="EMAIL">E-mail</SelectItem>
                <SelectItem value="VISITA">Visita</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cor</Label>
            <Input
              type="color"
              value={corAtividade}
              onChange={(e) => setCorAtividade(e.target.value)}
              className="text-xs h-10"
              disabled={salvandoAtividade || isLeadPerdido} // Desabilitar se lead perdido
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Data Início</Label>
              <Input
                type="datetime-local"
                value={dataInicioAtividade}
                onChange={(e) => setDataInicioAtividade(e.target.value)}
                className="text-xs"
                disabled={salvandoAtividade || isLeadPerdido} // Desabilitar se lead perdido
              />
            </div>
            <div>
              <Label className="text-xs">Data Fim</Label>
              <Input
                type="datetime-local"
                value={dataFimAtividade}
                onChange={(e) => setDataFimAtividade(e.target.value)}
                className="text-xs"
                disabled={salvandoAtividade || isLeadPerdido} // Desabilitar se lead perdido
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={salvarEdicaoAtividade} disabled={salvandoAtividade || isLeadPerdido}>
              {salvandoAtividade ? (
                <>
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditandoAtividade(false)} disabled={salvandoAtividade || isLeadPerdido}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium">Tipo:</span> {atividade.TIPO}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-medium">Data:</span>{' '}
              {atividade.DATA_INICIO ? new Date(atividade.DATA_INICIO).toLocaleDateString('pt-BR') : new Date(atividade.DATA_HORA).toLocaleDateString('pt-BR')}
            </span>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            {estaRealizado ? (
              <Button
                size="sm"
                onClick={marcarAguardandoAtividade}
                className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none"
                disabled={concluindoAtividade || isLeadPerdido} // Desabilitar se lead perdido
              >
                {concluindoAtividade ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  'Voltar p/ Aguardando'
                )}
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={marcarRealizadoAtividade}
                  className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none"
                  disabled={concluindoAtividade || isLeadPerdido} // Desabilitar se lead perdido
                >
                  {concluindoAtividade ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Concluindo...
                    </>
                  ) : (
                    'Concluir'
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditandoAtividade(true)} disabled={isLeadPerdido}>
                  Editar
                </Button>
                <Button size="sm" variant="destructive" onClick={inativarAtividade} disabled={inativandoAtividade || isLeadPerdido}>
                  {inativandoAtividade ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Inativando...
                    </>
                  ) : (
                    'Inativar'
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function LeadModal({ isOpen, onClose, lead, onSave, funilSelecionado, onLeadUpdated }: LeadModalProps) {
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
  const [loadingMessage, setLoadingMessage] = useState("")
  const [parceiros, setParceiros] = useState<Partner[]>([]) // Garantir que sempre é um array
  const [isLoadingPartners, setIsLoadingPartners] = useState(false)
  const [estagios, setEstagios] = useState<any[]>([])
  const { toast } = useToast()
  const [partnerSearch, setPartnerSearch] = useState("")
  const [partnerLoadError, setPartnerLoadError] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [atividades, setAtividades] = useState<any[]>([])
  const [eventos, setEventos] = useState<any[]>([])
  const [activeAtividadeTab, setActiveAtividadeTab] = useState<'nota' | 'email' | 'ligacao' | 'whatsapp' | 'proposta' | 'reuniao' | 'visita'>('nota')
  const [atividadeForm, setAtividadeForm] = useState({
    descricao: '',
    dataInicial: new Date().toISOString().slice(0, 16), // formato: YYYY-MM-DDTHH:mm
    dataFinal: new Date().toISOString().slice(0, 16) // formato: YYYY-MM-DDTHH:mm
  })
  const [produtosLead, setProdutosLead] = useState<any[]>([])
  const [isSavingAtividade, setIsSavingAtividade] = useState(false)
  const [isLoadingAtividades, setIsLoadingAtividades] = useState(false)
  const [isLoadingProdutos, setIsLoadingProdutos] = useState(false)
  const [editandoProduto, setEditandoProduto] = useState<string | null>(null)
  const [produtoEditForm, setProdutoEditForm] = useState({ quantidade: 0, vlrunit: 0 })
  const [showModalEdicaoProduto, setShowModalEdicaoProduto] = useState(false)
  const [produtoSelecionadoEdicao, setProdutoSelecionadoEdicao] = useState<any | null>(null)
  const [showAlterarEstagioModal, setShowAlterarEstagioModal] = useState(false)
  const [showAdicionarProdutoModal, setShowAdicionarProdutoModal] = useState(false)
  const [showEditarTituloModal, setShowEditarTituloModal] = useState(false)
  const [novoTitulo, setNovoTitulo] = useState("")
  const [showPerdidoModal, setShowPerdidoModal] = useState(false)
  const [motivoPerda, setMotivoPerda] = useState("")
  const [showPedidoVendaModal, setShowPedidoVendaModal] = useState(false)
  const [dadosPedidoVenda, setDadosPedidoVenda] = useState<any>(null)
  const [isConfirmingPerdido, setIsConfirmingPerdido] = useState(false)
  const [mostrarDialogoStatus, setMostrarDialogoStatus] = useState(false)
  const [mostrarDialogoPerda, setMostrarDialogoPerda] = useState(false)
  const [mostrarConfirmacaoExclusao, setMostrarConfirmacaoExclusao] = useState(false)
  const [mostrarPedidoVenda, setMostrarPedidoVenda] = useState(false) // Adicionado para controlar a visibilidade do modal de pedido de venda
  const [showConfirmacaoGanho, setShowConfirmacaoGanho] = useState(false) // Estado para confirmação de ganho
  const [isLoadingPedido, setIsLoadingPedido] = useState(false) // Estado para controlar o carregamento do pedido
  const [showPedidoRapido, setShowPedidoRapido] = useState(false) // Estado para controlar a visibilidade do modal Pedido Rápido
  const [showProdutoModal, setShowProdutoModal] = useState(false); // Estado para controlar a visibilidade do modal de produto

  const isLeadPerdido = lead?.STATUS_LEAD === 'PERDIDO' || lead?.STATUS_LEAD === 'GANHO' // Define a condição para desabilitar botões

  // Hook para coletar contexto completo do lead para IA
  const { context: leadContext, isLoading: isLoadingContext } = useLeadContext(
    lead,
    funilSelecionado,
    estagios,
    parceiros
  )

  // Log do contexto para IA quando disponível
  useEffect(() => {
    if (leadContext && lead) {
      const contextForAI = formatLeadContextForAI(leadContext)
      console.log('🤖 CONTEXTO DO LEAD PARA IA:', contextForAI)

      // Disponibilizar no window para acesso global (útil para ferramentas de IA)
      if (typeof window !== 'undefined') {
        (window as any).currentLeadContext = {
          raw: leadContext,
          formatted: contextForAI
        }
      }
    }
  }, [leadContext, lead])

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true)

      if (lead) {
        console.log('🔍 Lead carregado - CODPARC:', lead.CODPARC)

        setFormData({
          NOME: lead.NOME || "",
          DESCRICAO: lead.DESCRICAO || "",
          VALOR: lead.VALOR || 0,
          CODESTAGIO: lead.CODESTAGIO || "",
          DATA_VENCIMENTO: lead.DATA_VENCIMENTO || "",
          TIPO_TAG: lead.TIPO_TAG || "",
          COR_TAG: lead.COR_TAG || "#3b82f6",
          CODPARC: lead.CODPARC || undefined,
          CODFUNIL: lead.CODFUNIL || undefined,
        })

        // Se existe CODPARC, carregar parceiros e buscar o nome
        if (lead.CODPARC) {
          loadPartners().then(() => {
            // Após carregar parceiros, buscar o nome do parceiro selecionado
            const parceiro = parceiros.find(p => p.CODPARC === lead.CODPARC)
            if (parceiro) {
              setPartnerSearch(parceiro.NOMEPARC)
              console.log('✅ Parceiro encontrado:', parceiro.NOMEPARC)
            } else {
              // Se não encontrou na lista inicial, buscar especificamente
              loadPartners(lead.CODPARC)
            }
          })
        } else {
          // Se não tem CODPARC, carregar lista vazia/padrão
          loadPartners()
          setPartnerSearch("")
        }

        loadAtividades(lead.CODLEAD)
        loadEventos(lead.CODLEAD)
        loadProdutosLead(lead.CODLEAD)
      } else {
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
        setAtividades([])
        setEventos([])
        loadPartners()
        setPartnerSearch("")
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsInitializing(false)
        })
      })
    }
  }, [lead, isOpen])

  useEffect(() => {
    if (!isOpen) {
      setIsInitializing(false)
      setPartnerSearch("")
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      loadPartners()
      if (funilSelecionado) {
        setEstagios(funilSelecionado.estagios)
        if (!lead && funilSelecionado.estagios.length > 0) {
          setFormData(prev => ({
            ...prev,
            CODFUNIL: funilSelecionado.CODFUNIL,
            CODESTAGIO: funilSelecionado.estagios[0].CODESTAGIO
          }))
        } else if (lead && lead.CODFUNIL === funilSelecionado.CODFUNIL) {
          setFormData(prev => ({
            ...prev,
            CODFUNIL: funilSelecionado.CODFUNIL,
            CODESTAGIO: lead.CODESTAGIO || (funilSelecionado.estagios.length > 0 ? funilSelecionado.estagios[0].CODESTAGIO : "")
          }))
        }
      }
    }
  }, [isOpen, funilSelecionado, lead])

  const loadPartners = async (searchTerm: string = "") => {
    try {
      setIsLoadingPartners(true)
      setPartnerLoadError(false)

      // Tentar buscar do cache primeiro
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        try {
          const data = JSON.parse(cachedParceiros)
          // Garantir que é um array
          setParceiros(Array.isArray(data) ? data : [])
          console.log('✅ Parceiros carregados do cache (LeadModal)')
          setIsLoadingPartners(false)
          return
        } catch (e) {
          console.error('Erro ao parsear cache de parceiros:', e)
          sessionStorage.removeItem('cached_parceiros')
        }
      }

      // Se searchTerm é numérico, buscar por código, senão por nome
      const isNumeric = /^\d+$/.test(searchTerm)
      const searchParam = isNumeric
        ? `searchCode=${encodeURIComponent(searchTerm)}`
        : `searchName=${encodeURIComponent(searchTerm)}`

      const url = `/api/sankhya/parceiros?page=1&pageSize=50&${searchParam}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Falha ao carregar parceiros')
      const data = await response.json()

      // Garantir que sempre definimos um array
      const parceirosList = Array.isArray(data.parceiros) ? data.parceiros : []
      setParceiros(parceirosList)

      // Salvar no cache
      if (parceirosList.length > 0) {
        sessionStorage.setItem('cached_parceiros', JSON.stringify(parceirosList))
        console.log('✅ Parceiros carregados da API e salvos no cache (LeadModal)')
      }

    } catch (error: any) {
      console.error('❌ Erro ao carregar parceiros:', error)
      setPartnerLoadError(true)
      setParceiros([]) // Sempre garantir array vazio em caso de erro
    } finally {
      setIsLoadingPartners(false)
    }
  }

  const handlePartnerSearch = (value: string) => {
    setPartnerSearch(value)
    if (value.length >= 2) {
      loadPartners(value)
    } else if (value.length === 0) {
      // Limpar busca e carregar todos do cache (se houver) ou da API
      loadPartners()
    }
  }

  const loadAtividades = async (codLead: string) => {
    try {
      setIsLoadingAtividades(true)
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/leads/atividades?codLead=${codLead}&t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Erro ao carregar atividades')
      const data = await response.json()
      console.log('✅ Atividades carregadas:', data.length)
      setAtividades(data)
    } catch (error) {
      console.error('Erro ao carregar atividades:', error)
    } finally {
      setIsLoadingAtividades(false)
    }
  }

  const loadEventos = async (codLead: string) => {
    try {
      const response = await fetch(`/api/leads/eventos?codLead=${codLead}`)
      if (!response.ok) throw new Error('Erro ao carregar eventos')
      const data = await response.json()
      setEventos(data)
    } catch (error) {
      console.error('Erro ao carregar eventos:', error)
    }
  }

  const loadProdutosLead = async (codLead: string) => {
    try {
      setIsLoadingProdutos(true)
      const response = await fetch(`/api/leads/produtos?codLead=${codLead}`)
      if (!response.ok) throw new Error('Erro ao carregar produtos')
      const data = await response.json()
      setProdutosLead(data)
    } catch (error) {
      console.error('Erro ao carregar produtos do lead:', error)
      setProdutosLead([])
    } finally {
      setIsLoadingProdutos(false)
    }
  }

  const handleRemoverProduto = async (codItem: string) => {
    if (!confirm('Deseja realmente remover este produto?')) return
    if (!lead) return

    setIsSaving(true)
    setLoadingMessage("Removendo produto...")

    try {
      const response = await fetch('/api/leads/produtos/remover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codItem,
          codLead: lead.CODLEAD
        })
      })

      if (!response.ok) throw new Error('Erro ao remover produto')

      const resultado = await response.json()

      toast({
        title: "Sucesso",
        description: "Produto removido com sucesso",
      })

      // Atualizar valor total do lead no formData ANTES de recarregar
      if (resultado.novoValorTotal !== undefined) {
        console.log('💰 Atualizando valor total do modal:', resultado.novoValorTotal)
        setFormData(prev => ({
          ...prev,
          VALOR: resultado.novoValorTotal
        }))
      }

      // Recarregar produtos do lead
      await loadProdutosLead(lead.CODLEAD)

      // Recarregar a lista de leads para atualizar o valor no kanban
      await onSave()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }



  const handleEditarProduto = (produto: any) => {
    setProdutoSelecionadoEdicao(produto)
    setProdutoEditForm({
      quantidade: produto.QUANTIDADE,
      vlrunit: produto.VLRUNIT
    })
    setShowModalEdicaoProduto(true)
  }

  const handleSalvarEdicaoProduto = async () => {
    if (!produtoSelecionadoEdicao || !lead) return

    console.log('💾 Salvando edição do produto:', produtoSelecionadoEdicao)
    setIsSaving(true)
    setLoadingMessage("Atualizando produto...")

    try {
      const payload = {
        codItem: String(produtoSelecionadoEdicao.CODITEM),
        codLead: String(lead.CODLEAD),
        quantidade: Number(produtoEditForm.quantidade),
        vlrunit: Number(produtoEditForm.vlrunit)
      }

      console.log('📤 Payload sendo enviado:', payload)

      const response = await fetch('/api/leads/produtos/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar produto')
      }

      const resultado = await response.json()
      console.log('✅ Resultado da atualização:', resultado)

      // Atualizar valor total do lead no formData IMEDIATAMENTE
      if (resultado.novoValorTotal !== undefined) {
        console.log('💰 Atualizando valor total do lead:', resultado.novoValorTotal)
        setFormData(prev => ({
          ...prev,
          VALOR: resultado.novoValorTotal
        }))
      }

      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso",
      })

      // Fechar modal e limpar formulário
      setShowModalEdicaoProduto(false)
      setProdutoSelecionadoEdicao(null)
      setProdutoEditForm({ quantidade: 0, vlrunit: 0 })

      // Recarregar produtos
      await loadProdutosLead(lead.CODLEAD)

      // Notificar parent para atualizar kanban IMEDIATAMENTE
      if (onLeadUpdated) {
        onLeadUpdated()
      }

      // Recarregar a lista de leads para atualizar o valor no kanban
      await onSave()
    } catch (error: any) {
      console.error('❌ Erro ao salvar edição:', error)
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }

  const handleCriarAtividade = async () => {
    if (!lead || !atividadeForm.descricao) {
      toast({
        title: "Atenção",
        description: "Preencha a descrição da atividade",
        variant: "destructive",
      })
      return
    }

    const tipoMap: any = {
      'nota': 'NOTA',
      'email': 'EMAIL',
      'ligacao': 'LIGACAO',
      'whatsapp': 'WHATSAPP',
      'proposta': 'PROPOSTA',
      'reuniao': 'REUNIAO',
      'visita': 'VISITA'
    }

    // Cores predefinidas por tipo
    const coresMap: any = {
      'nota': '#EAB308',      // Amarelo
      'ligacao': '#9333EA',   // Roxo
      'email': '#3B82F6',     // Azul
      'whatsapp': '#22C55E',  // Verde
      'proposta': '#6B7280',  // Cinza
      'reuniao': '#F97316',   // Laranja
      'visita': '#000000'     // Preto
    }

    // Todos os tipos geram eventos no calendário
    const tiposComEvento = ['nota', 'email', 'ligacao', 'whatsapp', 'proposta', 'reuniao', 'visita']

    setIsSavingAtividade(true)

    try {
      // Criar atividade - manter a data/hora exata inserida pelo usuário
      // Adicionar 'Z' para forçar UTC e evitar conversão de fuso horário
      const dataInicio = atividadeForm.dataInicial + ':00.000Z';
      const dataFim = atividadeForm.dataFinal + ':00.000Z';

      const response = await fetch('/api/leads/atividades/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODLEAD: lead.CODLEAD,
          TIPO: tipoMap[activeAtividadeTab],
          DESCRICAO: atividadeForm.descricao,
          DADOS_COMPLEMENTARES: '',
          COR: coresMap[activeAtividadeTab],
          DATA_INICIO: dataInicio,
          DATA_FIM: dataFim
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar atividade')
      }

      const atividadeCriada = await response.json()

      // Atividade criada com sucesso - eventos removidos do sistema

      // Limpar formulário antes de recarregar
      setAtividadeForm({
        descricao: '',
        dataInicial: new Date().toISOString().slice(0, 16),
        dataFinal: new Date().toISOString().slice(0, 16)
      })

      // Recarregar atividades com timestamp para forçar atualização
      await loadAtividades(lead.CODLEAD)
      await loadEventos(lead.CODLEAD)

      toast({
        title: "Sucesso",
        description: "Atividade registrada com sucesso",
      })
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSavingAtividade(false)
    }
  }

  const handleStatusChange = async (status: 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO') => {
    if (!lead) return

    // Bloquear alterações se já estiver GANHO ou PERDIDO
    if (lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO') {
      toast({
        title: "Atenção",
        description: "Este lead já foi finalizado e não pode ser alterado",
        variant: "destructive",
      })
      return
    }

    if (status === 'PERDIDO') {
      setShowPerdidoModal(true)
      return
    }

    if (status === 'GANHO') {
      // Validar se tem produtos antes de abrir modal de pedido
      if (produtosLead.length === 0) {
        toast({
          title: "Atenção",
          description: "Adicione pelo menos um produto antes de marcar como ganho",
          variant: "destructive",
        })
        return
      }

      // Preparar dados do pedido de venda com informações do lead
      const parceiro = parceiros.find(p => p.CODPARC === formData.CODPARC)

      // Obter vendedor do usuário logado
      let codVendUsuario = "0"
      try {
        const userStr = document.cookie
          .split('; ')
          .find(row => row.startsWith('user='))
          ?.split('=')[1]

        if (userStr) {
          const user = JSON.parse(decodeURIComponent(userStr))
          if (user.codVendedor) {
            codVendUsuario = String(user.codVendedor)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar vendedor do usuário:', error)
      }

      const dadosPedido = {
        CODEMP: "1",
        CODCENCUS: "0",
        NUNOTA: "",
        DTNEG: new Date().toISOString().split('T')[0],
        DTFATUR: "",
        DTENTSAI: "",
        CODPARC: formData.CODPARC || "",
        CODTIPOPER: "974",
        TIPMOV: "P",
        CODTIPVENDA: "1",
        CODVEND: codVendUsuario,
        OBSERVACAO: `Lead: ${lead.NOME} - ${formData.DESCRICAO || ''}`,
        VLOUTROS: 0,
        VLRDESCTOT: 0,
        VLRFRETE: 0,
        TIPFRETE: "S",
        ORDEMCARGA: "",
        CODPARCTRANSP: "0",
        PERCDESC: 0,
        CODNAT: "0",
        TIPO_CLIENTE: parceiro?.TIPPESSOA === 'J' ? 'PJ' : parceiro?.TIPPESSOA === 'F' ? 'PF' : 'PJ',
        CPF_CNPJ: parceiro?.CGC_CPF || '',
        IE_RG: parceiro?.IDENTINSCESTAD || '',
        RAZAOSOCIAL: parceiro?.RAZAOSOCIAL || parceiro?.NOMEPARC || '',
        RAZAO_SOCIAL: parceiro?.RAZAOSOCIAL || parceiro?.NOMEPARC || '',
        itens: produtosLead.map(prod => ({
          CODPROD: String(prod.CODPROD),
          DESCRPROD: prod.DESCRPROD,
          QTDNEG: prod.QUANTIDADE,
          VLRUNIT: prod.VLRUNIT,
          PERCDESC: 0,
          CODLOCALORIG: "700",
          CONTROLE: "007",
          AD_QTDBARRA: 1,
          CODVOL: "UN",
          IDALIQICMS: "0"
        }))
      }

      setDadosPedidoVenda(dadosPedido)
      setMostrarPedidoVenda(true) // Abre o modal de pedido de venda
      return
    }

    // EM_ANDAMENTO
    try {
      console.log('🔄 Atualizando status do lead para:', status)
      await atualizarStatusLead(lead.CODLEAD, status)
      toast({
        title: "Sucesso",
        description: "Lead marcado como Em Andamento",
      })
      await onSave()
    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error)
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const confirmarPerdido = async () => {
    if (!lead || !motivoPerda.trim()) {
      toast({
        title: "Atenção",
        description: "Informe o motivo da perda",
        variant: "destructive",
      })
      return
    }

    setIsConfirmingPerdido(true)

    try {
      console.log('🔄 Iniciando marcação como perdido - CODLEAD:', lead.CODLEAD)

      // Atualizar status do lead para PERDIDO com motivo via API
      const response = await fetch('/api/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codLead: lead.CODLEAD,
          status: 'PERDIDO',
          motivoPerda: motivoPerda
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao atualizar status')
      }

      console.log('✅ Lead marcado como perdido com sucesso')

      toast({
        title: "Sucesso",
        description: "Lead marcado como Perdido",
      })

      // Fechar modal de perda
      setMostrarDialogoPerda(false)
      setMotivoPerda("")

      // Recarregar dados do kanban
      await onSave()

      // Fechar modal do lead
      onClose()
    } catch (error: any) {
      console.error('❌ Erro ao confirmar perda:', error)
      toast({
        title: "Erro",
        description: error.message || 'Erro ao marcar lead como perdido',
        variant: "destructive",
      })
    } finally {
      setIsConfirmingPerdido(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Bloquear salvamento se lead já estiver finalizado
    if (lead && (lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO')) {
      toast({
        title: "Atenção",
        description: "Este lead já foi finalizado e não pode ser alterado",
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
    setLoadingMessage(lead ? "Atualizando lead..." : "Criando lead...")

    try {
      const dataToSave: any = {
        NOME: formData.NOME,
        DESCRICAO: formData.DESCRICAO,
        VALOR: formData.VALOR || 0,
        CODESTAGIO: formData.CODESTAGIO,
        CODFUNIL: formData.CODFUNIL || funilSelecionado?.CODFUNIL,
        DATA_VENCIMENTO: formData.DATA_VENCIMENTO,
        TIPO_TAG: formData.TIPO_TAG,
        COR_TAG: formData.COR_TAG
      }

      // Incluir CODLEAD se for atualização
      if (lead?.CODLEAD) {
        dataToSave.CODLEAD = lead.CODLEAD
      }

      // Incluir CODPARC apenas se foi selecionado
      if (formData.CODPARC) {
        dataToSave.CODPARC = String(formData.CODPARC)
        console.log('💾 Salvando lead com CODPARC:', dataToSave.CODPARC)
      } else {
        console.log('💾 Salvando lead sem CODPARC (vazio)')
      }

      // Incluir produtos vinculados ao lead
      if (produtosLead && produtosLead.length > 0) {
        dataToSave.PRODUTOS = produtosLead.map(p => ({
          CODPROD: p.CODPROD,
          DESCRPROD: p.DESCRPROD,
          QUANTIDADE: p.QUANTIDADE,
          VLRUNIT: p.VLRUNIT,
          VLRTOTAL: p.VLRTOTAL
        }))
        console.log('📦 Incluindo produtos no lead:', dataToSave.PRODUTOS)
      }

      const response = await fetch('/api/leads/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao salvar lead')
      }

      const resultado = await response.json()
      console.log('✅ Lead salvo com sucesso:', resultado)

      toast({
        title: "Sucesso",
        description: lead ? "Lead atualizado com sucesso!" : "Lead criado com sucesso!",
      })

      await onSave()
      onClose()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar lead. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    try {
      // Se a data já está no formato DD/MM/YYYY
      if (dateString.includes('/')) {
        return dateString
      }
      // Se a data está no formato ISO ou YYYY-MM-DD
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleDateString('pt-BR')
    } catch (e) {
      return ''
    }
  }

  const [activeTab, setActiveTab] = useState<'atividades' | 'valor' | 'dados'>('atividades')

  if (!isOpen) return null

  if (isInitializing) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div className="relative flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  const parceiroSelecionado = Array.isArray(parceiros) ? parceiros.find(p => p.CODPARC === formData.CODPARC) : undefined
  const estagioAtual = Array.isArray(estagios) ? estagios.find(e => e.CODESTAGIO === formData.CODESTAGIO) : undefined
  const currentUser = lead ? { name: 'Usuário Atual' } : null

  // Função para reativar o lead
  const handleReativarLead = async () => {
    if (!lead) return

    setIsSaving(true)
    setLoadingMessage("Reativando lead...")

    try {
      console.log('🔄 Reativando lead - CODLEAD:', lead.CODLEAD)

      // Usar a rota de status existente
      const response = await fetch('/api/leads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codLead: lead.CODLEAD,
          status: 'EM_ANDAMENTO'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao reativar lead')
      }

      console.log('✅ Lead reativado com sucesso')

      toast({
        title: "Sucesso",
        description: "Lead reativado para Em Andamento",
      })

      // Aguardar para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500))

      // Recarregar dados
      await onSave()

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 300))

      // Fechar modal para forçar reabertura com dados atualizados
      onClose()

    } catch (error: any) {
      console.error('❌ Erro ao reativar lead:', error)
      toast({
        title: "Erro",
        description: error.message || 'Erro ao reativar lead',
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }

  // Função para confirmar a exclusão do lead
  const handleConfirmarExclusao = async () => {
    if (!lead) return

    setIsSaving(true)
    setLoadingMessage("Excluindo lead...")

    try {
      const response = await fetch(`/api/leads/excluir/${lead.CODLEAD}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir lead')
      }

      toast({
        title: "Sucesso",
        description: "Lead excluído com sucesso",
      })

      setMostrarConfirmacaoExclusao(false)
      onClose()
      onSave() // Recarrega a lista principal

    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }

  // Mock da função handleCriarPedido para fins de teste da UI
  const handleCriarPedido = () => {
    console.log("Simulando criação de pedido de venda...")
    // No componente real, esta função chamaria a lógica para abrir o modal de pedido de venda
    // e preenchê-lo com os dados do lead e produtos.
    // Por enquanto, apenas simulamos a ação.
    setDadosPedidoVenda(null) // Limpa dados anteriores
    setMostrarPedidoVenda(true) // Abre o modal de pedido de venda
  }

  // Função para lidar com o sucesso da criação do pedido de venda
  const handlePedidoSucesso = async () => {
    console.log('✅ Pedido criado com sucesso - atualizando status do lead...')

    setIsSaving(true)
    setLoadingMessage("Marcando lead como ganho...")

    try {
      // Atualizar status do lead para GANHO
      const response = await fetch(`/api/leads/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codLead: lead?.CODLEAD,
          status: 'GANHO'
        })
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar status do lead')
      }

      console.log('✅ Status do lead atualizado para GANHO')

      toast({
        title: "Sucesso",
        description: "Pedido criado e lead marcado como ganho!",
      })

      // Fechar todos os modais
      setMostrarPedidoVenda(false)
      setMostrarDialogoStatus(false)

      // Aguardar um pouco para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 300))

      // Atualizar lista de leads
      await onSave()

      // Aguardar renderização
      await new Promise(resolve => setTimeout(resolve, 300))

      // Fechar modal do lead
      onClose()

    } catch (error: any) {
      console.error('❌ Erro ao atualizar status:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do lead",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
      setLoadingMessage("")
    }
  }

  const handleClose = () => {
    // Força o fechamento de todos os modais e limpa estados
    setShowModalEdicaoProduto(false)
    setShowAdicionarProdutoModal(false)
    setShowEditarTituloModal(false)
    setShowPerdidoModal(false)
    setShowPedidoVendaModal(false)
    setMostrarDialogoStatus(false)
    setMostrarDialogoPerda(false)
    setMostrarConfirmacaoExclusao(false)
    setMostrarPedidoVenda(false)
    setShowConfirmacaoGanho(false)
    setShowAlterarEstagioModal(false)
    setShowProdutoModal(false) // Fechar modal de produto também

    // Limpa estados de produtos
    setProdutoSelecionadoEdicao(null)
    setProdutoEditForm({ quantidade: 0, vlrunit: 0 })

    // Limpa outros estados
    setMotivoPerda("")
    setDadosPedidoVenda(null)
    setPartnerSearch("")
    setAtividades([])
    setEventos([])
    setProdutosLead([])

    // Reseta o formulário
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

    setAtividadeForm({
      descricao: '',
      dataInicial: new Date().toISOString().slice(0, 16),
      dataFinal: new Date().toISOString().slice(0, 16)
    })

    // Fecha o modal principal
    onClose()
  }



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {isSaving && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">{loadingMessage}</p>
          </div>
        </div>
      )}



      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-7xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b bg-background/50 px-4 md:px-6 py-4 md:py-3">
          <div className="flex items-center justify-between mb-4 md:mb-3">
            <div className="flex items-center gap-2 md:gap-3 flex-wrap flex-1">
              <h2 className="text-sm md:text-lg font-bold text-foreground break-words">
                {lead ? `${lead.CODLEAD} - ${formData.NOME}` : "Novo Lead"}
              </h2>
              <span className="text-[10px] md:text-sm text-muted-foreground whitespace-nowrap">Período indefinido</span>
              <div className="flex items-center gap-1">
                <User className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
                <span className="text-[10px] md:text-sm text-muted-foreground whitespace-nowrap">{currentUser?.name || 'Usuário'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {lead && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2">
                    <div className="space-y-1">
                      <button
                        onClick={() => {
                          setNovoTitulo(formData.NOME || "")
                          setShowEditarTituloModal(true)
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors"
                        disabled={isLeadPerdido}
                      >
                        Editar título
                      </button>
                      <button
                        onClick={() => setShowAlterarEstagioModal(true)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={lead?.STATUS_LEAD === 'GANHO' || lead?.STATUS_LEAD === 'PERDIDO'}
                      >
                        Alterar estágio
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleClose()
                }}
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                type="button"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          {/* Funil Progress - Mobile: apenas estágio atual, Desktop: todos os estágios */}
      {estagios.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-2 mb-4 md:mb-3">
          <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>{funilSelecionado?.NOME || 'Funil de Vendas'}</span>
          </div>

          {/* Mobile: Apenas estágio atual */}
          <div className="md:hidden">
            {estagioAtual && (
              <div
                className="px-3 py-1.5 text-xs font-medium rounded-md text-white flex items-center justify-center"
                style={{ backgroundColor: estagioAtual.COR }}
              >
                <span>{estagioAtual.NOME}</span>
              </div>
            )}
          </div>

          {/* Desktop: Todos os estágios */}
          <div className="hidden md:flex items-center flex-1 relative overflow-x-auto">
            {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio, index) => {
              const isActive = estagio.CODESTAGIO === formData.CODESTAGIO;
              const isPast = index < estagios.findIndex(e => e.CODESTAGIO === formData.CODESTAGIO);

              return (
                <div
                  key={estagio.CODESTAGIO}
                  className={`
                    relative px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium
                    ${isActive ? 'bg-primary text-primary-foreground' : isPast ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}
                    ${index === 0 ? 'rounded-l-md pl-3 md:pl-4' : 'pl-4 md:pl-5'}
                    ${index === estagios.length - 1 ? 'rounded-r-md pr-3 md:pr-4' : 'pr-2 md:pr-3'}
                    transition-all duration-200
                    flex items-center justify-center
                    flex-1 min-w-fit
                  `}
                  style={{
                    clipPath: index === estagios.length - 1
                      ? undefined
                      : 'polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%, 8px 50%)',
                    marginRight: index === estagios.length - 1 ? '0' : '-8px',
                    zIndex: estagios.length - index
                  }}
                >
                  <span className="relative whitespace-nowrap">{estagio.NOME}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

          {/* Ações Rápidas - Mobile: apenas ícones em linha horizontal no cabeçalho */}
          {lead && (
            <div className="flex items-center gap-2 mt-3 md:hidden">
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLeadPerdido}
              >
                <Mail className="w-4 h-4" />
              </button>
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLeadPerdido}
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLeadPerdido}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white rounded-md p-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                disabled={isLeadPerdido}
              >
                <MessageSquare className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Container: Opções do Cabeçalho - Estilo Pills (Desktop apenas) */}
          {lead && (
            <div className="hidden md:flex items-center gap-2 flex-wrap mt-3 md:mt-0">
              {/* Botão ATIVAR - apenas para leads perdidos, não para GANHO */}
              {lead.STATUS_LEAD === 'PERDIDO' && (
                <button
                  onClick={handleReativarLead}
                  className="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-all duration-200 bg-blue-500 border-blue-500 text-white hover:bg-blue-600 hover:border-blue-600"
                >
                  <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                 <span className="text-xs md:text-sm font-medium">ATIVAR</span>
                </button>
              )}

              <button
                onClick={() => setMostrarDialogoPerda(true)}
                disabled={lead.STATUS_LEAD === 'PERDIDO' || lead.STATUS_LEAD === 'GANHO'}
                className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-all duration-200 ${
                  lead.STATUS_LEAD === 'PERDIDO'
                    ? 'bg-red-500 border-red-500 text-white cursor-not-allowed'
                    : lead.STATUS_LEAD === 'GANHO'
                    ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-red-200 text-red-700 hover:bg-red-500 hover:text-white hover:border-red-500'
                }`}
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Perdido</span>
              </button>

              <button
                onClick={() => handleStatusChange('EM_ANDAMENTO')}
                disabled={lead.STATUS_LEAD === 'EM_ANDAMENTO' || !lead.STATUS_LEAD || lead.STATUS_LEAD === 'PERDIDO' || lead.STATUS_LEAD === 'GANHO'}
                className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-all duration-200 ${
                  lead.STATUS_LEAD === 'EM_ANDAMENTO' || !lead.STATUS_LEAD
                    ? 'bg-orange-500 border-orange-500 text-white cursor-not-allowed'
                    : (lead.STATUS_LEAD === 'PERDIDO' || lead.STATUS_LEAD === 'GANHO')
                    ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500'
                }`}
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs md:text-sm font-medium">Em andamento</span>
              </button>

              <button
                onClick={() => setMostrarDialogoStatus(true)}
                disabled={lead.STATUS_LEAD === 'PERDIDO' || lead.STATUS_LEAD === 'GANHO'}
                className={`flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1 md:py-1.5 rounded-md transition-all duration-200 ${
                  lead.STATUS_LEAD === 'GANHO'
                    ? 'bg-green-500 border-green-500 text-white cursor-not-allowed shadow-sm'
                    : lead.STATUS_LEAD === 'PERDIDO'
                    ? 'bg-gray-300 border-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-white border border-green-200 text-green-700 hover:bg-green-500 hover:text-white hover:border-green-500'
                }`}
              >
                <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs md:text-sm font-medium">
                  {lead.STATUS_LEAD === 'GANHO' ? 'Lead Ganho' : 'Ganho'}
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 space-y-4 md:space-y-6 scrollbar-hide">
            <style jsx>{`
              .scrollbar-hide {
                -ms-overflow-style: none;
                scrollbar-width: none;
              }
              .scrollbar-hide::-webkit-scrollbar {
                display: none;
              }
            `}</style>

            {/* Mobile Tabs - apenas para leads existentes */}
            {lead && (
              <div className="md:hidden">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="atividades" className="text-xs">Atividades</TabsTrigger>
                    <TabsTrigger value="valor" className="text-xs">Valor</TabsTrigger>
                    <TabsTrigger value="dados" className="text-xs">Dados</TabsTrigger>
                  </TabsList>

                  <TabsContent value="atividades" className="space-y-4">
                    {/* Registrar Atividade */}
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <h3 className="text-xs font-semibold text-foreground mb-2">Registrar Atividade</h3>
                      <div className="flex gap-1 mb-3 flex-wrap overflow-x-auto">
                        <button
                          onClick={() => setActiveAtividadeTab('nota')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'nota' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'nota' ? { backgroundColor: '#EAB308' } : {}}
                        >
                          <FileText className="w-3 h-3" />
                          Nota
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('ligacao')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'ligacao' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'ligacao' ? { backgroundColor: '#9333EA' } : {}}
                        >
                          <Phone className="w-3 h-3" />
                          Ligação
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('email')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'email' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'email' ? { backgroundColor: '#3B82F6' } : {}}
                        >
                          <Mail className="w-3 h-3" />
                          E-mail
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('whatsapp')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'whatsapp' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'whatsapp' ? { backgroundColor: '#22C55E' } : {}}
                        >
                          <MessageSquare className="w-3 h-3" />
                          WhatsApp
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('proposta')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'proposta' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'proposta' ? { backgroundColor: '#6B7280' } : {}}
                        >
                          <FileText className="w-3 h-3" />
                          Proposta
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('reuniao')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'reuniao' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'reuniao' ? { backgroundColor: '#F97316' } : {}}
                        >
                          <Users className="w-3 h-3" />
                          Reunião
                        </button>
                        <button
                          onClick={() => setActiveAtividadeTab('visita')}
                          className={`px-2 py-1 text-[10px] font-medium flex items-center gap-1 rounded-md transition-colors whitespace-nowrap ${
                            activeAtividadeTab === 'visita' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                          }`}
                          style={activeAtividadeTab === 'visita' ? { backgroundColor: '#000000' } : {}}
                        >
                          <CalendarIcon className="w-3 h-3" />
                          Visita
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="dataInicial" className="text-xs mb-1 block">Data Inicial</Label>
                            <Input
                              id="dataInicial"
                              type="datetime-local"
                              value={atividadeForm.dataInicial}
                              onChange={(e) => setAtividadeForm({ ...atividadeForm, dataInicial: e.target.value })}
                              disabled={isSavingAtividade || isLeadPerdido}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor="dataFinal" className="text-xs mb-1 block">Data Final</Label>
                            <Input
                              id="dataFinal"
                              type="datetime-local"
                              value={atividadeForm.dataFinal}
                              onChange={(e) => setAtividadeForm({ ...atividadeForm, dataFinal: e.target.value })}
                              disabled={isSavingAtividade || isLeadPerdido}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                        <Textarea
                          placeholder="O que foi feito e qual o próximo passo?"
                          value={atividadeForm.descricao}
                          onChange={(e) => setAtividadeForm({ ...atividadeForm, descricao: e.target.value })}
                          rows={2}
                          className="resize-none text-xs"
                          disabled={isSavingAtividade || isLeadPerdido}
                        />
                        <div className="flex justify-end">
                          <Button onClick={handleCriarAtividade} size="sm" disabled={isSavingAtividade || isLeadPerdido}>
                            {isSavingAtividade ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Salvando...
                              </>
                            ) : (
                              'Salvar atividade'
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Histórico de Atividades */}
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <h3 className="text-xs font-semibold text-foreground mb-2">Histórico de Atividades</h3>
                      {isLoadingAtividades ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : atividades.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 mx-auto mb-3 opacity-50">
                            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="100" cy="100" r="80" fill="#E5E7EB"/>
                              <path d="M60 120L80 140L140 80" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                            </svg>
                          </div>
                          <p className="text-sm font-medium text-foreground">Nenhuma atividade registrada</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Que tal agendar uma ligação para evoluir este negócio?
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {atividades.map((atividade, index) => (
                            <AtividadeItem
                              key={atividade.CODATIVIDADE || index}
                              atividade={atividade}
                              codLead={lead!.CODLEAD}
                              onReload={() => loadAtividades(lead!.CODLEAD)}
                              isLeadPerdido={isLeadPerdido}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="valor" className="space-y-4">
                    {/* Valor do Negócio */}
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <h3 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-2">
                        <DollarSign className="w-3 h-3 text-primary" />
                        Valor do Negócio
                      </h3>
                      <div className="text-xl font-bold text-foreground mb-2">
                        {formatCurrency(formData.VALOR || 0)}
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">Produtos e serviços</p>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-xs text-muted-foreground">Produtos vinculados:</Label>
                          <Button
                            size="sm"
                            onClick={() => setShowAdicionarProdutoModal(true)}
                            className="h-8 text-xs px-2"
                            disabled={isLeadPerdido} // Desabilitar se lead perdido
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Adicionar
                          </Button>
                        </div>
                        {isLoadingProdutos ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : produtosLead.length > 0 ? (
                          produtosLead.map((produto, index) => (
                            <div key={produto.CODITEM || index} className="text-xs p-2 bg-gray-50 rounded border flex justify-between items-center">
                              <div className="flex-1">
                                <div className="font-medium">{produto.DESCRPROD}</div>
                                <div className="text-muted-foreground mt-1">
                                  Qtd: {produto.QUANTIDADE} × {formatCurrency(produto.VLRUNIT)} = {formatCurrency(produto.VLRTOTAL)}
                                </div>
                              </div>
                              <div className="flex gap-1 ml-2">
                                <button
                                  onClick={() => handleEditarProduto(produto)}
                                  className={`text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLeadPerdido ? 'cursor-not-allowed opacity-50' : ''}`}
                                  title="Editar produto"
                                  disabled={isLeadPerdido}
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleRemoverProduto(produto.CODITEM!)}
                                  className={`text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLeadPerdido ? 'cursor-not-allowed opacity-50' : ''}`}
                                  title="Remover produto"
                                  disabled={isLeadPerdido}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">Nenhum produto vinculado</p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="dados" className="space-y-4">
                    {/* Dados do Negócio */}
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                        <FileText className="w-3 h-3 text-primary" />
                        Dados do Negócio
                      </h3>

                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Responsável</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{currentUser?.name || 'Você'}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Data de início</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Hoje</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="DATA_VENCIMENTO_MOBILE" className="text-xs">Data de conclusão</Label>
                          <Input
                            id="DATA_VENCIMENTO_MOBILE"
                            type="date"
                            value={formData.DATA_VENCIMENTO}
                            onChange={(e) => setFormData({ ...formData, DATA_VENCIMENTO: e.target.value })}
                            disabled={isLeadPerdido}
                            className="h-8 text-sm"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="DESCRICAO_MOBILE" className="text-xs">Descrição</Label>
                          <Textarea
                            id="DESCRICAO_MOBILE"
                            value={formData.DESCRICAO}
                            onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                            rows={3}
                            className="text-sm resize-none"
                            placeholder="Adicionar descrição"
                            disabled={isLeadPerdido}
                          />
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Cadastrado por</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{currentUser?.name || 'Usuário'}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Data de cadastro</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs text-muted-foreground">Última atualização</Label>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dados do Contato */}
                    <div className="bg-white rounded-lg shadow-sm border p-3">
                      <h3 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                        <User className="w-3 h-3 text-primary" />
                        Dados do Contato
                      </h3>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label htmlFor="parceiro-mobile" className="text-xs">Parceiro *</Label>
                          <Select
                            value={formData.CODPARC ? String(formData.CODPARC) : undefined}
                            onValueChange={(value) => {
                              const parceiro = parceiros.find(p => p.CODPARC === value)
                              if (parceiro) {
                                setPartnerSearch(parceiro.NOMEPARC)
                              }
                              setFormData({ ...formData, CODPARC: String(value) })
                            }}
                            disabled={isLeadPerdido}
                          >
                            <SelectTrigger className="h-8 text-sm w-full">
                              <SelectValue placeholder="Selecione um parceiro" />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2">
                                <Input
                                  placeholder="Buscar parceiro..."
                                  value={partnerSearch}
                                  onChange={(e) => handlePartnerSearch(e.target.value)}
                                  disabled={isLeadPerdido}
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
                                  <SelectItem key={partner.CODPARC} value={partner.CODPARC} className="max-w-full">
                                    <div className="truncate max-w-[250px]">
                                      {partner.NOMEPARC} - {partner.CGC_CPF}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          {formData.CODPARC && parceiroSelecionado && (
                            <div className="text-xs text-muted-foreground mt-1 break-words">
                              Selecionado: {parceiroSelecionado.NOMEPARC}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Botão Salvar - Mobile */}
                    <div className="pt-4">
                      <Button
                        onClick={handleSubmit}
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={isSaving || isLeadPerdido}
                      >
                        {isSaving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                            Salvando...
                          </>
                        ) : (
                          'Salvar Alterações'
                        )}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Desktop Content - Mantém o layout original */}
            <div className="hidden md:block space-y-6">
            {/* Container: Ações Rápidas - Desktop */}
            {lead && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Ações Rápidas</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-sm h-9" disabled={isLeadPerdido}>
                    <Mail className="w-4 h-4 mr-2" />
                    <span>Enviar </span>E-mail
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-sm h-9" disabled={isLeadPerdido}>
                    <Phone className="w-4 h-4 mr-2" />
                    <span>Fazer </span>Ligação
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-sm h-9" disabled={isLeadPerdido}>
                    <FileText className="w-4 h-4 mr-2" />
                    <span>Gerar </span>Proposta
                  </Button>
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-sm h-9" disabled={isLeadPerdido}>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    WhatsApp
                  </Button>
                </div>
              </div>
            )}

            {/* Container: Registrar Atividade - Desktop */}
            {lead && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Registrar Atividade</h3>
                <div className="flex gap-2 mb-4 flex-wrap overflow-x-auto">
                  <button
                    onClick={() => setActiveAtividadeTab('nota')}
                    className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'nota' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'nota' ? { backgroundColor: '#EAB308' } : {}}
                  >
                    <FileText className="w-3 h-3" />
                    Nota
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('ligacao')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'ligacao' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'ligacao' ? { backgroundColor: '#9333EA' } : {}}
                  >
                    <Phone className="w-3 h-3" />
                    Ligação
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('email')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'email' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'email' ? { backgroundColor: '#3B82F6' } : {}}
                  >
                    <Mail className="w-3 h-3" />
                    E-mail
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('whatsapp')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'whatsapp' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'whatsapp' ? { backgroundColor: '#22C55E' } : {}}
                  >
                    <MessageSquare className="w-3 h-3" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('proposta')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'proposta' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'proposta' ? { backgroundColor: '#6B7280' } : {}}
                  >
                    <FileText className="w-3 h-3" />
                    Proposta
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('reuniao')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'reuniao' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'reuniao' ? { backgroundColor: '#F97316' } : {}}
                  >
                    <Users className="w-3 h-3" />
                    Reunião
                  </button>
                  <button
                    onClick={() => setActiveAtividadeTab('visita')}
                    className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium flex items-center gap-1 md:gap-2 rounded-md transition-colors whitespace-nowrap ${
                      activeAtividadeTab === 'visita' ? 'text-white' : 'bg-gray-100 text-muted-foreground hover:bg-gray-200'
                    }`}
                    style={activeAtividadeTab === 'visita' ? { backgroundColor: '#000000' } : {}}
                  >
                    <CalendarIcon className="w-3 h-3" />
                    Visita
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="dataInicial" className="text-xs mb-1 block">Data Início</Label>
                      <Input
                        id="dataInicial"
                        type="datetime-local"
                        value={atividadeForm.dataInicial}
                        onChange={(e) => setAtividadeForm({ ...atividadeForm, dataInicial: e.target.value })}
                        disabled={isSavingAtividade || isLeadPerdido}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dataFinal" className="text-xs mb-1 block">Data Fim</Label>
                      <Input
                        id="dataFinal"
                        type="datetime-local"
                        value={atividadeForm.dataFimAtividade}
                        onChange={(e) => setAtividadeForm({ ...atividadeForm, dataFinal: e.target.value })}
                        disabled={isSavingAtividade || isLeadPerdido}
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="O que foi feito e qual o próximo passo?"
                    value={atividadeForm.descricao}
                    onChange={(e) => setAtividadeForm({ ...atividadeForm, descricao: e.target.value })}
                    rows={3}
                    className="resize-none"
                    disabled={isSavingAtividade || isLeadPerdido}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleCriarAtividade} size="sm" disabled={isSavingAtividade || isLeadPerdido}>
                      {isSavingAtividade ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar atividade'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Container: Histórico de Atividades - Desktop */}
            {lead && (
              <div className="bg-white rounded-lg shadow-sm border p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Histórico de Atividades</h3>
                {isLoadingAtividades ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : atividades.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-3 opacity-50">
                      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="100" cy="100" r="80" fill="#E5E7EB"/>
                        <path d="M60 120L80 140L140 80" stroke="white" strokeWidth="8" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhuma atividade registrada</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Que tal agendar uma ligação para evoluir este negócio?
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {atividades.map((atividade, index) => (
                      <AtividadeItem
                        key={atividade.CODATIVIDADE || index}
                        atividade={atividade}
                        codLead={lead!.CODLEAD}
                        onReload={() => loadAtividades(lead!.CODLEAD)}
                        isLeadPerdido={isLeadPerdido}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            </div>
          </div>

          {/* Sidebar direita - Desktop apenas */}
          <div className="hidden md:block w-80 border-l bg-gray-50 overflow-y-auto p-6 space-y-4 scrollbar-hide">
            {/* Container: Valor do Negócio */}
            <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3 flex items-center gap-2">
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-primary" />
                Valor do Negócio
              </h3>
              <div className="text-xl md:text-2xl font-bold text-foreground mb-2">
                {formatCurrency(formData.VALOR || 0)}
              </div>
              <p className="text-[10px] md:text-xs text-muted-foreground mb-2 md:mb-3">Produtos e serviços</p>
              {!lead && (
                <div className="space-y-2">
                  <Label htmlFor="VALOR" className="text-xs">Valor (R$)</Label>
                  <Input
                    id="VALOR"
                    type="number"
                    step="0.01"
                    value={formData.VALOR}
                    onChange={(e) => setFormData({ ...formData, VALOR: Number(e.target.value) })}
                    disabled={isLeadPerdido}
                  />
                </div>
              )}
              {lead && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">Produtos vinculados:</Label>
                    <Button
                      size="sm"
                      onClick={() => setShowAdicionarProdutoModal(true)}
                      className="h-7 text-xs px-2"
                      disabled={isLeadPerdido}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Adicionar
                    </Button>
                  </div>
                  {isLoadingProdutos ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : produtosLead.length > 0 ? (
                    produtosLead.map((produto, index) => (
                      <div key={produto.CODITEM || index} className="text-xs p-2 bg-gray-50 rounded border flex justify-between items-center">
                        <div className="flex-1">
                          <div className="font-medium">{produto.DESCRPROD}</div>
                          <div className="text-muted-foreground mt-1">
                            Qtd: {produto.QUANTIDADE} × {formatCurrency(produto.VLRUNIT)} = {formatCurrency(produto.VLRTOTAL)}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2">
                          <button
                            onClick={() => handleEditarProduto(produto)}
                            className={`text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLeadPerdido ? 'cursor-not-allowed opacity-50' : ''}`}
                            title="Editar produto"
                            disabled={isLeadPerdido}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleRemoverProduto(produto.CODITEM!)}
                            className={`text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isLeadPerdido ? 'cursor-not-allowed opacity-50' : ''}`}
                            title="Remover produto"
                            disabled={isLeadPerdido}
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">Nenhum produto vinculado</p>
                  )}
                </div>
              )}
            </div>

            {/* Container: Dados do Negócio */}
            <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3 flex items-center gap-2">
                <FileText className="w-3 h-3 md:w-4 h-4 text-primary" />
                Dados do Negócio
              </h3>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Responsável</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">{currentUser?.name || 'Você'}</span>
                  </div>
                </div>

                {!lead && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="NOME" className="text-xs">Nome do Negócio *</Label>
                      <Input
                        id="NOME"
                        value={formData.NOME}
                        onChange={(e) => setFormData({ ...formData, NOME: e.target.value })}
                        required
                        disabled={isLeadPerdido}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="CODESTAGIO" className="text-xs">Estágio *</Label>
                      <Select
                        value={formData.CODESTAGIO}
                        onValueChange={(value) => setFormData({ ...formData, CODESTAGIO: value })}
                        disabled={isLeadPerdido}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um estágio" />
                        </SelectTrigger>
                        <SelectContent>
                          {estagios.map((estagio) => (
                            <SelectItem key={estagio.CODESTAGIO} value={estagio.CODESTAGIO}>
                              {estagio.NOME}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div>
                  <Label className="text-xs text-muted-foreground">Data de início</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm">Hoje</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="DATA_VENCIMENTO" className="text-xs">Data de conclusão</Label>
                  <Input
                    id="DATA_VENCIMENTO"
                    type="date"
                    value={formData.DATA_VENCIMENTO}
                    onChange={(e) => setFormData({ ...formData, DATA_VENCIMENTO: e.target.value })}
                    disabled={isLeadPerdido}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="DESCRICAO" className="text-xs">Descrição</Label>
                  <Textarea
                    id="DESCRICAO"
                    value={formData.DESCRICAO}
                    onChange={(e) => setFormData({ ...formData, DESCRICAO: e.target.value })}
                    rows={3}
                    placeholder="Adicionar descrição"
                    disabled={isLeadPerdido}
                  />
                </div>

                {lead && (
                  <>
                    <div>
                      <Label className="text-xs text-muted-foreground">Cadastrado por</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{currentUser?.name || 'Usuário'}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Data de cadastro</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">Última atualização</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">Hoje às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Container: Dados do Contato */}
            <div className="bg-white rounded-lg shadow-sm border p-3 md:p-4">
              <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 md:mb-3 flex items-center gap-2">
                <User className="w-3 h-3 md:w-4 h-4 text-primary" />
                Dados do Contato
              </h3>

              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="parceiro" className="text-xs">Parceiro *</Label>
                  <Select
                    value={formData.CODPARC ? String(formData.CODPARC) : undefined}
                    onValueChange={(value) => {
                      const parceiro = parceiros.find(p => p.CODPARC === value)
                      if (parceiro) {
                        setPartnerSearch(parceiro.NOMEPARC)
                      }
                      setFormData({ ...formData, CODPARC: String(value) })
                    }}
                    disabled={isLeadPerdido}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione um parceiro" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2">
                        <Input
                          placeholder="Buscar parceiro..."
                          value={partnerSearch}
                          onChange={(e) => handlePartnerSearch(e.target.value)}
                          disabled={isLeadPerdido}
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
                          <SelectItem key={partner.CODPARC} value={partner.CODPARC} className="max-w-full">
                            <div className="truncate max-w-[250px]">
                              {partner.NOMEPARC} - {partner.CGC_CPF}
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {formData.CODPARC && parceiroSelecionado && (
                    <div className="text-xs text-muted-foreground mt-1 break-words">
                      Selecionado: {parceiroSelecionado.NOMEPARC}
                    </div>
                  )}
                </div>

                {!lead && (
                  <div className="space-y-2">
                    <Label htmlFor="TIPO_TAG" className="text-xs">Tipo de Tag *</Label>
                    <Select
                      value={formData.TIPO_TAG}
                      onValueChange={(value) => setFormData({ ...formData, TIPO_TAG: value })}
                      disabled={isLeadPerdido}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_TAG.map((tag) => (
                          <SelectItem key={tag} value={tag}>
                            {tag}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {/* Botão Salvar - Desktop */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isSaving}
                >
                  {lead && (lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO') ? 'Fechar' : 'Cancelar'}
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isSaving || isLeadPerdido}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Alterações'
                  )}
                </Button>
              </div>
            </div>

            {/* Botões de ação - Desktop */}
            {!lead && (
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90"
                  disabled={isSaving}
                >
                  {isSaving ? "Criando..." : "Criar Lead"}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Botões de ação - Mobile (fixos no rodapé) */}
        {!lead && (
          <div className="md:hidden border-t bg-white p-3 flex gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1 bg-primary hover:bg-primary/90"
              disabled={isSaving}
            >
              {isSaving ? "Criando..." : "Criar Lead"}
            </Button>
          </div>
        )}
      </div>

      {/* Modal de Edição de Produto */}
      <Dialog open={showModalEdicaoProduto} onOpenChange={setShowModalEdicaoProduto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
          </DialogHeader>
          {produtoSelecionadoEdicao && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{produtoSelecionadoEdicao.DESCRPROD}</Label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    value={produtoEditForm.quantidade}
                    onChange={(e) => setProdutoEditForm({ ...produtoEditForm, quantidade: Number(e.target.value) })}
                    disabled={isLeadPerdido}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Valor Unit.</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={produtoEditForm.vlrunit}
                    onChange={(e) => setProdutoEditForm({ ...produtoEditForm, vlrunit: Number(e.target.value) })}
                    disabled={isLeadPerdido}
                  />
                </div>
              </div>
              <div className="p-3 bg-gray-50 rounded border">
                <div className="text-sm font-medium text-muted-foreground">Total</div>
                <div className="text-xl font-bold text-green-700">
                  {formatCurrency(produtoEditForm.quantidade * produtoEditForm.vlrunit)}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModalEdicaoProduto(false)
                    setProdutoSelecionadoEdicao(null)
                    setProdutoEditForm({ quantidade: 0, vlrunit: 0 })
                  }}
                  disabled={isSaving || isLeadPerdido}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSalvarEdicaoProduto} disabled={isSaving || isLeadPerdido}>
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Adicionar Produto - Usando ProdutoSelectorModal */}
      <ProdutoSelectorModal
        isOpen={showAdicionarProdutoModal}
        onClose={() => setShowAdicionarProdutoModal(false)}
        onConfirm={async (produto: any, preco: number, quantidade: number) => {
          if (!lead) return

          setIsSaving(true)
          setLoadingMessage("Adicionando produto...")

          try {
            const vlrtotal = preco * quantidade
            const payload = {
              CODLEAD: String(lead.CODLEAD),
              CODPROD: produto.CODPROD,
              DESCRPROD: produto.DESCRPROD,
              QUANTIDADE: quantidade,
              VLRUNIT: preco,
              VLRTOTAL: vlrtotal
            }

            const response = await fetch('/api/leads/produtos/adicionar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            })

            if (!response.ok) {
              const errorData = await response.json()
              throw new Error(errorData.error || 'Erro ao adicionar produto')
            }

            const resultado = await response.json()

            // Atualizar valor local IMEDIATAMENTE
            if (resultado.novoValorTotal !== undefined) {
              setFormData(prev => ({
                ...prev,
                VALOR: resultado.novoValorTotal
              }))
            }

            toast({
              title: "Sucesso",
              description: "Produto adicionado com sucesso",
            })

            setShowAdicionarProdutoModal(false)

            // Recarregar produtos
            await loadProdutosLead(lead.CODLEAD)

            // Notificar parent para atualizar kanban IMEDIATAMENTE
            if (onLeadUpdated) {
              onLeadUpdated()
            }

            // Recarregar lista completa
            await onSave()
          } catch (error: any) {
            toast({
              title: "Erro",
              description: error.message,
              variant: "destructive",
            })
          } finally {
            setIsSaving(false)
            setLoadingMessage("")
          }
        }}
        titulo="Adicionar Produto ao Negócio"
      />

      {/* Modal de Editar Título */}
      <Dialog open={showEditarTituloModal} onOpenChange={setShowEditarTituloModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Título do Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Título Atual</Label>
              <div className="p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium">{formData.NOME}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Novo Título *</Label>
              <Input
                value={novoTitulo}
                onChange={(e) => setNovoTitulo(e.target.value)}
                placeholder="Digite o novo título"
                disabled={isLeadPerdido}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEditarTituloModal(false)
                  setNovoTitulo("")
                }}
                disabled={isSaving || isLeadPerdido}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!lead || !novoTitulo.trim()) {
                    toast({
                      title: "Atenção",
                      description: "Informe o novo título",
                      variant: "destructive",
                    })
                    return
                  }

                  setIsSaving(true)
                  setLoadingMessage("Atualizando título...")

                  try {
                    const response = await fetch('/api/leads/salvar', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        CODLEAD: lead.CODLEAD,
                        NOME: novoTitulo,
                        DESCRICAO: formData.DESCRICAO,
                        VALOR: formData.VALOR,
                        CODESTAGIO: formData.CODESTAGIO,
                        CODFUNIL: formData.CODFUNIL,
                        DATA_VENCIMENTO: formData.DATA_VENCIMENTO,
                        TIPO_TAG: formData.TIPO_TAG,
                        COR_TAG: formData.COR_TAG,
                        CODPARC: formData.CODPARC
                      })
                    })

                    if (!response.ok) throw new Error('Erro ao atualizar título')

                    toast({
                      title: "Sucesso",
                      description: "Título atualizado com sucesso!",
                    })

                    setFormData({ ...formData, NOME: novoTitulo })
                    setShowEditarTituloModal(false)
                    setNovoTitulo("")
                    onSave()

                  } catch (error: any) {
                    toast({
                      title: "Erro",
                      description: error.message,
                      variant: "destructive",
                    })
                  } finally {
                    setIsSaving(false)
                    setLoadingMessage("")
                  }
                }}
                disabled={isSaving || isLeadPerdido}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Título'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Lead Perdido */}
      <Dialog open={mostrarDialogoPerda} onOpenChange={setMostrarDialogoPerda}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar Lead como Perdido</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Motivo da Perda *</Label>
              <Textarea
                value={motivoPerda}
                onChange={(e) => setMotivoPerda(e.target.value)}
                placeholder="Descreva o motivo da perda..."
                rows={4}
                disabled={isConfirmingPerdido}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setMostrarDialogoPerda(false)
                  setMotivoPerda("")
                }}
                disabled={isConfirmingPerdido}
              >
                Cancelar
              </Button>
              <Button
                onClick={confirmarPerdido}
                className="bg-red-600 hover:bg-red-700"
                disabled={isConfirmingPerdido}
              >
                {isConfirmingPerdido ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  'Confirmar Perda'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pedido de Venda */}
      <Dialog open={mostrarPedidoVenda} onOpenChange={(open) => {
        if (!open) {
          setMostrarPedidoVenda(false)
          setDadosPedidoVenda(null)
        }
      }}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0">
            <DialogTitle className="text-base md:text-lg">Criar Pedido de Venda - Lead Ganho</DialogTitle>
          </DialogHeader>
          {lead && dadosPedidoVenda && (
            <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-4">
              <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs md:text-sm text-green-800">
                  <strong>Lead:</strong> {lead.NOME} - {formatCurrency(formData.VALOR || 0)}
                </p>
                {dadosPedidoVenda.RAZAO_SOCIAL && (
                  <p className="text-xs md:text-sm text-green-700 mt-1">
                    <strong>Cliente:</strong> {dadosPedidoVenda.RAZAO_SOCIAL} - {dadosPedidoVenda.CPF_CNPJ}
                  </p>
                )}
                {dadosPedidoVenda.itens.length > 0 && (
                  <p className="text-xs md:text-sm text-green-700 mt-1">
                    <strong>Produtos:</strong> {dadosPedidoVenda.itens.length} item(ns)
                  </p>
                )}
              </div>
              <PedidoVendaFromLead
                dadosIniciais={dadosPedidoVenda}
                onSuccess={handlePedidoSucesso}
                onCancel={() => {
                  setMostrarPedidoVenda(false)
                  setDadosPedidoVenda(null)
                }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Alterar Estágio */}
      <Dialog open={showAlterarEstagioModal} onOpenChange={setShowAlterarEstagioModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Alterar Estágio do Negócio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Estágio Atual</Label>
              <div className="p-3 bg-gray-50 rounded border">
                <p className="text-sm font-medium">{estagioAtual?.NOME || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Novo Estágio *</Label>
              <Select
                value={formData.CODESTAGIO}
                onValueChange={(value) => setFormData({ ...formData, CODESTAGIO: value })}
                disabled={isLeadPerdido}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um estágio" />
                </SelectTrigger>
                <SelectContent>
                  {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => (
                    <SelectItem key={estagio.CODESTAGIO} value={estagio.CODESTAGIO}>
                      {estagio.NOME}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAlterarEstagioModal(false)}
                disabled={isSaving || isLeadPerdido}
              >
                Cancelar
              </Button>
              <Button
                onClick={async () => {
                  if (!lead) return

                  setIsSaving(true)
                  setLoadingMessage("Atualizando estágio...")

                  try {
                    const response = await fetch('/api/leads/atualizar-estagio', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        codLeed: lead.CODLEAD,
                        novoEstagio: formData.CODESTAGIO
                      })
                    })

                    if (!response.ok) {
                      throw new Error('Erro ao atualizar estágio')
                    }

                    toast({
                      title: "Sucesso",
                      description: "Estágio atualizado com sucesso!",
                    })

                    setShowAlterarEstagioModal(false)
                    onSave()

                  } catch (error: any) {
                    toast({
                      title: "Erro",
                      description: error.message,
                      variant: "destructive",
                    })
                  } finally {
                    setIsSaving(false)
                    setLoadingMessage("")
                  }
                }}
                disabled={isSaving || isLeadPerdido}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Alterando...
                  </>
                ) : (
                  'Alterar Estágio'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={mostrarConfirmacaoExclusao} onOpenChange={setMostrarConfirmacaoExclusao}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setMostrarConfirmacaoExclusao(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmarExclusao}
                variant="destructive"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Lead'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Status (Ganho/Perdido) - Botões Separados para Ganho/Perdido */}
      <Dialog open={mostrarDialogoStatus} onOpenChange={setMostrarDialogoStatus}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Marcar Lead como Ganho</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Ao marcar como ganho, você será direcionado para a criação de um Pedido de Venda. Certifique-se de ter adicionado os produtos.
            </p>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setMostrarDialogoStatus(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => handleStatusChange('GANHO')} // Chama a função existente
                className="bg-green-600 hover:bg-green-700"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Processando...
                  </>
                ) : (
                  'Prosseguir para Pedido'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
 }