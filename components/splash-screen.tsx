
"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

interface SplashScreenProps {
  onFinish: () => void
  duration?: number
}

export function SplashScreen({ onFinish, duration = 1000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [loadingText, setLoadingText] = useState("Carregando...")

  useEffect(() => {
    // Atualizar texto de carregamento
    const messages = [
      "Carregando dados...",
      "Sincronizando produtos...",
      "Carregando parceiros...",
      "Preparando ambiente...",
      "Quase pronto..."
    ]
    
    let messageIndex = 0
    const textInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length
      setLoadingText(messages[messageIndex])
    }, 1500)

    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(onFinish, 300) // Aguarda a animação de fade-out terminar
    }, duration)

    return () => {
      clearTimeout(timer)
      clearInterval(textInterval)
    }
  }, [onFinish, duration])

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
      style={{ backgroundColor: "#ffffff" }}
    >
      <div className="flex flex-col items-center justify-center gap-6 animate-fade-in">
        <div className="relative w-80 h-32 md:w-[500px] md:h-40 flex items-center justify-center">
          <Image
            src="/sankhya-logo-horizontal.png"
            alt="Sankhya Logo"
            fill
            className="object-contain animate-pulse"
            priority
          />
        </div>
        <div className="flex flex-col gap-3 items-center justify-center">
          <div className="flex gap-2 items-center justify-center">
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-3 h-3 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">{loadingText}</p>
        </div>
      </div>
    </div>
  )
}
