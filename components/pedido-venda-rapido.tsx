"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import PedidoVendaFromLead from "@/components/pedido-venda-from-lead"
import { toast } from "sonner"
import { useState, useEffect } from "react"

interface PedidoVendaRapidoProps {
  isOpen: boolean
  onClose: () => void
}

// Este componente já utiliza PedidoVendaFromLead, que será atualizado com a nova metodologia
export default function PedidoVendaRapido({ isOpen, onClose }: PedidoVendaRapidoProps) {
  const [codVendUsuario, setCodVendUsuario] = useState("0")

  useEffect(() => {
    if (isOpen) {
      carregarVendedorUsuario()
    }
  }, [isOpen])

  const carregarVendedorUsuario = () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))

        if (user.codVendedor) {
          setCodVendUsuario(String(user.codVendedor))
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendedor do usuário:', error)
    }
  }

  const dadosIniciais = {
    CODEMP: "1",
    CODCENCUS: "0",
    NUNOTA: "",
    MODELO_NOTA: "",
    DTNEG: new Date().toISOString().split('T')[0],
    DTFATUR: "",
    DTENTSAI: "",
    CODPARC: "",
    CODTIPOPER: "974",
    TIPMOV: "P",
    CODTIPVENDA: "1",
    CODVEND: codVendUsuario,
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
    RAZAO_SOCIAL: "",
    RAZAOSOCIAL: "",
    itens: []
  }

  const handlePedidoSucesso = () => {
    toast.success("Pedido criado com sucesso!")
    onClose()
  }

  const handleCancelar = () => {
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full max-h-[90vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 md:px-6 py-3 md:py-4 border-b flex-shrink-0">
          <DialogTitle className="text-base md:text-lg">Criar Pedido de Venda Rápido</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          <PedidoVendaFromLead
            dadosIniciais={dadosIniciais}
            onSuccess={handlePedidoSucesso}
            onCancel={handleCancelar}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}