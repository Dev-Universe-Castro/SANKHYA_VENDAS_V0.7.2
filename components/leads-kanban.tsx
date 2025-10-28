"use client"

import { useState, useEffect } from "react"
import { Search, Plus, MoreHorizontal, Calendar, DollarSign, ChevronRight, Settings, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LeadModal } from "@/components/lead-modal"
import { LeadCreateModal } from "./lead-create-modal"
import { FunilModal } from "@/components/funil-modal"
import { EstagiosModal } from "@/components/estagios-modal"
import { useToast } from "@/hooks/use-toast"
import { consultarLeads, atualizarEstagioLead, type Lead } from "@/lib/leads-service"
import type { Funil, EstagioFunil } from "@/lib/funis-service"
import type { User } from "@/lib/auth-service"
import { authService } from "@/lib/auth-service"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useIsMobile } from "@/hooks/use-mobile"

const TAG_COLORS: Record<string, string> = {
  'Ads Production': 'bg-blue-100 text-blue-700',
  'Landing Page': 'bg-red-100 text-red-700',
  'Dashboard': 'bg-green-100 text-green-700',
  'UX Design': 'bg-pink-100 text-pink-700',
  'Video Production': 'bg-amber-100 text-amber-700',
  'Typeface': 'bg-cyan-100 text-cyan-700',
  'Web Design': 'bg-purple-100 text-purple-700'
}

