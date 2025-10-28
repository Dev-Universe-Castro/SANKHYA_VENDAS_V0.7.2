
"use client"

import { Home, Users, Package, FileText, Calendar } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function Footer() {
  const pathname = usePathname()
  const router = useRouter()

  const navigationItems = [
    { 
      icon: Home, 
      label: "Início", 
      href: "/dashboard",
      isActive: pathname === "/dashboard"
    },
    { 
      icon: Users, 
      label: "Negócios", 
      href: "/dashboard/leads",
      isActive: pathname === "/dashboard/leads"
    },
    { 
      icon: Package, 
      label: "Produtos", 
      href: "/dashboard/produtos",
      isActive: pathname === "/dashboard/produtos"
    },
    { 
      icon: FileText, 
      label: "Pedidos", 
      href: "/dashboard/pedidos",
      isActive: pathname === "/dashboard/pedidos"
    },
    { 
      icon: Calendar, 
      label: "Tarefas", 
      href: "/dashboard/calendario",
      isActive: pathname === "/dashboard/calendario"
    },
  ]

  return (
    <footer className="border-t border-sidebar-border lg:relative fixed bottom-0 left-0 right-0 z-40 bg-[#23374f]">
      {/* Mobile Navigation */}
      <nav className="lg:hidden">
        <div className="grid grid-cols-5 gap-0 px-1 py-1.5 safe-area-inset-bottom">
          {navigationItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-md transition-colors min-h-[56px]",
                  item.isActive 
                    ? "bg-white/20 text-white" 
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] font-medium leading-tight text-center">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* Desktop Footer */}
      <div className="hidden lg:flex items-center justify-between px-6 py-3 text-xs text-white/70">
        <p>© 2025 - Todos Direitos Reservados</p>
        <p>versão 1.1</p>
      </div>
    </footer>
  )
}
