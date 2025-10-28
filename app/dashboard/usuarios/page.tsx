"use client"

import DashboardLayout from "@/components/dashboard-layout"
import UsersTable from "@/components/users-table"
import { authService } from "@/lib/auth-service"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function UsuariosPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser || currentUser.role !== "Administrador") {
      router.push("/dashboard")
    } else {
      setIsAuthorized(true)
    }
  }, [router])

  if (!isAuthorized) {
    return null
  }

  return (
    <DashboardLayout>
      <UsersTable />
    </DashboardLayout>
  )
}