export default function LeadsKanban() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFunilModalOpen, setIsFunilModalOpen] = useState(false)
  const [isEstagiosModalOpen, setIsEstagiosModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [selectedFunilForEdit, setSelectedFunilForEdit] = useState<Funil | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  const [selectedFunil, setSelectedFunil] = useState<Funil | null>(null)
  const [funis, setFunis] = useState<Funil[]>([])
  const [estagios, setEstagios] = useState<EstagioFunil[]>([])
  const [selectedEstagioTab, setSelectedEstagioTab] = useState<string>("")
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'lista'>('kanban')
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'EM_ANDAMENTO' | 'GANHO' | 'PERDIDO'>('EM_ANDAMENTO')
  const { toast } = useToast()
  const isMobile = useIsMobile()

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
    loadFunis()
  }, [])

  useEffect(() => {
    if (selectedFunil) {
      setIsLoading(true)
      Promise.all([loadEstagios(), loadLeads()])
        .finally(() => {
          requestAnimationFrame(() => {
            setIsLoading(false)
          })
        })
    }
  }, [selectedFunil])

  const loadFunis = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/funis', {
        headers: { 'Cache-Control': 'no-cache' }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao carregar funis')
      }

      const data = await response.json()
      setFunis(data)

      if (data.length === 0) {
        console.warn("⚠️ Nenhum funil retornado da API")
      }
    } catch (error: any) {
      console.error("❌ Erro ao carregar funis:", error)
      toast({
        title: "Erro ao conectar com a API",
        description: "Verifique sua conexão e tente novamente. Se o problema persistir, recarregue a página.",
        variant: "destructive",
      })
      // Não limpar os funis em caso de erro, manter os dados anteriores se existirem
    } finally {
      setIsLoading(false)
    }
  }

  const loadEstagios = async () => {
    if (!selectedFunil) return
    try {
      const response = await fetch(`/api/funis/estagios?codFunil=${selectedFunil.CODFUNIL}`)
      if (!response.ok) throw new Error('Falha ao carregar estágios')
      const data = await response.json()
      setEstagios(data)
      // Definir o primeiro estágio como selecionado
      if (data.length > 0 && !selectedEstagioTab) {
        const sortedEstagios = [...data].sort((a, b) => a.ORDEM - b.ORDEM)
        setSelectedEstagioTab(sortedEstagios[0].CODESTAGIO)
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
      throw error
    }
  }

  const loadLeads = async () => {
    try {
      setIsLoading(true)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)

      // Forçar recarregamento sem cache
      const response = await fetch(`/api/leads?t=${Date.now()}`, {
        signal: controller.signal,
        headers: { 
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Falha ao carregar leads')
      }

      const data = await response.json()
      console.log('📊 Leads carregados:', data.length)
      setLeads(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.error("Erro ao carregar leads:", error)
      toast({
        title: "Erro",
        description: error.name === 'AbortError' 
          ? "Tempo de carregamento excedido"
          : error.message || "Falha ao carregar leads",
        variant: "destructive",
      })
      setLeads([])
      throw error
    } finally {
      setIsLoading(false)
    }
  };

  const handleCreate = () => {
    setSelectedLead(null)
    setIsCreateModalOpen(true)
  }

  const handleEdit = (lead: Lead) => {
    // Garantir que o lead está completamente carregado antes de abrir
    setSelectedLead(lead)
    // Usar duplo requestAnimationFrame para garantir que o estado foi atualizado
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsModalOpen(true)
      })
    })
  }

  const handleSave = async () => {
    try {
      console.log('💾 Salvando lead e recarregando dados...')

      // Aguardar o reload completo dos leads
      await loadLeads()

      // Aguardar renderização completa
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log('✅ Leads recarregados com sucesso')

      // Fechar modais
      setIsModalOpen(false)
      setIsCreateModalOpen(false)

      toast({
        title: "Sucesso",
        description: selectedLead ? "Lead atualizado!" : "Lead criado!",
      })
    } catch (error: any) {
      console.error('❌ Erro ao salvar:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar dados. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const handleFunilSaved = async () => {
    setIsFunilModalOpen(false)
    await loadFunis()
    toast({
      title: "Sucesso",
      description: selectedFunilForEdit ? "Funil atualizado!" : "Funil criado!",
    })
  }

  const handleEstagiosSaved = async () => {
    setIsEstagiosModalOpen(false)
    if (selectedFunil) {
      await loadEstagios()
    }
    toast({
      title: "Sucesso",
      description: "Estágios atualizados!",
    })
  }

  const handleDragStart = (lead: Lead) => {
    // Bloquear drag de leads ganhos ou perdidos
    if (lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO') {
      toast({
        title: "Ação não permitida",
        description: "Não é possível mover leads ganhos ou perdidos",
        variant: "destructive",
      })
      return
    }
    setDraggedLead(lead)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (codEstagio: string, nomeEstagio: string) => {
    if (!draggedLead || draggedLead.CODESTAGIO === codEstagio) {
      setDraggedLead(null)
      return
    }

    // Verificação adicional antes de mover
    if (draggedLead.STATUS_LEAD === 'GANHO' || draggedLead.STATUS_LEAD === 'PERDIDO') {
      setDraggedLead(null)
      toast({
        title: "Ação não permitida",
        description: "Não é possível mover leads ganhos ou perdidos",
        variant: "destructive",
      })
      return
    }

    const leadOriginal = draggedLead

    setLeads(prev => prev.map(l => 
      l.CODLEAD === draggedLead.CODLEAD 
        ? { ...l, CODESTAGIO: codEstagio }
        : l
    ))
    setDraggedLead(null)

    try {
      const response = await fetch('/api/leads/atualizar-estagio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codLeed: leadOriginal.CODLEAD, novoEstagio: codEstagio })
      })

      if (!response.ok) throw new Error('Falha ao atualizar estágio')

      toast({
        title: "Sucesso",
        description: `Lead movido para ${nomeEstagio}`,
      })
    } catch (error: any) {
      setLeads(prev => prev.map(l => 
        l.CODLEAD === leadOriginal.CODLEAD 
          ? leadOriginal
          : l
      ))

      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar estágio. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const getLeadsByEstagio = (codEstagio: string) => {
    return leads.filter(lead => {
      const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFunil = selectedFunil && lead.CODFUNIL === selectedFunil.CODFUNIL
      const matchesStatus = statusFilter === 'TODOS' || 
                           (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) ||
                           lead.STATUS_LEAD === statusFilter
      return lead.CODESTAGIO === codEstagio && matchesSearch && matchesFunil && matchesStatus
    })
  }

  const formatCurrency = (value: number) => {
    // Garantir que o valor seja um número válido
    const numericValue = Number(value) || 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(numericValue)
  }

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === '') return 'Sem data definida'
    try {
      // Se a data já está no formato DD/MM/YYYY
      if (dateString.includes('/')) {
        return dateString
      }
      // Se a data está no formato ISO ou YYYY-MM-DD
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Sem data definida'
      return date.toLocaleDateString('pt-BR')
    } catch (e) {
      return 'Sem data definida'
    }
  }

  const handleCreateFunil = () => {
    setSelectedFunilForEdit(null)
    requestAnimationFrame(() => {
      setIsFunilModalOpen(true)
    })
  }

  // Se nenhum funil foi selecionado, mostrar lista de funis
  if (!selectedFunil) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Negócios</h1>
            {currentUser?.role === "Administrador" && (
              <Button
                onClick={handleCreateFunil}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Novo Funil
              </Button>
            )}
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            Selecione um funil para gerenciar seus leads
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card rounded-lg p-6 shadow-sm border border-border animate-pulse">
                  <div className="space-y-3">
                    <div className="h-6 w-32 bg-muted rounded"></div>
                    <div className="h-4 w-full bg-muted rounded"></div>
                    <div className="h-4 w-3/4 bg-muted rounded"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : funis.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-muted-foreground">
                <p>Nenhum funil disponível</p>
                <p className="text-sm mt-2">Crie um novo funil para começar ou tente recarregar</p>
              </div>
              <Button
                onClick={loadFunis}
                variant="outline"
                className="mx-auto"
              >
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {funis.map((funil) => (
                <div key={funil.CODFUNIL} className="relative bg-card rounded-lg p-6 shadow-sm border border-border hover:shadow-lg transition-all group">
                  <button
                    onClick={() => setSelectedFunil(funil)}
                    className="text-left w-full"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: funil.COR }}
                        />
                        <h3 className="font-semibold text-lg text-foreground">{funil.NOME}</h3>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                    {funil.DESCRICAO && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{funil.DESCRICAO}</p>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modais sempre disponíveis */}
        <FunilModal
          isOpen={isFunilModalOpen}
          onClose={() => setIsFunilModalOpen(false)}
          funil={selectedFunilForEdit}
          onSave={handleFunilSaved}
        />
      </>
    )
  }

  // Se um funil foi selecionado, mostrar o Kanban
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Carregando dados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de voltar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFunil(null)}
            className="text-muted-foreground hover:text-foreground h-9 px-3"
          >
            ← Voltar
          </Button>
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full flex-shrink-0" 
              style={{ backgroundColor: selectedFunil.COR }}
            />
            <h1 className="text-xl md:text-2xl font-bold text-foreground truncate">{selectedFunil.NOME}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role === "Administrador" && (
            <Button
              onClick={() => {
                setSelectedFunilForEdit(selectedFunil)
                setIsEstagiosModalOpen(true)
              }}
              variant="outline"
              size={isMobile ? "sm" : "default"}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              {!isMobile && <span>Configurar Estágios</span>}
            </Button>
          )}
          <Button
            onClick={handleCreate}
            size={isMobile ? "sm" : "default"}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {isMobile ? "Novo" : "Adicionar Novo"}
          </Button>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por funil, nome do contato ou descrição"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-card h-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'lista' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('lista')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            Lista
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Funil
          </Button>
        </div>
      </div>

      {/* Filtros de Status */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <span className="text-sm text-muted-foreground whitespace-nowrap">Filtrar por:</span>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={statusFilter === 'EM_ANDAMENTO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('EM_ANDAMENTO')}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">Em Andamento</span>
            <span className="sm:hidden">Andamento</span>
          </Button>
          <Button
            variant={statusFilter === 'GANHO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('GANHO')}
            className="flex items-center gap-1.5 text-xs sm:text-sm bg-green-500/10 hover:bg-green-500 hover:text-white border-green-500/20"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Ganhos
          </Button>
          <Button
            variant={statusFilter === 'PERDIDO' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('PERDIDO')}
            className="flex items-center gap-1.5 text-xs sm:text-sm bg-red-500/10 hover:bg-red-500 hover:text-white border-red-500/20"
          >
            <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Perdidos
          </Button>
          <Button
            variant={statusFilter === 'TODOS' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('TODOS')}
            className="flex items-center gap-1.5 text-xs sm:text-sm"
          >
            Todos
          </Button>
        </div>
      </div>

      {/* Visualização Lista */}
      {viewMode === 'lista' ? (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">NOME</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">CONTATO</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">RESPONSÁVEL</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">STATUS</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">ETAPA</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground whitespace-nowrap">VALOR</th>
                </tr>
              </thead>
              <tbody>
                {leads.filter(lead => {
                  const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
                  const matchesFunil = lead.CODFUNIL === selectedFunil.CODFUNIL
                  const matchesStatus = statusFilter === 'TODOS' || 
                                       (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) ||
                                       lead.STATUS_LEAD === statusFilter
                  return matchesSearch && matchesFunil && matchesStatus
                }).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      Nenhum negócio encontrado
                    </td>
                  </tr>
                ) : (
                  leads.filter(lead => {
                    const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                         lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
                    const matchesFunil = lead.CODFUNIL === selectedFunil.CODFUNIL
                    const matchesStatus = statusFilter === 'TODOS' || 
                                         (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) ||
                                         lead.STATUS_LEAD === statusFilter
                    return matchesSearch && matchesFunil && matchesStatus
                  }).map((lead) => {
                    const estagio = estagios.find(e => e.CODESTAGIO === lead.CODESTAGIO)
                    const parceiro = lead.CODPARC || 'N/A'

                    return (
                      <tr 
                        key={lead.CODLEAD} 
                        onClick={() => handleEdit(lead)}
                        className="border-b hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                              {lead.NOME.charAt(0)}
                            </div>
                            <span className="font-medium text-foreground">{lead.NOME}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">{parceiro}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                              <User className="w-3 h-3" />
                            </div>
                            <span className="text-sm">{currentUser?.name || 'Você'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {lead.STATUS_LEAD === 'GANHO' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-green-100 text-green-700">
                              ✓ Ganho
                            </span>
                          )}
                          {lead.STATUS_LEAD === 'PERDIDO' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-red-100 text-red-700">
                              ✗ Perdido
                            </span>
                          )}
                          {lead.STATUS_LEAD === 'EM_ANDAMENTO' && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium bg-yellow-100 text-yellow-700">
                              ⏳ Em andamento
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <div 
                              className="w-2 h-2 rounded-full flex-shrink-0" 
                              style={{ backgroundColor: estagio?.COR || '#gray' }}
                            />
                            <span className="text-sm">{estagio?.NOME || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap">
                          {formatCurrency(lead.VALOR)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Exibindo {leads.filter(lead => {
                const matchesSearch = lead.NOME.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                     lead.DESCRICAO.toLowerCase().includes(searchTerm.toLowerCase())
                const matchesFunil = lead.CODFUNIL === selectedFunil.CODFUNIL
                const matchesStatus = statusFilter === 'TODOS' || 
                                     (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) ||
                                     lead.STATUS_LEAD === statusFilter
                return matchesSearch && matchesFunil && matchesStatus
              }).length} de {leads.filter(lead => {
                const matchesFunil = lead.CODFUNIL === selectedFunil.CODFUNIL
                const matchesStatus = statusFilter === 'TODOS' || 
                                     (statusFilter === 'EM_ANDAMENTO' && (!lead.STATUS_LEAD || lead.STATUS_LEAD === 'EM_ANDAMENTO')) ||
                                     lead.STATUS_LEAD === statusFilter
                return matchesFunil && matchesStatus
              }).length} negócio(s)
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Kanban Board - Desktop e Mobile */}
          {isMobile ? (
        // Visualização Mobile com Tabs
        <div className="space-y-4">
          {estagios.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Configure os estágios deste funil para começar
            </div>
          ) : (
            <Tabs value={selectedEstagioTab} onValueChange={setSelectedEstagioTab} className="w-full">
              <div className="w-full pb-2">
                <TabsList className="w-full grid" style={{ gridTemplateColumns: `repeat(${estagios.length}, minmax(0, 1fr))` }}>
                  {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => {
                    const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
                    return (
                      <TabsTrigger 
                        key={estagio.CODESTAGIO} 
                        value={estagio.CODESTAGIO}
                        className="flex items-center gap-1 px-2 py-2 h-auto min-w-0"
                      >
                        <div 
                          className="w-2 h-2 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: estagio.COR }}
                        />
                        <span className="text-xs truncate">{estagio.NOME}</span>
                        <span className="text-xs opacity-70 flex-shrink-0">({leadsList.length})</span>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </div>

              {estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => {
                const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
                const totalValue = leadsList.reduce((sum, lead) => sum + (Number(lead.VALOR) || 0), 0)

                return (
                  <TabsContent key={estagio.CODESTAGIO} value={estagio.CODESTAGIO} className="mt-4">
                    {/* Cabeçalho do Estágio */}
                    <div className="bg-muted/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: estagio.COR }}
                        />
                        <h4 className="text-base font-semibold text-foreground">{estagio.NOME}</h4>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {leadsList.length} {leadsList.length === 1 ? 'negócio' : 'negócios'}
                        </span>
                        <span className="font-semibold text-foreground">
                          {formatCurrency(totalValue)}
                        </span>
                      </div>
                    </div>

                    {/* Cards dos Leads */}
                    <div className="space-y-3">
                      {isLoading ? (
                        <>
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-border animate-pulse">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-muted"></div>
                                    <div>
                                      <div className="h-4 w-24 bg-muted rounded mb-1"></div>
                                      <div className="h-3 w-32 bg-muted rounded"></div>
                                    </div>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="h-3 w-full bg-muted rounded"></div>
                                  <div className="h-6 w-20 bg-muted rounded"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : leadsList.length === 0 ? (
                        <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                          <div className="text-center p-6">
                            <p className="text-sm text-muted-foreground">
                              Arraste para cá,<br/>para adicionar negócios<br/>nessa etapa
                            </p>
                          </div>
                        </div>
                      ) : (
                        leadsList.map((lead, index) => (
                          <div
                            key={`${estagio.CODESTAGIO}-${lead.CODLEAD || `temp-${index}`}`}
                            onClick={() => handleEdit(lead)}
                            className="bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer border border-border"
                          >
                            <div className="space-y-3">
                              {/* Lead Header */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                                    {lead.NOME.charAt(0)}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm text-foreground">{lead.NOME}</h4>
                                    <p className="text-xs text-muted-foreground">{lead.DESCRICAO}</p>
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                  <MoreHorizontal className="w-3 h-3" />
                                </Button>
                              </div>

                              {/* Lead Info */}
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs flex-wrap">
                                  <DollarSign className="w-3 h-3 text-muted-foreground" />
                                  <span className="font-semibold text-foreground">{formatCurrency(lead.VALOR)}</span>
                                  <span className="text-muted-foreground">•</span>
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-muted-foreground">{formatDate(lead.DATA_VENCIMENTO)}</span>
                                </div>

                                {/* Tag e Status */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${TAG_COLORS[lead.TIPO_TAG] || 'bg-gray-100 text-gray-700'}`}>
                                    {lead.TIPO_TAG}
                                  </span>
                                  {lead.STATUS_LEAD === 'GANHO' && (
                                    <span className="text-xs px-2 py-1 rounded-md font-medium bg-green-100 text-green-700">
                                      ✓ Ganho
                                    </span>
                                  )}
                                  {lead.STATUS_LEAD === 'PERDIDO' && (
                                    <span className="text-xs px-2 py-1 rounded-md font-medium bg-red-100 text-red-700">
                                      ✗ Perdido
                                    </span>
                                  )}
                                  {lead.STATUS_LEAD === 'EM_ANDAMENTO' && (
                                    <span className="text-xs px-2 py-1 rounded-md font-medium bg-blue-100 text-blue-700">
                                      ⏳ Em Andamento
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </div>
      ) : (
        // Visualização Desktop - Kanban
        <div className="grid gap-4" style={{ 
          gridTemplateColumns: `repeat(${estagios.length || 1}, minmax(300px, 1fr))` 
        }}>
          {estagios.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Configure os estágios deste funil para começar
            </div>
          ) : (
            estagios.sort((a, b) => a.ORDEM - b.ORDEM).map((estagio) => {
              const leadsList = getLeadsByEstagio(estagio.CODESTAGIO)
              const totalValue = leadsList.reduce((sum, lead) => sum + (Number(lead.VALOR) || 0), 0)

              return (
                <div
                  key={estagio.CODESTAGIO}
                  className={`bg-muted/30 rounded-lg p-4 min-h-[600px] transition-colors ${
                    draggedLead && draggedLead.CODESTAGIO !== estagio.CODESTAGIO 
                      ? 'ring-2 ring-primary/50 bg-primary/5' 
                      : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(estagio.CODESTAGIO, estagio.NOME)}
                >
                  {/* Column Header */}
                  <div className="flex flex-col gap-2 mb-4 pb-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: estagio.COR }}
                        />
                        <h3 className="font-semibold text-foreground">{estagio.NOME}</h3>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {leadsList.length} {leadsList.length === 1 ? 'negócio' : 'negócios'}
                      </span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(totalValue)}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-3">
                    {isLoading ? (
                      <>
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="bg-card rounded-lg p-4 shadow-sm border border-border animate-pulse">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-muted"></div>
                                  <div>
                                    <div className="h-4 w-24 bg-muted rounded mb-1"></div>
                                    <div className="h-3 w-32 bg-muted rounded"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="h-3 w-full bg-muted rounded"></div>
                                <div className="h-6 w-20 bg-muted rounded"></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : leadsList.length === 0 ? (
                      <div className="flex items-center justify-center h-64 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                        <div className="text-center p-6">
                          <p className="text-sm text-muted-foreground">
                            Arraste para cá,<br/>para adicionar negócios<br/>nessa etapa
                          </p>
                        </div>
                      </div>
                    ) : (
                      leadsList.map((lead, index) => (
                        <div
                          key={`${estagio.CODESTAGIO}-${lead.CODLEAD || `temp-${index}`}`}
                          draggable={lead.STATUS_LEAD !== 'GANHO' && lead.STATUS_LEAD !== 'PERDIDO'}
                          onDragStart={() => handleDragStart(lead)}
                          onDragEnd={() => setDraggedLead(null)}
                          onClick={(e) => {
                            if (!draggedLead) {
                              handleEdit(lead)
                            }
                          }}
                          className={`bg-card rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-border ${
                            lead.STATUS_LEAD === 'GANHO' || lead.STATUS_LEAD === 'PERDIDO' 
                              ? 'cursor-pointer' 
                              : 'cursor-move'
                          } ${
                            draggedLead?.CODLEAD === lead.CODLEAD ? 'opacity-50 scale-95' : ''
                          }`}
                        >
                          <div className="space-y-3">
                            {/* Lead Header */}
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                                  {lead.NOME.charAt(0)}
                                </div>
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground">{lead.NOME}</h4>
                                  <p className="text-xs text-muted-foreground">{lead.DESCRICAO}</p>
                                </div>
                              </div>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                                <MoreHorizontal className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Lead Info */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <DollarSign className="w-3 h-3 text-muted-foreground" />
                                <span className="font-semibold text-foreground">{formatCurrency(lead.VALOR)}</span>
                                <span className="text-muted-foreground">•</span>
                                <Calendar className="w-3 h-3 text-muted-foreground" />
                                <span className="text-muted-foreground">{formatDate(lead.DATA_VENCIMENTO)}</span>
                              </div>

                              {/* Tag e Status */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs px-2 py-1 rounded-md font-medium ${TAG_COLORS[lead.TIPO_TAG] || 'bg-gray-100 text-gray-700'}`}>
                                  {lead.TIPO_TAG}
                                </span>
                                {lead.STATUS_LEAD === 'GANHO' && (
                                  <span className="text-xs px-2 py-1 rounded-md font-medium bg-green-100 text-green-700">
                                    ✓ Ganho
                                  </span>
                                )}
                                {lead.STATUS_LEAD === 'PERDIDO' && (
                                  <span className="text-xs px-2 py-1 rounded-md font-medium bg-red-100 text-red-700">
                                    ✗ Perdido
                                  </span>
                                )}
                                {lead.STATUS_LEAD === 'EM_ANDAMENTO' && (
                                  <span className="text-xs px-2 py-1 rounded-md font-medium bg-blue-100 text-blue-700">
                                    ⏳ Em Andamento
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
        </>
      )}

      <LeadCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleSave}
        funilSelecionado={selectedFunil ? { CODFUNIL: selectedFunil.CODFUNIL, estagios } : undefined}
      />

      <LeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        lead={selectedLead}
        onSave={handleSave}
        funilSelecionado={selectedFunil ? { CODFUNIL: selectedFunil.CODFUNIL, estagios } : undefined}
        onLeadUpdated={async () => {
          console.log('🔄 Lead atualizado - recarregando kanban...')
          await loadLeads()
        }}
      />

      {/* Modais sempre disponíveis */}
      <FunilModal
        isOpen={isFunilModalOpen}
        onClose={() => setIsFunilModalOpen(false)}
        funil={selectedFunilForEdit}
        onSave={handleFunilSaved}
      />
      <EstagiosModal
        isOpen={isEstagiosModalOpen}
        onClose={() => setIsEstagiosModalOpen(false)}
        funil={selectedFunilForEdit}
        onSave={handleEstagiosSaved}
      />
    </div>
  )
}