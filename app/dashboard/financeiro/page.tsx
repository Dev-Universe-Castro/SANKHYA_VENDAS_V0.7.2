
import DashboardLayout from "@/components/dashboard-layout"
import TitulosReceberTable from "@/components/titulos-receber-table"

export default function FinanceiroPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <TitulosReceberTable />
      </div>
    </DashboardLayout>
  )
}
