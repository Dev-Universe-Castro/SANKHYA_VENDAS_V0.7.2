"use client"

import { useState, useEffect } from "react"
import { X, Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast" // Assuming toast is available here

interface VendedorSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (codVendedor: number) => void
  tipo: 'gerente' | 'vendedor'
  codGerenteSelecionado?: number
}

export default function VendedorSelectorModal({ 
  isOpen, 
  onClose, 
  onSelect, 
  tipo,
  codGerenteSelecionado 
}: VendedorSelectorModalProps) {
  const [vendedores, setVendedores] = useState<any[]>([])
  const [gerentes, setGerentes] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [novoNome, setNovoNome] = useState("")
  const [gerenteSelecionado, setGerenteSelecionado] = useState<number | undefined>(codGerenteSelecionado)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false); // Assuming this state is needed for the new create flow
  const [newVendedorName, setNewVendedorName] = useState(""); // Assuming this state is needed for the new create flow
  const [isCreating, setIsCreating] = useState(false); // Assuming this state is needed for the new create flow

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen, tipo])

  const loadData = async () => {
    setIsLoading(true)
    try {
      if (tipo === 'gerente') {
        const response = await fetch('/api/vendedores?tipo=gerentes')
        if (response.ok) {
          const data = await response.json()
          setVendedores(data)
        }
      } else {
        // Para vendedor, buscar VENDEDORES (não gerentes)
        const responseVendedores = await fetch('/api/vendedores?tipo=vendedores')
        if (responseVendedores.ok) {
          const dataVendedores = await responseVendedores.json()
          setVendedores(dataVendedores)
        }
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // This function seems to be a remnant of an older create flow and might not be directly used in the new flow.
  // Keeping it here as it was in the original code, but the new flow uses handleCreateVendedor.
  const handleCreateNew = async () => {
    if (!novoNome.trim()) {
      alert("Digite um nome")
      return
    }

    if (tipo === 'vendedor' && !gerenteSelecionado) {
      alert("Selecione um gerente")
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/vendedores/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipo,
          apelido: novoNome,
          codGerente: gerenteSelecionado,
          empresa: 1
        })
      })

      if (response.ok) {
        const novo = await response.json()
        onSelect(parseInt(novo.CODVEND))
        onClose()
      } else {
        alert("Erro ao criar")
      }
    } catch (error) {
      console.error("Erro ao criar:", error)
      alert("Erro ao criar")
    } finally {
      setIsSaving(false)
    }
  }

  // New function for creating a vendor, called from the new create form.
  const handleCreateVendedor = async () => {
    if (!newVendedorName.trim()) {
      toast({
        title: "Erro",
        description: "Nome do vendedor é obrigatório",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      console.log("🔄 Iniciando criação de vendedor:", newVendedorName);

      const response = await fetch('/api/vendedores/criar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          nome: newVendedorName.trim()
        }),
      })

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ Erro na resposta:", errorData);
        throw new Error(errorData.error || 'Erro ao criar vendedor')
      }

      const data = await response.json()
      console.log("✅ Vendedor criado:", data);

      toast({
        title: "Sucesso",
        description: `Vendedor ${data.nome} criado com código ${data.codVendedor}`,
      })

      // Recarregar lista de vendedores
      await loadData()

      // Resetar apenas o formulário de criação
      setNewVendedorName("")
      setShowCreateForm(false)
    } catch (error: any) {
      console.error("❌ Erro ao criar vendedor:", error);
      
      // Extrair mensagem de erro mais legível
      let errorMessage = error.message || "Erro ao criar vendedor";
      
      // Tratar erros específicos da API
      if (errorMessage.includes("largura acima do limite")) {
        errorMessage = "Nome muito longo. Use no máximo 15 caracteres.";
      }
      
      toast({
        title: "Erro ao criar",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }
  
  // Dummy function for loadVendedores, as it's called in handleCreateVendedor
  // In a real scenario, this would fetch the vendedores again.
  const loadVendedores = async () => {
    // This should fetch the vendedores list again. For now, just a placeholder.
    console.log("Simulating reload of vendedores list...");
    // Example:
    // const response = await fetch('/api/vendedores?tipo=vendedores');
    // if (response.ok) {
    //   setVendedores(await response.json());
    // }
  };


  const filteredVendedores = vendedores.filter(v => 
    v.APELIDO?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-foreground">
            Selecionar {tipo === 'gerente' ? 'Gerente' : 'Vendedor'}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!showCreateForm ? (
          <>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Carregando...</div>
              ) : filteredVendedores.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum {tipo === 'gerente' ? 'gerente' : 'vendedor'} encontrado
                </div>
              ) : (
                filteredVendedores.map((v) => (
                  <button
                    key={v.CODVEND}
                    onClick={() => {
                      onSelect(parseInt(v.CODVEND))
                      onClose()
                    }}
                    className="w-full text-left p-3 rounded-lg border hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{v.APELIDO}</div>
                    <div className="text-xs text-muted-foreground">Código: {v.CODVEND}</div>
                  </button>
                ))
              )}
            </div>

            <Button
              onClick={() => setShowCreateForm(true)}
              className="w-full"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo {tipo === 'gerente' ? 'Gerente' : 'Vendedor'}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="newVendedorName" className="text-sm font-medium text-foreground">
                Nome *
              </Label>
              <Input
                id="newVendedorName"
                type="text"
                value={newVendedorName}
                onChange={(e) => setNewVendedorName(e.target.value)}
                placeholder="Digite o nome"
                className="mt-1"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowCreateForm(false)
                  setNewVendedorName("")
                }}
                variant="outline"
                className="flex-1"
                disabled={isCreating} // Use isCreating for the new form's disable state
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateVendedor} // Call the new handler
                className="flex-1"
                disabled={isCreating} // Use isCreating for the new form's disable state
              >
                {isCreating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}