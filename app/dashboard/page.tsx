"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { authService } from "@/lib/auth-service"
import DashboardLayout from "@/components/dashboard-layout"
import DashboardHome from "@/components/dashboard-home"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    const currentUser = authService.getCurrentUser()
    if (!currentUser) {
      router.push("/")
    }
  }, [router])

  return (
    <DashboardLayout>
      <DashboardHome />
    </DashboardLayout>
  )
}