"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Send, Sparkles, ArrowLeft } from "lucide-react"
import ReactMarkdown from "react-markdown"

interface Message {
  role: "user" | "assistant"
  content: string
}

const SUGGESTED_PROMPTS = [
  {
    label: "Quais leads devo priorizar?",
    prompt: "Analise meus leads e me diga quais devo priorizar hoje para aumentar minhas chances de fechar vendas. Considere valor, estágio e urgência."
  },
  {
    label: "Oportunidades urgentes",
    prompt: "Quais são as oportunidades mais urgentes que preciso agir agora? Liste leads com maior risco de perda ou maior potencial de fechamento imediato."
  },
  {
    label: "Sugestões de produtos",
    prompt: "Com base nos meus clientes e leads atuais, que produtos devo focar em vender esta semana?"
  },
  {
    label: "Análise de performance",
    prompt: "Faça uma análise da minha performance de vendas. Quantos leads tenho, qual o valor total em negociação e quais ações devo tomar?"
  }
]

export default function ChatPage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [streamingMessage, setStreamingMessage] = useState("")

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingMessage])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = { role: "user", content: message }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setStreamingMessage("")

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: messages })
      })

      if (!response.ok) throw new Error("Erro ao processar resposta")

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ""

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split("\n")

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6)
              if (data === "[DONE]") continue

              try {
                const parsed = JSON.parse(data)
                if (parsed.text) {
                  accumulatedText += parsed.text
                  setStreamingMessage(accumulatedText)
                }
              } catch (e) {
                console.error("Erro ao parsear chunk:", e)
              }
            }
          }
        }

        setMessages(prev => [...prev, { role: "assistant", content: accumulatedText }])
        setStreamingMessage("")
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Desculpe, ocorreu um erro ao processar sua solicitação."
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleChipClick = (prompt: string) => {
    handleSendMessage(prompt)
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-180px)]">
        {/* Botão Voltar */}
        <div className="border-b p-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para escolhas de IA
          </Button>
        </div>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-full py-12 space-y-6">
              <div className="flex items-center gap-2 text-primary">
                <img src="/1.png" alt="Logo" className="h-8 w-8" />
                <h1 className="text-2xl font-semibold">Assistente de Vendas</h1>
              </div>
              <p className="text-center text-muted-foreground max-w-md">
                Olá! Sou seu Assistente de Vendas com IA. Posso analisar seus leads, parceiros e produtos para sugerir as melhores ações comerciais. Como posso ajudar você a vender mais hoje?
              </p>

              {/* Chips de Sugestões */}
              <div className="flex flex-wrap gap-2 justify-center max-w-xl">
                {SUGGESTED_PROMPTS.map((promptData) => (
                  <Button
                    key={promptData.label}
                    variant="outline"
                    className="rounded-full"
                    onClick={() => handleChipClick(promptData.prompt)}
                  >
                    {promptData.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <Card
                    className={`max-w-[80%] p-4 ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>
                          {message.content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <p>{message.content}</p>
                    )}
                  </Card>
                </div>
              ))}

              {/* Mensagem em Streaming */}
              {streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-4 bg-muted">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>
                        {streamingMessage}
                      </ReactMarkdown>
                    </div>
                  </Card>
                </div>
              )}

              {isLoading && !streamingMessage && (
                <div className="flex justify-start">
                  <Card className="max-w-[80%] p-4 bg-muted">
                    <div className="flex items-center gap-2">
                      <img 
                        src="/anigif.gif" 
                        alt="Carregando..." 
                        className="w-8 h-8"
                      />
                      <span className="text-sm text-muted-foreground">Pensando...</span>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Barra de Input Fixa */}
        <div className="border-t bg-background p-4">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage(input)}
              placeholder="Digite sua mensagem..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}