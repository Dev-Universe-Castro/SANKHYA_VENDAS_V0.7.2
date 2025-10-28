
"use client"

import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { authService } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Users, TrendingUp, DollarSign, UserCheck } from "lucide-react"

interface Vendedor {
  CODVEND: number
  APELIDO: string
  TIPVEND: string
  ATIVO: string
  CODGER: number
}

export default function EquipeComercialPage() {
  const router = useRouter()
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || currentUser.role !== "Gerente") {
      router.push("/dashboard")
    } else {
      setIsAuthorized(true)
      carregarVendedores(currentUser.codVendedor!)
    }
  }, [router])

  const carregarVendedores = async (codGerente: number) => {
    try {
      const response = await fetch(`/api/vendedores?tipo=vendedores&codGerente=${codGerente}`)
      const data = await response.json()
      setVendedores(data)
    } catch (error) {
      console.error("Erro ao carregar vendedores:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipe Comercial</h1>
          <p className="text-muted-foreground">Gerencie sua equipe de vendedores</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : vendedores.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum vendedor cadastrado na sua equipe</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {vendedores.map((vendedor) => (
              <Card key={vendedor.CODVEND}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{vendedor.APELIDO}</span>
                    <Badge variant={vendedor.ATIVO === 'S' ? 'default' : 'secondary'}>
                      {vendedor.ATIVO === 'S' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>Código: {vendedor.CODVEND}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Vendas</span>
                    </div>
                    <span className="font-semibold">-</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Faturamento</span>
                    </div>
                    <span className="font-semibold">-</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Clientes</span>
                    </div>
                    <span className="font-semibold">-</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
