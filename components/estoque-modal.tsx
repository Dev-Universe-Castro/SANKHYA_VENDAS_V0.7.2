"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

interface EstoqueModalProps {
  isOpen: boolean
  onClose: () => void
  product: any
  onConfirm: (product: any, preco: number, quantidade: number) => void
  estoqueTotal?: number
  preco?: number
}

export function EstoqueModal({ isOpen, onClose, product, onConfirm, estoqueTotal: estoqueInicial, preco: precoInicial }: EstoqueModalProps) {
  const [estoqueTotal, setEstoqueTotal] = useState<number>(estoqueInicial || 0)
  const [preco, setPreco] = useState<number>(precoInicial || 0)
  const [quantidade, setQuantidade] = useState<number>(1)

  useEffect(() => {
    if (isOpen && product) {
      setEstoqueTotal(estoqueInicial || 0)
      setPreco(precoInicial || 0)
      setQuantidade(1)
    }
  }, [isOpen, product, estoqueInicial, precoInicial])

  const handleConfirm = () => {
    if (quantidade <= 0) {
      alert('A quantidade deve ser maior que zero')
      return
    }
    onConfirm(product, preco, quantidade)
    onClose()
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const calcularTotal = () => {
    return preco * quantidade
  }

  if (!product) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{product.CODPROD} - {product.DESCRPROD}</p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Produto */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Marca</Label>
              <p className="font-medium">{product.MARCA || '-'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Unidade</Label>
              <p className="font-medium">{product.UNIDADE || 'MM'}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Estoque Total</Label>
              <p className="font-medium text-green-600">
                {estoqueTotal.toFixed(2)}
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Preço Unit.</Label>
              <p className="font-medium text-green-700">
                {formatCurrency(preco)}
              </p>
            </div>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label htmlFor="quantidade">Quantidade *</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              step="1"
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
              placeholder="Digite a quantidade"
            />
          </div>

          {/* Total */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <Label className="text-sm text-muted-foreground">Total</Label>
            <p className="text-2xl font-bold text-green-700">
              {formatCurrency(calcularTotal())}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {quantidade} × {formatCurrency(preco)}
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700"
            disabled={quantidade <= 0}
          >
            ADICIONAR PRODUTO
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}