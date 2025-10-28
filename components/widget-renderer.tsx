
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts"

interface Widget {
  tipo: "explicacao" | "card" | "grafico_barras" | "grafico_linha" | "grafico_pizza" | "grafico_area" | "grafico_scatter" | "grafico_radar" | "tabela"
  titulo: string
  dados: any
  metadados?: any
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c']

// Função para formatar valores monetários em R$
function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.')) : value
  
  if (isNaN(numValue)) return value.toString()
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(numValue)
}

export function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.tipo) {
    case "explicacao":
      return <ExplicacaoWidget widget={widget} />
    case "card":
      return <CardWidget widget={widget} />
    case "grafico_barras":
      return <BarChartWidget widget={widget} />
    case "grafico_linha":
      return <LineChartWidget widget={widget} />
    case "grafico_pizza":
      return <PieChartWidget widget={widget} />
    case "grafico_area":
      return <AreaChartWidget widget={widget} />
    case "grafico_scatter":
      return <ScatterChartWidget widget={widget} />
    case "grafico_radar":
      return <RadarChartWidget widget={widget} />
    case "tabela":
      return <TableWidget widget={widget} />
    default:
      return null
  }
}

function CardWidget({ widget }: { widget: Widget }) {
  const { valor, variacao, subtitulo } = widget.dados
  const isPositive = variacao?.startsWith('+')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{valor}</div>
        {variacao && (
          <p className="text-xs flex items-center gap-1 mt-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {variacao}
            </span>
            {subtitulo && <span className="text-muted-foreground">{subtitulo}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function BarChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    name: label,
    value: widget.dados.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip 
              formatter={(value: any) => {
                if (widget.metadados?.formatoMonetario) {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Bar dataKey="value" fill="#0088FE" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function LineChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    name: label,
    value: widget.dados.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis 
              tickFormatter={(value) => {
                if (widget.metadados?.formatoMonetario) {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Tooltip 
              formatter={(value: any) => {
                if (widget.metadados?.formatoMonetario) {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function PieChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    name: label,
    value: widget.dados.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ExplicacaoWidget({ widget }: { widget: Widget }) {
  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader>
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {widget.titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {widget.dados.texto}
        </p>
      </CardContent>
    </Card>
  )
}

function AreaChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    name: label,
    value: widget.dados.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis 
              tickFormatter={(value) => {
                if (widget.metadados?.formatoMonetario) {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Tooltip 
              formatter={(value: any) => {
                if (widget.metadados?.formatoMonetario) {
                  return formatCurrency(value)
                }
                return value
              }}
            />
            <Area type="monotone" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function ScatterChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.pontos || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" dataKey="x" name={widget.dados.labelX || 'X'} />
            <YAxis type="number" dataKey="y" name={widget.dados.labelY || 'Y'} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={widget.titulo} data={chartData} fill="#8884d8" />
          </ScatterChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function RadarChartWidget({ widget }: { widget: Widget }) {
  const chartData = widget.dados.labels.map((label: string, index: number) => ({
    subject: label,
    value: widget.dados.values[index]
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={chartData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            <Radar name={widget.titulo} dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function TableWidget({ widget }: { widget: Widget }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{widget.titulo}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                {widget.dados.colunas.map((col: string, index: number) => (
                  <th key={index} className="text-left p-2 font-medium">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {widget.dados.linhas.map((linha: any[], rowIndex: number) => (
                <tr key={rowIndex} className="border-b hover:bg-muted/50">
                  {linha.map((cell, cellIndex) => (
                    <td key={cellIndex} className="p-2">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
