
import DashboardLayout from "@/components/dashboard-layout"
import PedidoVendaForm from "@/components/pedido-venda-form"
import PedidosTable from "@/components/pedidos-table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function PedidosPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-full overflow-hidden">
        <Tabs defaultValue="lista" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="lista">Lista de Pedidos</TabsTrigger>
            <TabsTrigger value="novo">Novo Pedido</TabsTrigger>
          </TabsList>
          
          <TabsContent value="lista" className="mt-6">
            <PedidosTable />
          </TabsContent>
          
          <TabsContent value="novo" className="mt-6">
            <PedidoVendaForm />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
