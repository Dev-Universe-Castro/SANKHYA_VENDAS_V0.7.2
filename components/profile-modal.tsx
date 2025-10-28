"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Camera } from "lucide-react"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/users-service"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: User
  onUpdate: (user: User) => void
}

export default function ProfileModal({ isOpen, onClose, user, onUpdate }: ProfileModalProps) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    avatar: user.avatar || "",
  })
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const updatedUser = await authService.updateProfile(formData)
      if (updatedUser) {
        onUpdate(updatedUser)
        onClose()
      }
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const initials = formData.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Perfil</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Preview */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-4 border-primary">
              <AvatarImage src={formData.avatar || "/placeholder-user.png"} alt={formData.name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <p className="text-xs text-muted-foreground">Preview da foto do perfil</p>
          </div>

          {/* Avatar URL Field */}
          <div className="space-y-2">
            <Label htmlFor="avatar">URL da Foto</Label>
            <Input
              id="avatar"
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              placeholder="https://exemplo.com/foto.jpg"
            />
          </div>

          {/* Name Field */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>

          {/* Role (Read-only) */}
          <div className="space-y-2">
            <Label htmlFor="role">Função</Label>
            <Input id="role" value={user.role} disabled className="bg-muted" />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
