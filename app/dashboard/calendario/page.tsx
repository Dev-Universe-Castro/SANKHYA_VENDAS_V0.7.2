
import DashboardLayout from "@/components/dashboard-layout"
import CalendarioView from "@/components/calendario-view"

export default function CalendarioPage() {
  return (
    <DashboardLayout>
      <div className="h-[calc(100vh-theme(spacing.32))]">
        <CalendarioView />
      </div>
    </DashboardLayout>
  )
}
