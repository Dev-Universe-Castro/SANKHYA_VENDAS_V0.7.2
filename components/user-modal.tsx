"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Camera, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import type { User } from "@/lib/users-service"
import VendedorSelectorModal from "./vendedor-selector-modal"
import { useToast } from "@/components/ui/use-toast"

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (userData: Omit<User, "id"> | User) => void
  user?: User | null
  mode: "create" | "edit"
}

interface Funil {
  CODFUNIL: string
  NOME: string
  DESCRICAO: string
  COR: string
}

export default function UserModal({ isOpen, onClose, onSave, user, mode }: UserModalProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "Vendedor",
    status: "ativo" as "ativo" | "pendente" | "bloqueado",
    password: "",
    avatar: "",
  })
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [funis, setFunis] = useState<Funil[]>([])
  const [selectedFunis, setSelectedFunis] = useState<string[]>([])
  const [isLoadingFunis, setIsLoadingFunis] = useState(false)
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [vendedorTipo, setVendedorTipo] = useState<'gerente' | 'vendedor'>('gerente')
  const [codVendedor, setCodVendedor] = useState<number | undefined>(undefined)
  const [nomeVendedor, setNomeVendedor] = useState<string>("")

  // State for creating a new vendor directly from the modal
  const [newVendedorName, setNewVendedorName] = useState("")
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [isCreating, setIsCreating] = useState(false) // Separate state for the actual creation process


  useEffect(() => {
    console.log("🔍 Modal useEffect disparado:", { isOpen, hasUser: !!user, mode })

    if (!isOpen) {
      // Limpar formulário quando o modal fechar
      setFormData({
        name: "",
        email: "",
        role: "Vendedor",
        status: "ativo",
        password: "",
        avatar: "",
      })
      setSelectedFunis([])
      setIsInitializing(false)
      setNewVendedorName("") // Reset new vendor name
      setIsCreatingNew(false) // Reset create new flag
      setCodVendedor(undefined)
      setNomeVendedor("")
      return
    }

    setIsInitializing(true)

    if (mode === "edit" && user) {
      console.log("📋 Modal EDIÇÃO - Carregando dados do usuário ID:", user.id)
      console.log("📋 Dados COMPLETOS recebidos:", {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatar: user.avatar
      })

      // Garantir que todos os campos sejam preenchidos, incluindo avatar
      const newFormData = {
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Vendedor",
        status: (user.status as "ativo" | "pendente" | "bloqueado") || "ativo",
        password: "",
        avatar: user.avatar || "",
      }

      console.log("📝 FormData preparado:", newFormData)

      // Usar requestAnimationFrame para garantir que o estado seja atualizado após o render
      requestAnimationFrame(() => {
        setFormData(newFormData)
        setIsInitializing(false)
        console.log("✅ Modal inicializado com dados:", newFormData)
      })

      // Carregar permissões de funis
      loadFunisPermissoes(user.id)

      // Carregar dados do vendedor/gerente se existir
      if (user.codVendedor) {
        console.log("📍 Carregando vendedor vinculado:", user.codVendedor)
        setCodVendedor(user.codVendedor)
        loadVendedorNome(user.codVendedor)
      } else {
        console.log("⚠️ Usuário sem codVendedor vinculado")
        setCodVendedor(undefined)
        setNomeVendedor("")
      }

    } else if (mode === "create") {
      console.log("📝 Modal CRIAÇÃO - Novo usuário")

      requestAnimationFrame(() => {
        setFormData({
          name: "",
          email: "",
          role: "Vendedor",
          status: "ativo",
          password: "",
          avatar: "",
        })
        setIsInitializing(false)
      })
    }

    // Carregar lista de funis disponíveis
    loadFunis()
  }, [isOpen, user, mode])

  const loadFunis = async () => {
    setIsLoadingFunis(true)
    try {
      // Corrigido para chamar a rota correta que retorna todos os funis
      const response = await fetch('/api/funis')
      if (response.ok) {
        const data = await response.json()
        setFunis(data)
      } else {
        console.error("Erro ao carregar funis:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Erro ao carregar funis:", error)
    } finally {
      setIsLoadingFunis(false)
    }
  }

  const loadFunisPermissoes = async (userId: number) => {
    try {
      const response = await fetch(`/api/funis/permissoes?codUsuario=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedFunis(data.funisPermitidos || [])
      } else {
        console.error("Erro ao carregar permissões de funis:", response.status, await response.text())
      }
    } catch (error) {
      console.error("Erro ao carregar permissões de funis:", error)
    }
  }

  const loadVendedorNome = async (codVend: number) => {
    try {
      console.log("🔍 Buscando nome do vendedor/gerente com código:", codVend)
      
      // Tentar buscar como gerente primeiro
      const responseGerente = await fetch('/api/vendedores?tipo=gerentes')
      if (responseGerente.ok) {
        const gerentes = await responseGerente.json()
        const gerente = gerentes.find((g: any) => parseInt(g.CODVEND) === codVend)
        if (gerente) {
          console.log("✅ Gerente encontrado:", gerente.APELIDO)
          setNomeVendedor(gerente.APELIDO)
          return
        }
      }

      // Se não for gerente, buscar como vendedor
      const responseVendedor = await fetch('/api/vendedores?tipo=vendedores')
      if (responseVendedor.ok) {
        const vendedores = await responseVendedor.json()
        const vendedor = vendedores.find((v: any) => parseInt(v.CODVEND) === codVend)
        if (vendedor) {
          console.log("✅ Vendedor encontrado:", vendedor.APELIDO)
          setNomeVendedor(vendedor.APELIDO)
          return
        }
      }

      console.log("⚠️ Vendedor/Gerente não encontrado com código:", codVend)
      setNomeVendedor("")
    } catch (error) {
      console.error("❌ Erro ao carregar nome do vendedor:", error)
      setNomeVendedor("")
    }
  }

  const handleFunilToggle = (codFunil: string) => {
    setSelectedFunis(prev => {
      if (prev.includes(codFunil)) {
        return prev.filter(f => f !== codFunil)
      } else {
        return [...prev, codFunil]
      }
    })
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
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

      // Atualizar o codVendedor do usuário atual com o novo vendedor criado
      setCodVendedor(data.codVendedor)
      setNomeVendedor(data.nome)

      toast({
        title: "Sucesso",
        description: `${formData.role} ${data.nome} criado com código ${data.codVendedor}`,
      })

      // Resetar apenas o formulário de criação, mantendo o modal aberto
      setNewVendedorName("")
      setIsCreatingNew(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      const dataToSave: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        avatar: formData.avatar || '',
        codVendedor: codVendedor
      }

      // Validar vínculo obrigatório para Gerente e Vendedor
      if ((formData.role === 'Gerente' || formData.role === 'Vendedor') && !codVendedor) {
        alert(`É obrigatório vincular a um ${formData.role === 'Gerente' ? 'gerente' : 'vendedor'}`)
        setIsSaving(false)
        return
      }

      // Incluir senha apenas se fornecida e não vazia
      if (formData.password && formData.password.trim() !== '') {
        dataToSave.password = formData.password
      } else if (mode === "create") {
        // No modo de criação, senha é obrigatória
        alert("Senha é obrigatória para criar um novo usuário")
        setIsSaving(false)
        return
      }

      if (mode === "edit" && user) {
        await onSave({ ...user, ...dataToSave })

        // Salvar permissões de funis apenas se não for administrador
        if (formData.role !== "Administrador") {
          await fetch('/api/funis/permissoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              codUsuario: user.id,
              codigosFunis: selectedFunis
            })
          })
        }
      } else {
        await onSave(dataToSave)
      }
      onClose()
    } catch (error) {
      console.error("Erro ao salvar:", error)
      alert(`Erro ao salvar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const isAdmin = formData.role === "Administrador"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Loading Overlay */}
      {(isSaving || isInitializing) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {isInitializing ? "Carregando dados..." : "Salvando..."}
            </p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving && !isInitializing ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">
            {mode === "create" ? "Cadastrar Usuário" : "Editar Usuário"}
          </h2>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-3 pb-2 border-b">
            <Avatar className="w-20 h-20 border-2 border-primary">
              <AvatarImage src={formData.avatar || "/placeholder-user.png"} alt={formData.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
                {formData.name ? getInitials(formData.name) : "US"}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">Preview da foto do perfil</p>
          </div>

          {/* Avatar URL */}
          <div>
            <Label htmlFor="avatar" className="text-sm font-medium text-foreground">
              URL da Foto
            </Label>
            <Input
              id="avatar"
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="mt-1"
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>

          {mode === "edit" && (
            <div>
              <Label htmlFor="id" className="text-sm font-medium text-foreground">
                ID
              </Label>
              <Input id="id" type="text" value={user?.id || ""} disabled className="mt-1 bg-muted" />
            </div>
          )}

          <div>
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              Nome *
            </Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="mt-1"
              placeholder="Digite o nome completo"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="mt-1"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <Label htmlFor="role" className="text-sm font-medium text-foreground">
              Função *
            </Label>
            <Select value={formData.role} onValueChange={(value) => {
              setFormData({ ...formData, role: value })
              // Resetar vendedor ao mudar função
              if (value === 'Administrador') {
                setCodVendedor(undefined)
                setNomeVendedor("")
              }
            }}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione a função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrador">Administrador</SelectItem>
                <SelectItem value="Gerente">Gerente</SelectItem>
                <SelectItem value="Vendedor">Vendedor</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(formData.role === 'Gerente' || formData.role === 'Vendedor') && (
            <div>
              <Label className="text-sm font-medium text-foreground">
                Vínculo com {formData.role === 'Gerente' ? 'Gerente' : 'Vendedor'} *
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="text"
                  value={nomeVendedor || "Nenhum selecionado"}
                  disabled
                  className="flex-1 bg-muted"
                />
                <Button
                  type="button"
                  onClick={() => {
                    setVendedorTipo(formData.role === 'Gerente' ? 'gerente' : 'vendedor')
                    setShowVendedorModal(true)
                  }}
                  variant="outline"
                >
                  Selecionar
                </Button>
              </div>
              {!nomeVendedor && !codVendedor && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  onClick={() => setIsCreatingNew(true)}
                  className="mt-2 p-0 h-auto"
                >
                  + Criar novo {formData.role === 'Gerente' ? 'gerente' : 'vendedor'}
                </Button>
              )}
            </div>
          )}

          {/* Section to create a new vendor directly */}
          {isCreatingNew && (formData.role === 'Gerente' || formData.role === 'Vendedor') && (
            <div className="p-4 border rounded-lg bg-muted/30">
              <Label htmlFor="newVendedorName" className="text-sm font-medium text-foreground">
                Nome do Novo {formData.role} *
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="newVendedorName"
                  type="text"
                  value={newVendedorName}
                  onChange={(e) => setNewVendedorName(e.target.value)}
                  placeholder={`Digite o nome do ${formData.role}`}
                  required
                />
                <Button
                  type="button"
                  onClick={handleCreateVendedor}
                  disabled={isCreating}
                >
                  {isCreating ? "Criando..." : "Criar"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setNewVendedorName("")
                    setIsCreatingNew(false)
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="status" className="text-sm font-medium text-foreground">
              Status *
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value: "ativo" | "pendente" | "bloqueado") => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="bloqueado">Bloqueado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "create" && (
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Senha *
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={mode === "create"}
                className="mt-1"
                placeholder="Digite a senha"
              />
            </div>
          )}

          {/* Permissões de Funis */}
          {mode === "edit" && (
            <div className="border-t pt-4">
              <Label className="text-sm font-medium text-foreground mb-3 block">
                Permissões de Funis
              </Label>

              {isAdmin ? (
                <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    ✓ Administradores têm acesso a todos os funis e leads automaticamente
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {isLoadingFunis ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : funis.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum funil disponível
                    </p>
                  ) : (
                    funis.map((funil) => (
                      <div key={funil.CODFUNIL} className="flex items-center space-x-2 p-2 hover:bg-muted rounded">
                        <Checkbox
                          id={`funil-${funil.CODFUNIL}`}
                          checked={selectedFunis.includes(funil.CODFUNIL)}
                          onCheckedChange={() => handleFunilToggle(funil.CODFUNIL)}
                        />
                        <label
                          htmlFor={`funil-${funil.CODFUNIL}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: funil.COR || '#3b82f6' }}
                            />
                            {funil.NOME}
                          </div>
                          {funil.DESCRICAO && (
                            <p className="text-xs text-muted-foreground mt-1">{funil.DESCRICAO}</p>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 bg-transparent"
              disabled={isSaving || isInitializing || isCreating}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSaving || isInitializing || isCreating}
            >
              {isSaving ? "Salvando..." : (mode === "create" ? "Cadastrar" : "Salvar")}
            </Button>
          </div>
        </form>
      </div>

      <VendedorSelectorModal
        isOpen={showVendedorModal}
        onClose={() => setShowVendedorModal(false)}
        onSelect={(codVend) => {
          setCodVendedor(codVend)
          loadVendedorNome(codVend)
        }}
        tipo={vendedorTipo}
      />
    </div>
  )
}