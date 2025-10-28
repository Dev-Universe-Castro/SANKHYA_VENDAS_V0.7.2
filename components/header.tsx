"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { authService } from "@/lib/auth-service"
import type { User } from "@/lib/users-service"
import ProfileModal from "./profile-modal"
import { Bell, Calendar } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    setUser(currentUser)
  }, [])

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U"

  const handleProfileUpdate = (updatedUser: User) => {
    setUser(updatedUser)
  }

  if (!user) return null

  return (
    <>
      <header className="border-b border-sidebar-border px-6 py-4 flex items-center justify-between" style={{ backgroundColor: '#23374f' }}>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden text-white hover:bg-white/10"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        {/* Logo móvel centralizado */}
        <div className="absolute left-1/2 -translate-x-1/2 lg:hidden">
          <img 
            src="/logo_mobile.png" 
            alt="Sankhya Logo" 
            className="h-10 w-auto"
          />
        </div>

        <button
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user.name}</p>
            <p className="text-xs text-white/70">{user.email}</p>
          </div>
          <Avatar className="w-10 h-10 border-2 border-primary">
            <AvatarImage src={user.avatar || "/placeholder-user.png"} alt={user.name} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </button>
      </header>

      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        onUpdate={handleProfileUpdate}
      />
    </>
  )
}