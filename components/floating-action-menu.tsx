
"use client"

import { useState } from "react"
import { Plus, Briefcase, ShoppingCart, X, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import PedidoVendaRapido from "@/components/pedido-venda-rapido"
import { AssistenteModal } from "@/components/assistente-modal"


export default function FloatingActionMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [showPedidoModal, setShowPedidoModal] = useState(false)
  const [isAssistenteModalOpen, setIsAssistenteModalOpen] = useState(false)
  const router = useRouter()

  const handleNavigate = (path: string) => {
    router.push(path)
    setIsOpen(false)
  }

  const handleOpenPedido = () => {
    setShowPedidoModal(true)
    setIsOpen(false)
  }

  const handleOpenAssistente = () => {
    setIsAssistenteModalOpen(true)
    setIsOpen(false)
  }

  return (
    <>
      <div className="fixed bottom-20 lg:bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Menu de Opções - Animação Vertical */}
        <div
          className={cn(
            "flex flex-col gap-2 transition-all duration-300 ease-out",
            isOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          {/* Assistente */}
          <Button
            onClick={handleOpenAssistente}
            className={cn(
              "h-12 px-4 rounded-full shadow-lg hover:shadow-xl transition-all bg-purple-600 hover:bg-purple-700 text-white transform",
              isOpen ? "scale-100" : "scale-95"
            )}
            style={{ transitionDelay: isOpen ? "100ms" : "0ms" }}
            variant="secondary"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Assistente
          </Button>

          {/* Pedidos */}
          <Button
            onClick={handleOpenPedido}
            className={cn(
              "h-12 px-4 rounded-full shadow-lg hover:shadow-xl transition-all transform",
              isOpen ? "scale-100" : "scale-95"
            )}
            style={{ transitionDelay: isOpen ? "50ms" : "0ms" }}
            variant="secondary"
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            +Pedidos
          </Button>

          {/* Negócios */}
          <Button
            onClick={() => handleNavigate("/dashboard/leads")}
            className={cn(
              "h-12 px-4 rounded-full shadow-lg hover:shadow-xl transition-all transform",
              isOpen ? "scale-100" : "scale-95"
            )}
            style={{ transitionDelay: isOpen ? "0ms" : "0ms" }}
            variant="secondary"
          >
            <Briefcase className="mr-2 h-4 w-4" />
            +Negócios
          </Button>
        </div>

        {/* Botão Principal FAB */}
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-16 w-16 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform",
            isOpen && "rotate-45 bg-red-500 hover:bg-red-600 scale-110"
          )}
          size="icon"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>

      {/* Modal de Pedido Rápido */}
      <PedidoVendaRapido
        isOpen={showPedidoModal}
        onClose={() => setShowPedidoModal(false)}
      />

      {/* Modal do Assistente */}
      <AssistenteModal
        open={isAssistenteModalOpen}
        onClose={() => setIsAssistenteModalOpen(false)}
      />
    </>
  )
}
