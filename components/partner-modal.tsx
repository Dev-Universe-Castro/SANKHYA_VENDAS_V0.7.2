
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import dynamic from "next/dynamic"

const MapComponent = dynamic(() => import("@/components/map-component"), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted rounded-md flex items-center justify-center">Carregando mapa...</div>
})

interface PartnerModalProps {
  isOpen: boolean
  onClose: () => void
  partner: { 
    _id: string
    CODPARC: string
    NOMEPARC: string
    CGC_CPF: string
    CODCID?: string
    ATIVO?: string
    TIPPESSOA?: string
    CODVEND?: number
    RAZAOSOCIAL?: string
    IDENTINSCESTAD?: string
    CEP?: string
    CODEND?: string
    NUMEND?: string
    COMPLEMENTO?: string
    CODBAI?: string
    LATITUDE?: string
    LONGITUDE?: string
  } | null
  onSave: (partnerData: any) => Promise<void>
  currentUser?: any
}

export function PartnerModal({ isOpen, onClose, partner, onSave }: PartnerModalProps) {
  const [formData, setFormData] = useState({
    CODPARC: "",
    NOMEPARC: "",
    RAZAOSOCIAL: "",
    IDENTINSCESTAD: "",
    CGC_CPF: "",
    ATIVO: "S",
    TIPPESSOA: "F",
    CODVEND: "",
    CEP: "",
    CODEND: "",
    NUMEND: "",
    COMPLEMENTO: "",
    CODBAI: "",
    CODCID: "",
    LATITUDE: "",
    LONGITUDE: "",
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsInitializing(true)
      
      if (partner) {
        setFormData({
          CODPARC: partner.CODPARC || "",
          NOMEPARC: partner.NOMEPARC || "",
          RAZAOSOCIAL: partner.RAZAOSOCIAL || "",
          IDENTINSCESTAD: partner.IDENTINSCESTAD || "",
          CGC_CPF: partner.CGC_CPF || "",
          ATIVO: partner.ATIVO || "S",
          TIPPESSOA: partner.TIPPESSOA || "F",
          CODVEND: partner.CODVEND?.toString() || "",
          CEP: partner.CEP || "",
          CODEND: partner.CODEND || "",
          NUMEND: partner.NUMEND || "",
          COMPLEMENTO: partner.COMPLEMENTO || "",
          CODBAI: partner.CODBAI || "",
          CODCID: partner.CODCID || "",
          LATITUDE: partner.LATITUDE || "",
          LONGITUDE: partner.LONGITUDE || "",
        })
      } else {
        setFormData({
          CODPARC: "",
          NOMEPARC: "",
          RAZAOSOCIAL: "",
          IDENTINSCESTAD: "",
          CGC_CPF: "",
          ATIVO: "S",
          TIPPESSOA: "F",
          CODVEND: "",
          CEP: "",
          CODEND: "",
          NUMEND: "",
          COMPLEMENTO: "",
          CODBAI: "",
          CODCID: "",
          LATITUDE: "",
          LONGITUDE: "",
        })
      }
      
      // Garantir que os dados foram completamente carregados
      requestAnimationFrame(() => {
        setIsInitializing(false)
      })
    }
  }, [partner, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    
    try {
      const cleanedCpfCnpj = formData.CGC_CPF.replace(/\D/g, '')
      const tippessoa = cleanedCpfCnpj.length > 11 ? "J" : "F"
      
      const dataToSave = {
        ...(partner && { CODPARC: formData.CODPARC }),
        NOMEPARC: formData.NOMEPARC,
        RAZAOSOCIAL: formData.RAZAOSOCIAL,
        IDENTINSCESTAD: formData.IDENTINSCESTAD,
        CGC_CPF: formData.CGC_CPF,
        ATIVO: formData.ATIVO,
        TIPPESSOA: tippessoa,
        CODVEND: formData.CODVEND ? parseInt(formData.CODVEND) : undefined,
        CEP: formData.CEP,
        CODEND: formData.CODEND,
        NUMEND: formData.NUMEND,
        COMPLEMENTO: formData.COMPLEMENTO,
        CODBAI: formData.CODBAI,
        CODCID: formData.CODCID,
        LATITUDE: formData.LATITUDE,
        LONGITUDE: formData.LONGITUDE,
      }
      
      await onSave(dataToSave)
    } catch (error) {
      console.error("Erro ao salvar:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Loading Overlay */}
      {(isSaving || isInitializing) && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 bg-card rounded-lg shadow-lg border">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-foreground">
              {isInitializing ? "Carregando dados..." : (isSaving ? "Salvando..." : "")}
            </p>
          </div>
        </div>
      )}

      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={!isSaving && !isInitializing ? onClose : undefined} />

      {/* Modal */}
      <div className="relative bg-card rounded-lg shadow-xl w-full max-w-3xl mx-4 p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">
            {partner ? "Editar Parceiro" : "Cadastrar Parceiro"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Cabeçalho - Campos Principais */}
          <div className="space-y-4 pb-4 border-b">
            <h3 className="text-lg font-semibold text-foreground">Dados Principais</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {partner && (
                <div className="space-y-2">
                  <Label htmlFor="CODPARC" className="text-sm font-medium text-foreground">
                    Código Parceiro
                  </Label>
                  <Input
                    id="CODPARC"
                    type="text"
                    value={formData.CODPARC}
                    className="bg-background"
                    disabled
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="NOMEPARC" className="text-sm font-medium text-foreground">
                  Nome Parceiro *
                </Label>
                <Input
                  id="NOMEPARC"
                  type="text"
                  value={formData.NOMEPARC}
                  onChange={(e) => setFormData({ ...formData, NOMEPARC: e.target.value })}
                  className="bg-background"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ATIVO" className="text-sm font-medium text-foreground">
                  Ativo *
                </Label>
                <select
                  id="ATIVO"
                  value={formData.ATIVO}
                  onChange={(e) => setFormData({ ...formData, ATIVO: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="S">S</option>
                  <option value="N">N</option>
                </select>
              </div>
            </div>
          </div>

          {/* Abas */}
          <Tabs defaultValue="identificacao" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="identificacao">Identificação</TabsTrigger>
              <TabsTrigger value="endereco">Endereço</TabsTrigger>
              <TabsTrigger value="entrega">Endereço de Entrega</TabsTrigger>
              <TabsTrigger value="mapa">Mapa</TabsTrigger>
            </TabsList>

            {/* Aba Identificação */}
            <TabsContent value="identificacao" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="RAZAOSOCIAL" className="text-sm font-medium text-foreground">
                    Razão Social
                  </Label>
                  <Input
                    id="RAZAOSOCIAL"
                    type="text"
                    value={formData.RAZAOSOCIAL}
                    onChange={(e) => setFormData({ ...formData, RAZAOSOCIAL: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="IDENTINSCESTAD" className="text-sm font-medium text-foreground">
                    Inscrição Estadual
                  </Label>
                  <Input
                    id="IDENTINSCESTAD"
                    type="text"
                    value={formData.IDENTINSCESTAD}
                    onChange={(e) => setFormData({ ...formData, IDENTINSCESTAD: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="CGC_CPF" className="text-sm font-medium text-foreground">
                    CPF / CNPJ *
                  </Label>
                  <Input
                    id="CGC_CPF"
                    type="text"
                    value={formData.CGC_CPF}
                    onChange={(e) => setFormData({ ...formData, CGC_CPF: e.target.value })}
                    className="bg-background"
                    placeholder="Apenas números"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="TIPPESSOA" className="text-sm font-medium text-foreground">
                    Tipo de Pessoa
                  </Label>
                  <select
                    id="TIPPESSOA"
                    value={formData.TIPPESSOA}
                    onChange={(e) => setFormData({ ...formData, TIPPESSOA: e.target.value })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="F">Física</option>
                    <option value="J">Jurídica</option>
                  </select>
                </div>
              </div>
            </TabsContent>

            {/* Aba Endereço */}
            <TabsContent value="endereco" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="CEP" className="text-sm font-medium text-foreground">
                    CEP
                  </Label>
                  <Input
                    id="CEP"
                    type="text"
                    value={formData.CEP}
                    onChange={(e) => setFormData({ ...formData, CEP: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="CODEND" className="text-sm font-medium text-foreground">
                    Endereço
                  </Label>
                  <Input
                    id="CODEND"
                    type="text"
                    value={formData.CODEND}
                    onChange={(e) => setFormData({ ...formData, CODEND: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="NUMEND" className="text-sm font-medium text-foreground">
                    Número
                  </Label>
                  <Input
                    id="NUMEND"
                    type="text"
                    value={formData.NUMEND}
                    onChange={(e) => setFormData({ ...formData, NUMEND: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="COMPLEMENTO" className="text-sm font-medium text-foreground">
                    Complemento
                  </Label>
                  <Input
                    id="COMPLEMENTO"
                    type="text"
                    value={formData.COMPLEMENTO}
                    onChange={(e) => setFormData({ ...formData, COMPLEMENTO: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="CODBAI" className="text-sm font-medium text-foreground">
                    Código do Bairro
                  </Label>
                  <Input
                    id="CODBAI"
                    type="text"
                    value={formData.CODBAI}
                    onChange={(e) => setFormData({ ...formData, CODBAI: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="CODCID" className="text-sm font-medium text-foreground">
                    Código da Cidade *
                  </Label>
                  <Input
                    id="CODCID"
                    type="text"
                    value={formData.CODCID}
                    onChange={(e) => setFormData({ ...formData, CODCID: e.target.value })}
                    className="bg-background"
                    placeholder="Ex: 1510"
                    required
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Endereço de Entrega */}
            <TabsContent value="entrega" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="LATITUDE" className="text-sm font-medium text-foreground">
                    Latitude P/ Entrega
                  </Label>
                  <Input
                    id="LATITUDE"
                    type="text"
                    value={formData.LATITUDE}
                    onChange={(e) => setFormData({ ...formData, LATITUDE: e.target.value })}
                    className="bg-background"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="LONGITUDE" className="text-sm font-medium text-foreground">
                    Longitude P/ Entrega
                  </Label>
                  <Input
                    id="LONGITUDE"
                    type="text"
                    value={formData.LONGITUDE}
                    onChange={(e) => setFormData({ ...formData, LONGITUDE: e.target.value })}
                    className="bg-background"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Aba Mapa */}
            <TabsContent value="mapa" className="space-y-4 mt-4">
              {formData.LATITUDE && formData.LONGITUDE ? (
                <div className="w-full">
                  <MapComponent 
                    latitude={parseFloat(formData.LATITUDE)} 
                    longitude={parseFloat(formData.LONGITUDE)}
                    partnerName={formData.NOMEPARC || "Parceiro"}
                  />
                </div>
              ) : (
                <div className="w-full h-[400px] bg-muted rounded-md flex items-center justify-center">
                  <p className="text-muted-foreground text-center">
                    Necessário Longitude e Latitude
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="flex-1 bg-transparent"
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : (partner ? "Salvar" : "Cadastrar")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
