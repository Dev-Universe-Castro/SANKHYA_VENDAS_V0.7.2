"use client"

import { useState, useEffect } from "react"
import { Search, Pencil, Trash2, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { User } from "@/lib/types"
import UserModal from "./user-modal"
import { Badge } from "@/components/ui/badge"

export default function UsersTable() {
  const [searchTerm, setSearchTerm] = useState("")
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<string>("Administrador")
  const [vendedoresMap, setVendedoresMap] = useState<Record<number, string>>({})

  useEffect(() => {
    loadUsers()
    // Buscar papel do usuário logado (adapte conforme sua lógica de autenticação)
    const userRole = localStorage.getItem('userRole') || "Administrador"
    setCurrentUserRole(userRole)
    console.log("👤 Papel do usuário carregado:", userRole)
  }, [])

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/usuarios')
      if (!response.ok) throw new Error('Erro ao carregar usuários')
      const data = await response.json()
      setUsers(data)
      setFilteredUsers(data)
      
      // Carregar nomes de vendedores/gerentes
      await loadVendedoresNomes(data)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadVendedoresNomes = async (users: User[]) => {
    try {
      // Buscar gerentes e vendedores
      const [gerentesRes, vendedoresRes] = await Promise.all([
        fetch('/api/vendedores?tipo=gerentes'),
        fetch('/api/vendedores?tipo=vendedores')
      ])
      
      const gerentes = await gerentesRes.json()
      const vendedores = await vendedoresRes.json()
      
      const todosVendedores = [...gerentes, ...vendedores]
      const map: Record<number, string> = {}
      
      todosVendedores.forEach(v => {
        map[parseInt(v.CODVEND)] = v.APELIDO
      })
      
      setVendedoresMap(map)
    } catch (error) {
      console.error("Error loading vendedores names:", error)
    }
  }

  const handleCreate = () => {
    setSelectedUser(null)
    setModalMode("create")
    setIsModalOpen(true)
  }

  const handleEdit = (user: User) => {
    console.log("✏️ INICIANDO EDIÇÃO - ID:", user.id)
    console.log("✏️ Dados recebidos:", {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatar: user.avatar
    })

    // Fechar modal e limpar estado
    setIsModalOpen(false)
    setSelectedUser(null)
    setModalMode("edit")

    // Aguardar limpeza do estado
    setTimeout(() => {
      // Garantir que todos os campos existem, incluindo avatar
      const userToEdit: User = {
        id: user.id,
        name: user.name || "",
        email: user.email || "",
        role: user.role || "Vendedor",
        status: user.status || "ativo",
        password: user.password || "",
        avatar: user.avatar || ""
      }

      console.log("✏️ Definindo usuário para edição:", userToEdit)
      setSelectedUser(userToEdit)

      // Abrir modal após garantir que o estado foi atualizado
      setTimeout(() => {
        console.log("✏️ ABRINDO MODAL com dados completos")
        setIsModalOpen(true)
      }, 50)
    }, 50)
  }

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja inativar este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/deletar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) throw new Error('Erro ao inativar usuário')
        await loadUsers()
      } catch (error) {
        console.error("Error inactivating user:", error)
      }
    }
  }

  const handleApprove = async (id: number) => {
    try {
      const response = await fetch('/api/usuarios/aprovar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (!response.ok) throw new Error('Erro ao aprovar usuário')
      await loadUsers()
    } catch (error) {
      console.error("Error approving user:", error)
    }
  }

  const handleBlock = async (id: number) => {
    if (confirm("Tem certeza que deseja bloquear este usuário?")) {
      try {
        const response = await fetch('/api/usuarios/bloquear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id })
        })
        if (!response.ok) throw new Error('Erro ao bloquear usuário')
        await loadUsers()
      } catch (error) {
        console.error("Error blocking user:", error)
      }
    }
  }

  const handleSave = async (userData: Omit<User, "id"> | User) => {
    try {
      const response = await fetch('/api/usuarios/salvar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userData, mode: modalMode })
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao salvar usuário')
      }

      // Fechar modal antes de recarregar
      setIsModalOpen(false)

      // Recarregar usuários
      await loadUsers()

      console.log("✅ Usuário salvo e tabela atualizada")
    } catch (error) {
      console.error("Error saving user:", error)
      alert(`Erro ao salvar usuário: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    }
  }

  const getStatusBadge = (status: User["status"]) => {
    switch (status) {
      case "ativo":
        return <Badge className="bg-green-500 hover:bg-green-600">Ativo</Badge>
      case "pendente":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Pendente</Badge>
      case "bloqueado":
        return <Badge className="bg-red-500 hover:bg-red-600">Bloqueado</Badge>
    }
  }

  const isAdmin = currentUserRole === "Administrador"

  useEffect(() => {
    console.log("👤 Papel do usuário atual:", currentUserRole)
    console.log("🔑 É administrador?", isAdmin)
  }, [currentUserRole, isAdmin])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">Consulta e gerenciamento de usuários</p>
        </div>
        <div>
          {isAdmin && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase"
            >
              Cadastrar
            </Button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-card"
        />
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Nome
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Função
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Vendedor/Gerente
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-white uppercase tracking-wider">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Carregando...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    Nenhum usuário encontrado
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{user.id}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{user.name}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{user.email}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                    <Badge variant={user.role === "Administrador" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {user.codVendedor && vendedoresMap[user.codVendedor] 
                        ? vendedoresMap[user.codVendedor] 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm">{getStatusBadge(user.status)}</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {user.status === "pendente" ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(user.id)}
                                className="bg-green-500 hover:bg-green-600 text-white font-medium uppercase text-xs flex items-center gap-1"
                              >
                                <Check className="w-3 h-3" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleBlock(user.id)}
                                className="bg-red-500 hover:bg-red-600 text-white font-medium uppercase text-xs flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Bloquear
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleEdit(user)}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-xs flex items-center gap-1"
                              >
                                <Pencil className="w-3 h-3" />
                                Editar
                              </Button>
                              {user.status === "ativo" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleBlock(user.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white font-medium uppercase text-xs flex items-center gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Bloquear
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(user.id)}
                                className="font-medium uppercase text-xs flex items-center gap-1"
                                title="Inativar Usuário"
                              >
                                <Trash2 className="w-3 h-3" />
                                Inativar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isAdmin && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
          user={selectedUser}
          mode={modalMode}
        />
      )}
    </div>
  )
}