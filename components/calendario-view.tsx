"use client"

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Plus, List, Calendar, Clock, AlertCircle, CheckCircle2, Archive } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import axios from 'axios' // Import axios

interface CalendarioEvento {
  CODATIVIDADE: string
  CODEVENTO: string
  CODLEAD?: string
  TIPO: string
  TITULO: string
  DESCRICAO: string
  DATA_INICIO: string
  DATA_FIM: string
  STATUS: 'ATRASADO' | 'EM_ANDAMENTO' | 'REALIZADO' | 'AGUARDANDO'
  COR?: string
  ATIVO?: string
}

interface NovaAtividade {
  TIPO: string
  TITULO: string
  DESCRICAO: string
  DATA_INICIO: string
  DATA_FIM: string
  STATUS: 'ATRASADO' | 'EM_ANDAMENTO' | 'REALIZADO' | 'AGUARDANDO'
  COR: string
  CODLEAD?: string
}

interface EventoItemProps {
  evento: CalendarioEvento
  onUpdate: () => void
  onUpdateLocal: (evento: CalendarioEvento) => void
  onClose?: () => void
}

function EventoItem({ evento, onUpdate, onUpdateLocal, onClose }: EventoItemProps) {
  const [editando, setEditando] = useState(false)
  const [titulo, setTitulo] = useState(evento.TITULO)
  const [descricao, setDescricao] = useState(evento.DESCRICAO)
  const [tipo, setTipo] = useState(evento.TIPO)
  const [cor, setCor] = useState(evento.COR || '#22C55E')
  const [dataInicio, setDataInicio] = useState(evento.DATA_INICIO.slice(0, 16))
  const [dataFim, setDataFim] = useState(evento.DATA_FIM.slice(0, 16))
  const [salvando, setSalvando] = useState(false)
  const [concluindo, setConcluindo] = useState(false)
  const [mostrarAlertaInativar, setMostrarAlertaInativar] = useState(false)
  const [inativando, setInativando] = useState(false) // Added state for inactivate loading
  const { toast } = useToast()

  const marcarRealizado = async () => {
    try {
      setConcluindo(true)
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: evento.CODATIVIDADE, STATUS: 'REALIZADO' })
      })

      if (!response.ok) throw new Error('Erro ao marcar como concluído')

      toast({
        title: "Sucesso",
        description: "Tarefa concluída",
      })

      onUpdateLocal({ ...evento, STATUS: 'REALIZADO' })
      await onUpdate()

      // Fechar o modal após concluir
      if (onClose) {
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setConcluindo(false)
    }
  }

  const marcarAguardando = async () => {
    try {
      setConcluindo(true)
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: evento.CODATIVIDADE, STATUS: 'AGUARDANDO' })
      })

      if (!response.ok) throw new Error('Erro ao alterar status')

      toast({
        title: "Sucesso",
        description: "Status alterado para Aguardando",
      })

      onUpdateLocal({ ...evento, STATUS: 'AGUARDANDO' })
      await onUpdate()

      // Fechar o modal após alterar status
      if (onClose) {
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setConcluindo(false)
    }
  }

  const salvarEdicao = async () => {
    try {
      setSalvando(true)

      // Converter data sem forçar UTC
      const dataInicioCompleta = dataInicio + ':00'
      const dataFimCompleta = dataFim + ':00'

      // Atualizar todos os campos editáveis
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: evento.CODATIVIDADE,
          TITULO: titulo,
          DESCRICAO: descricao,
          TIPO: tipo,
          COR: cor,
          DATA_INICIO: dataInicioCompleta,
          DATA_FIM: dataFimCompleta
        })
      })

      if (!response.ok) throw new Error('Erro ao atualizar')

      // Atualizar o evento localmente com os novos dados
      const eventoAtualizado = {
        ...evento,
        TITULO: titulo,
        DESCRICAO: descricao,
        TIPO: tipo,
        COR: cor,
        DATA_INICIO: dataInicioCompleta,
        DATA_FIM: dataFimCompleta
      }

      // Primeiro atualizar localmente
      onUpdateLocal(eventoAtualizado)

      // Fechar o modo de edição
      setEditando(false)

      // Recarregar todos os eventos
      await onUpdate()

      toast({
        title: "Sucesso",
        description: "Atividade atualizada",
      })

      // Fechar o modal após salvar
      if (onClose) {
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSalvando(false)
    }
  }

  const inativar = async () => {
    setInativando(true) // Set loading state for the button
    try {
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: evento.CODATIVIDADE,
          ATIVO: 'N'
        })
      })

      if (!response.ok) throw new Error('Erro ao inativar')

      toast({
        title: "Sucesso",
        description: "Atividade inativada",
      })

      // Recarregar todos os eventos
      await onUpdate()

      // Fechar o modal após inativar
      if (onClose) {
        onClose()
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setInativando(false) // Reset loading state
    }
  }

  const estaRealizado = evento.STATUS === 'REALIZADO'

  return (
    <>
      <div className="relative pl-6 sm:pl-12">
        <div
          className="absolute left-1 sm:left-2.5 top-2 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-white shadow-sm"
          style={{ backgroundColor: evento.COR || '#22C55E' }}
        />

        <div className="border rounded-lg p-2 sm:p-4 space-y-2 sm:space-y-3 bg-white">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 flex items-start gap-1 sm:gap-2 min-w-0">
              {evento.STATUS === 'REALIZADO' && <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 mt-0.5 flex-shrink-0" />}
              {evento.STATUS === 'ATRASADO' && <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600 mt-0.5 flex-shrink-0" />}
              {evento.STATUS === 'AGUARDANDO' && <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 mt-0.5 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base truncate">{evento.TITULO}</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{evento.DESCRICAO}</p>
              </div>
            </div>
            <Badge className={`${evento.STATUS === 'REALIZADO' ? 'bg-green-500' : evento.STATUS === 'ATRASADO' ? 'bg-red-500' : 'bg-blue-500'} text-white text-[10px] sm:text-xs whitespace-nowrap flex-shrink-0`}>
              {evento.STATUS === 'REALIZADO' ? 'Concluído' : evento.STATUS === 'ATRASADO' ? 'Atrasado' : 'Aguardando'}
            </Badge>
          </div>

          {editando ? (
            <div className="space-y-3 pt-3 border-t">
              <div>
                <Label className="text-xs">Título</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="text-xs"
                  disabled={salvando}
                />
              </div>
              <div>
                <Label className="text-xs">Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="text-xs"
                  disabled={salvando}
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-xs">Tipo</Label>
                <Select value={tipo} onValueChange={setTipo} disabled={salvando}>
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
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  className="text-xs h-10"
                  disabled={salvando}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Data Início</Label>
                  <Input
                    type="datetime-local"
                    value={dataInicio}
                    onChange={(e) => setDataInicio(e.target.value)}
                    className="text-xs"
                    disabled={salvando}
                  />
                </div>
                <div>
                  <Label className="text-xs">Data Fim</Label>
                  <Input
                    type="datetime-local"
                    value={dataFim}
                    onChange={(e) => setDataFim(e.target.value)}
                    className="text-xs"
                    disabled={salvando}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={salvarEdicao} disabled={salvando}>
                  {salvando ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditando(false)} disabled={salvando}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 pt-2 sm:pt-3 border-t">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="font-medium">Tipo:</span> {evento.TIPO}
                </span>
                <span className="flex items-center gap-1">
                  <span className="font-medium">Data:</span>{' '}
                  {new Date(evento.DATA_INICIO).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <div className="flex gap-1 sm:gap-2 w-full sm:w-auto flex-wrap">
                {estaRealizado ? (
                  <Button
                    size="sm"
                    onClick={marcarAguardando}
                    className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none text-xs"
                    disabled={concluindo}
                  >
                    {concluindo ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Alterando...</span>
                        <span className="sm:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <span className="hidden sm:inline">Voltar p/ Aguardando</span>
                        <span className="sm:hidden">Aguardando</span>
                      </>
                    )}
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={marcarRealizado}
                      className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-none text-xs"
                      disabled={concluindo}
                    >
                      {concluindo ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Concluindo...</span>
                          <span className="sm:hidden">...</span>
                        </>
                      ) : (
                        'Concluir'
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditando(true)} disabled={concluindo} className="text-xs">
                      Editar
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setMostrarAlertaInativar(true)} disabled={concluindo || inativando} className="text-xs">
                      {inativando ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Inativando...</span>
                          <span className="sm:hidden">...</span>
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
      </div>

      <AlertDialog open={mostrarAlertaInativar} onOpenChange={setMostrarAlertaInativar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja inativar?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá inativar a tarefa "{evento.TITULO}". Você poderá reativá-la posteriormente através da lista de tarefas inativas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              inativar()
              setMostrarAlertaInativar(false)
            }} disabled={inativando}>
              Sim, inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function CalendarioView() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [eventos, setEventos] = useState<CalendarioEvento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalDiaAberto, setModalDiaAberto] = useState(false)
  const [modalNovaAtividadeAberto, setModalNovaAtividadeAberto] = useState(false)
  const [modalInativosAberto, setModalInativosAberto] = useState(false)
  const [eventosDoDia, setEventosDoDia] = useState<CalendarioEvento[]>([])
  const [eventosInativos, setEventosInativos] = useState<CalendarioEvento[]>([])
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [visualizacao, setVisualizacao] = useState<'calendario' | 'lista'>('calendario')
  const [novaAtividade, setNovaAtividade] = useState<NovaAtividade>({
    TIPO: 'TAREFA',
    TITULO: '',
    DESCRICAO: '',
    DATA_INICIO: '',
    DATA_FIM: '',
    STATUS: 'AGUARDANDO',
    COR: '#22C55E'
  })
  const [salvandoAtividade, setSalvandoAtividade] = useState(false)
  const { toast } = useToast()

  const diasSemana = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const loadEventos = async () => {
    try {
      setLoading(true)
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/leads/eventos?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (!response.ok) throw new Error('Erro ao carregar eventos')
      const data = await response.json()

      // Separar ativos e inativos
      const ativos = data.filter((ev: CalendarioEvento) => ev.ATIVO !== 'N')
      const inativos = data.filter((ev: CalendarioEvento) => ev.ATIVO === 'N')

      setEventos(ativos)
      setEventosInativos(inativos)

      // Se houver uma data selecionada, atualizar os eventos do dia
      if (dataSelecionada) {
        const eventosAtualizados = ativos.filter((evento: CalendarioEvento) => {
          const eventoDate = new Date(evento.DATA_INICIO)
          return (
            eventoDate.getDate() === dataSelecionada.getDate() &&
            eventoDate.getMonth() === dataSelecionada.getMonth() &&
            eventoDate.getFullYear() === dataSelecionada.getFullYear()
          )
        })
        setEventosDoDia(eventosAtualizados)
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarEventosInativos = async () => {
    try {
      const response = await axios.get('/api/leads/atividades', {
        params: {
          ativo: 'N'
        }
      })

      if (response.data && Array.isArray(response.data)) {
        const eventosFormatados = response.data.map((evt: any) => ({
          CODATIVIDADE: evt.CODATIVIDADE,
          TITULO: evt.DESCRICAO?.split('|')[0] || evt.DESCRICAO || 'Sem título',
          DESCRICAO: evt.DESCRICAO?.split('|')[1] || '',
          DATA_INICIO: evt.DATA_INICIO,
          DATA_FIM: evt.DATA_FIM || evt.DATA_INICIO,
          TIPO: evt.TIPO || 'TAREFA',
          COR: evt.COR || '#22C55E',
          STATUS: evt.STATUS || 'AGUARDANDO',
          CODLEAD: evt.CODLEAD,
          ATIVO: 'N'
        }))
        setEventosInativos(eventosFormatados)
      }
    } catch (error) {
      console.error('Erro ao carregar eventos inativos:', error)
      setEventosInativos([])
    }
  }

  useEffect(() => {
    loadEventos()
    carregarEventosInativos() // Load inactive events on mount
  }, [currentDate]) // Rerun apenas quando currentDate mudar

  const reativarAtividade = async (codAtividade: string) => {
    try {
      const response = await fetch('/api/leads/atividades/atualizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODATIVIDADE: codAtividade,
          ATIVO: 'S'
        })
      })

      if (!response.ok) throw new Error('Erro ao reativar')

      toast({
        title: "Sucesso",
        description: "Atividade reativada",
      })

      loadEventos() // Reload all events to update the lists
      carregarEventosInativos() // Reload inactive events specifically
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i)
      })
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i)
      })
    }

    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i)
      })
    }

    return days
  }

  const getEventosForDay = (date: Date) => {
    return eventos.filter(evento => {
      const eventoDate = new Date(evento.DATA_INICIO)
      return (
        eventoDate.getDate() === date.getDate() &&
        eventoDate.getMonth() === date.getMonth() &&
        eventoDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  const isToday = (date: Date) => {
    const now = new Date()
    return (
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    )
  }

  const abrirModalDia = (date: Date) => {
    const eventosDay = getEventosForDay(date)
    setEventosDoDia(eventosDay)
    setDataSelecionada(date)
    setModalDiaAberto(true)
  }

  const abrirModalNovaAtividade = () => {
    const hoje = new Date()
    const dataFormatada = hoje.toISOString().split('T')[0]
    setNovaAtividade({
      TIPO: 'TAREFA',
      TITULO: '',
      DESCRICAO: '',
      DATA_INICIO: dataFormatada,
      DATA_FIM: dataFormatada,
      STATUS: 'AGUARDANDO',
      COR: '#22C55E'
    })
    setModalNovaAtividadeAberto(true)
  }

  const salvarNovaAtividade = async () => {
    try {
      if (!novaAtividade.TITULO || !novaAtividade.DATA_INICIO) {
        toast({
          title: "Erro",
          description: "Título e data de início são obrigatórios",
          variant: "destructive",
        })
        return
      }

      setSalvandoAtividade(true)

      // Converter data sem alterar o fuso horário
      const dataInicio = novaAtividade.DATA_INICIO + 'T00:00:00'
      const dataFim = (novaAtividade.DATA_FIM || novaAtividade.DATA_INICIO) + 'T23:59:59'

      const response = await fetch('/api/leads/atividades/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          CODLEAD: novaAtividade.CODLEAD || null,
          TIPO: novaAtividade.TIPO,
          DESCRICAO: `${novaAtividade.TITULO}|${novaAtividade.DESCRICAO}`,
          DATA_INICIO: dataInicio,
          DATA_FIM: dataFim,
          COR: novaAtividade.COR,
          DADOS_COMPLEMENTARES: JSON.stringify({ STATUS: novaAtividade.STATUS })
        })
      })

      if (!response.ok) throw new Error('Erro ao criar atividade')

      toast({
        title: "Sucesso",
        description: "Atividade criada com sucesso",
      })

      setModalNovaAtividadeAberto(false)
      
      // Forçar recarga completa dos eventos
      await loadEventos()
      
      // Se estiver visualizando um dia específico, atualizar também
      if (dataSelecionada) {
        const eventosAtualizados = eventos.filter((evento: CalendarioEvento) => {
          const eventoDate = new Date(evento.DATA_INICIO)
          return (
            eventoDate.getDate() === dataSelecionada.getDate() &&
            eventoDate.getMonth() === dataSelecionada.getMonth() &&
            eventoDate.getFullYear() === dataSelecionada.getFullYear()
          )
        })
        setEventosDoDia(eventosAtualizados)
      }
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

  const atualizarStatusAtividade = async (codAtividade: string, novoStatus: string) => {
    try {
      const response = await fetch('/api/leads/atividades/atualizar-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ CODATIVIDADE: codAtividade, STATUS: novoStatus })
      })

      if (!response.ok) throw new Error('Erro ao atualizar status')

      toast({
        title: "Sucesso",
        description: "Status atualizado com sucesso",
      })

      loadEventos() // Reload all events
      const eventosAtualizados = eventosDoDia.map(ev =>
        ev.CODATIVIDADE === codAtividade ? { ...ev, STATUS: novoStatus as any } : ev
      )
      setEventosDoDia(eventosAtualizados)
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ATRASADO': return 'bg-red-500'
      case 'REALIZADO': return 'bg-green-500'
      case 'AGUARDANDO': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ATRASADO': return 'Atrasado'
      case 'REALIZADO': return 'Concluído'
      case 'AGUARDANDO': return 'Aguardando'
      default: return status
    }
  }

  const days = getDaysInMonth(currentDate)

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-muted-foreground">Carregando tarefas...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white h-full flex flex-col overflow-hidden">
        {/* Header Mobile */}
        <div className="border-b px-4 py-3 flex items-center justify-between flex-shrink-0 md:hidden">
          <div className="flex items-center gap-3">
            <Button 
              variant={visualizacao === 'lista' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setVisualizacao('lista')}
            >
              <List className="w-5 h-5" />
            </Button>
            <Select 
              value={`${currentDate.getMonth()}`} 
              onValueChange={(value) => setCurrentDate(new Date(currentDate.getFullYear(), parseInt(value)))}
            >
              <SelectTrigger className="border-0 font-semibold text-lg w-auto">
                <SelectValue>
                  {meses[currentDate.getMonth()].substring(0, 4)}...
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {meses.map((mes, index) => (
                  <SelectItem key={index} value={`${index}`}>{mes}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={visualizacao === 'calendario' ? 'default' : 'ghost'} 
              size="icon" 
              className="h-9 w-9"
              onClick={() => setVisualizacao('calendario')}
            >
              <Calendar className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setModalInativosAberto(true)}>
              <Archive className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Header Desktop */}
        <div className="border-b p-4 hidden md:flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            {visualizacao === 'calendario' && (
              <>
                <Button variant="outline" size="sm" onClick={today}>
                  Hoje
                </Button>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={previousMonth}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={nextMonth}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-xl font-semibold">
                  {meses[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
              </>
            )}
            {visualizacao === 'lista' && (
              <h2 className="text-xl font-semibold">Todas as Tarefas</h2>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={visualizacao === 'calendario' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVisualizacao('calendario')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Calendário
            </Button>
            <Button
              variant={visualizacao === 'lista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVisualizacao('lista')}
            >
              <List className="w-4 h-4 mr-2" />
              Lista
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalInativosAberto(true)}
            >
              <Archive className="w-4 h-4 mr-1" />
              Inativos ({eventosInativos.length})
            </Button>
            <Button onClick={abrirModalNovaAtividade} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Tarefa
            </Button>
          </div>
        </div>

        {visualizacao === 'calendario' ? (
          <div className="flex-1 flex flex-col overflow-hidden min-h-0 relative">
            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b flex-shrink-0">
              {diasSemana.map((dia) => (
                <div key={dia} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {dia.toLowerCase()}
                </div>
              ))}
            </div>

            {/* Grid do calendário */}
            <div className="grid grid-cols-7 flex-1 overflow-y-auto" style={{ gridAutoRows: 'minmax(80px, 1fr)' }}>
              {days.map((dayInfo, index) => {
                const eventosDay = getEventosForDay(dayInfo.date)
                const isTodayDate = isToday(dayInfo.date)

                return (
                  <div
                    key={index}
                    onClick={() => dayInfo.isCurrentMonth && abrirModalDia(dayInfo.date)}
                    className={`
                      border-r border-b p-2 relative cursor-pointer hover:bg-accent/30 transition-colors
                      ${!dayInfo.isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : 'bg-white'}
                      ${isTodayDate ? 'ring-2 ring-primary ring-inset' : ''}
                    `}
                  >
                    {/* Número do dia */}
                    <div className="flex justify-center mb-1">
                      <span className={`
                        text-sm font-semibold
                        ${isTodayDate ? 'bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center' : ''}
                      `}>
                        {dayInfo.day}
                      </span>
                    </div>

                    {/* Eventos */}
                    <div className="space-y-0.5 overflow-hidden">
                      {eventosDay.slice(0, 3).map((evento) => (
                        <div
                          key={evento.CODATIVIDADE}
                          className="text-[10px] px-2 py-0.5 rounded-full text-white truncate font-medium"
                          style={{ backgroundColor: evento.COR || '#22C55E' }}
                          title={evento.TITULO}
                        >
                          {evento.TITULO}
                        </div>
                      ))}
                      {eventosDay.length > 3 && (
                        <div className="text-[9px] text-muted-foreground text-center">
                          +{eventosDay.length - 3}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 p-2 sm:p-4 overflow-y-auto">
            <div className="space-y-2 sm:space-y-4">
              {eventos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Nenhuma tarefa encontrada
                </p>
              ) : (
                eventos.map((evento) => (
                  <EventoItem
                    key={evento.CODATIVIDADE}
                    evento={evento}
                    onUpdate={loadEventos}
                    onUpdateLocal={(updated) => {
                      setEventos(prevEventos => prevEventos.map(ev =>
                        ev.CODATIVIDADE === updated.CODATIVIDADE ? updated : ev
                      ))
                    }}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Tarefas do Dia - Linha do Tempo */}
      <Dialog open={modalDiaAberto} onOpenChange={setModalDiaAberto}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Tarefas de {dataSelecionada?.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4 sm:mt-6">
            {eventosDoDia.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa para este dia
              </p>
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-6">
                  {eventosDoDia.map((evento, index) => (
                    <EventoItem
                      key={evento.CODATIVIDADE}
                      evento={evento}
                      onUpdate={async () => {
                        // Recarregar todos os eventos
                        await loadEventos()
                        // Recarregar os eventos do dia específico
                        if (dataSelecionada) {
                          const eventosAtualizados = getEventosForDay(dataSelecionada)
                          setEventosDoDia(eventosAtualizados)
                          // Se não houver mais eventos, fechar o modal
                          if (eventosAtualizados.length === 0) {
                            setModalDiaAberto(false)
                          }
                        }
                      }}
                      onUpdateLocal={(updated) => {
                        // Atualizar o evento localmente no modal
                        const novosEventos = eventosDoDia.map(ev =>
                          ev.CODATIVIDADE === updated.CODATIVIDADE ? updated : ev
                        )
                        setEventosDoDia(novosEventos)

                        // Atualizar também na lista principal
                        setEventos(prevEventos => prevEventos.map(ev =>
                          ev.CODATIVIDADE === updated.CODATIVIDADE ? updated : ev
                        ))
                      }}
                      onClose={() => setModalDiaAberto(false)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Tarefas Inativas */}
      <Dialog open={modalInativosAberto} onOpenChange={setModalInativosAberto}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tarefas Inativas</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {eventosInativos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma tarefa inativa
              </p>
            ) : (
              <div className="space-y-3">
                {eventosInativos.map((evento) => (
                  <div
                    key={evento.CODATIVIDADE}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: evento.COR || '#22C55E' }}
                          />
                          <h3 className="font-semibold">{evento.TITULO}</h3>
                          <Badge className={`${getStatusColor(evento.STATUS)} text-white`}>
                            {getStatusLabel(evento.STATUS)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{evento.DESCRICAO}</p>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span><span className="font-medium">Tipo:</span> {evento.TIPO}</span>
                          <span><span className="font-medium">Data:</span> {new Date(evento.DATA_INICIO).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => reativarAtividade(evento.CODATIVIDADE)}
                        className="flex-shrink-0"
                      >
                        Ativar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Nova Atividade */}
      <Dialog open={modalNovaAtividadeAberto} onOpenChange={setModalNovaAtividadeAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Tarefa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={novaAtividade.TITULO}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, TITULO: e.target.value })}
                placeholder="Digite o título da tarefa"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={novaAtividade.TIPO}
                onValueChange={(value) => setNovaAtividade({ ...novaAtividade, TIPO: value })}
              >
                <SelectTrigger>
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
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={novaAtividade.DESCRICAO}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, DESCRICAO: e.target.value })}
                placeholder="Digite a descrição da tarefa"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data-inicio">Data Início *</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={novaAtividade.DATA_INICIO}
                  onChange={(e) => setNovaAtividade({ ...novaAtividade, DATA_INICIO: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="data-fim">Data Fim</Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={novaAtividade.DATA_FIM}
                  onChange={(e) => setNovaAtividade({ ...novaAtividade, DATA_FIM: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="cor">Cor</Label>
              <Input
                id="cor"
                type="color"
                value={novaAtividade.COR}
                onChange={(e) => setNovaAtividade({ ...novaAtividade, COR: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setModalNovaAtividadeAberto(false)}
                disabled={salvandoAtividade}
              >
                Cancelar
              </Button>
              <Button onClick={salvarNovaAtividade} disabled={salvandoAtividade}>
                {salvandoAtividade ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Tarefa'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  )
}