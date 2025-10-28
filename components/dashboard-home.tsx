"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "@/components/ui/use-toast"
import { authService } from "@/lib/auth-service"
import Image from "next/image"
import { useRouter } from "next/navigation"

export default function DashboardHome() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const router = useRouter()

  const suggestions = [
    {
      title: "IA Assistente de Vendas",
      description: "Chat inteligente para análise de vendas e leads",
      action: () => {
        router.push('/dashboard/chat')
      }
    },
    {
      title: "IA Análise de Dados",
      description: "Análise visual com gráficos e tabelas gerados por IA",
      action: () => {
        router.push('/dashboard/analise')
      }
    },
  ]

  useEffect(() => {
    const user = authService.getCurrentUser()
    setCurrentUser(user)
  }, [])

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* AI Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold text-primary">Inteligência Artificial</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Escolha uma das opções de IA para potencializar suas vendas e análises de dados
          </p>
        </div>

        {/* AI Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-12">
        {suggestions.map((suggestion, index) => (
          <Card
            key={index}
            className="cursor-pointer hover:bg-secondary/20 transition-all hover:shadow-lg border-border"
            onClick={suggestion.action}
          >
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="relative w-12 h-12">
                  <Image
                    src="/1.png"
                    alt="AI Icon"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <CardTitle className="text-foreground text-xl">{suggestion.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{suggestion.description}</p>
            </CardContent>
          </Card>
        ))}
        </div>
      </div>
    </div>
  )
}