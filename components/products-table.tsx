
"use client"

import { useState, useEffect, useRef } from "react"
import { Search, ChevronLeft, ChevronRight, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { EstoqueModal } from "@/components/estoque-modal"
import { useToast } from "@/hooks/use-toast"

interface Produto {
  _id: string
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL?: string
  MARCA?: string
  CARACTERISTICAS?: string
  UNIDADE?: string
  VLRCOMERC?: string
  ESTOQUE?: string
}

interface PaginatedResponse {
  produtos: Produto[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

const ITEMS_PER_PAGE = 20

export default function ProductsTable() {
  const [searchName, setSearchName] = useState("")
  const [searchCode, setSearchCode] = useState("")
  const [appliedSearchName, setAppliedSearchName] = useState("")
  const [appliedSearchCode, setAppliedSearchCode] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null)
  const [products, setProducts] = useState<Produto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const { toast } = useToast()
  const loadingRef = useRef(false)

  useEffect(() => {
    if (loadingRef.current) {
      console.log('⏭️ Pulando requisição duplicada (Strict Mode)')
      return
    }

    loadingRef.current = true
    loadProducts().finally(() => {
      loadingRef.current = false
    })
  }, [currentPage])

  const handleSearch = () => {
    setAppliedSearchName(searchName)
    setAppliedSearchCode(searchCode)
    setCurrentPage(1)
    setTimeout(() => {
      loadProducts()
    }, 0)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, totalRecords)

  const loadProducts = async () => {
    try {
      setIsLoading(true)

      const cachedDataString = sessionStorage.getItem('cached_produtos');

      if (cachedDataString) {
        try {
          const parsed = JSON.parse(cachedDataString);
          let produtos = parsed.produtos || [];

          const currentAppliedSearchName = appliedSearchName.trim().toUpperCase();
          const currentAppliedSearchCode = appliedSearchCode.trim();

          if (currentAppliedSearchName || currentAppliedSearchCode) {
            produtos = produtos.filter((p: Produto) => {
              const matchName = !currentAppliedSearchName || (p.DESCRPROD && p.DESCRPROD.toUpperCase().includes(currentAppliedSearchName));
              const matchCode = !currentAppliedSearchCode || (p.CODPROD && String(p.CODPROD).includes(currentAppliedSearchCode));
              return matchName && matchCode;
            });
          }

          const start = (currentPage - 1) * ITEMS_PER_PAGE;
          const end = start + ITEMS_PER_PAGE;
          const paginatedProdutos = produtos.slice(start, end);

          const data: PaginatedResponse = {
            produtos: paginatedProdutos,
            total: produtos.length,
            page: currentPage,
            pageSize: ITEMS_PER_PAGE,
            totalPages: Math.ceil(produtos.length / ITEMS_PER_PAGE)
          };

          console.log('📦 Usando produtos do cache');
          setProducts(data.produtos);
          setTotalPages(data.totalPages);
          setTotalRecords(data.total);
          setIsLoading(false);
          return;
        } catch (e) {
          console.warn('⚠️ Erro ao processar cache, buscando da API');
          sessionStorage.removeItem('cached_produtos');
        }
      }

      const hasSearch = appliedSearchName || appliedSearchCode;
      const searchQueryName = appliedSearchName;
      const searchQueryCode = appliedSearchCode;

      let url: string;

      if (!hasSearch || (searchQueryName.length < 2 && searchQueryCode.length < 2)) {
        url = `/api/sankhya/produtos?offsetPage=${null}&disableRowsLimit=${true}&page=${currentPage}&pageSize=${ITEMS_PER_PAGE}&searchName=${encodeURIComponent(searchQueryName)}&searchCode=${encodeURIComponent(searchQueryCode)}`;
      } else {
        url = `/api/sankhya/produtos/search?q=${encodeURIComponent(searchQueryName || searchQueryCode)}&limit=${ITEMS_PER_PAGE}&page=${currentPage}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Falha ao carregar produtos: ${response.status}`);
      }

      const data: PaginatedResponse = await response.json();

      if (!hasSearch || (searchQueryName.length < 2 && searchQueryCode.length < 2)) {
        try {
          sessionStorage.setItem('cached_produtos', JSON.stringify(data));
          console.log('✅ Produtos cacheados');
        } catch (e) {
          console.error("Erro ao salvar no cache:", e);
        }
      }

      setProducts(data.produtos || []);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.total || 0);

      if (currentPage === 1 && data.total > 0) {
        toast({
          title: "Sucesso",
          description: `${data.total} produtos encontrados`,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar produtos:", error);
      toast({
        title: "Erro",
        description: error instanceof Error && error.name === 'AbortError'
          ? "Tempo de carregamento excedido. Tente novamente."
          : "Falha ao carregar produtos",
        variant: "destructive",
      });
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewStock = (product: Produto) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const formatCurrency = (value: string | undefined) => {
    if (!value) return 'R$ 0,00'
    const numValue = parseFloat(value)
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(numValue)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-foreground">Produtos</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">Consulta e gerenciamento de produtos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtros de Busca */}
          <div className="bg-white border rounded-lg p-3 md:p-4 space-y-3 md:space-y-4">
            <div className="flex items-center justify-between mb-2 md:mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Filtros de Busca</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="searchCode" className="text-xs md:text-sm font-medium">
                  Código
                </Label>
                <Input
                  id="searchCode"
                  type="text"
                  placeholder="Buscar por código"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label htmlFor="searchName" className="text-xs md:text-sm font-medium">
                  Descrição
                </Label>
                <Input
                  id="searchName"
                  type="text"
                  placeholder="Buscar por descrição"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyPress={handleSearchKeyPress}
                  className="h-9 md:h-10 text-sm"
                />
              </div>

              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-xs md:text-sm font-medium opacity-0 hidden md:block">Ação</Label>
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full h-9 md:h-10 text-sm bg-green-600 hover:bg-green-700"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isLoading ? 'Buscando...' : 'Buscar Produtos'}
                </Button>
              </div>
            </div>

            {(appliedSearchName || appliedSearchCode) && (
              <Button
                onClick={() => {
                  setSearchName("")
                  setSearchCode("")
                  setAppliedSearchName("")
                  setAppliedSearchCode("")
                  setCurrentPage(1)
                  setTimeout(() => {
                    loadProducts()
                  }, 0)
                }}
                variant="outline"
                className="w-full md:w-auto"
              >
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-y-auto max-h-[600px]">
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ backgroundColor: 'rgb(35, 55, 79)' }}>
                  <tr>
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden lg:table-cell">
                      Marca
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider hidden xl:table-cell">
                      Unidade
                    </th>
                    <th className="px-3 md:px-6 py-4 text-left text-xs md:text-sm font-semibold text-white uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-3 md:px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                          <p className="text-sm font-medium text-muted-foreground">Carregando produtos...</p>
                        </div>
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 md:px-6 py-4 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product._id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.CODPROD}</td>
                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground">{product.DESCRPROD}</td>
                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden lg:table-cell">{product.MARCA || '-'}</td>
                        <td className="px-3 md:px-6 py-4 text-xs md:text-sm text-foreground hidden xl:table-cell">{product.UNIDADE || '-'}</td>
                        <td className="px-3 md:px-6 py-4">
                          <Button
                            size="sm"
                            onClick={() => handleViewStock(product)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium uppercase text-[10px] md:text-xs flex items-center gap-1 px-2 md:px-3"
                          >
                            <Package className="w-3 h-3" />
                            <span className="hidden sm:inline">Detalhes</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {!isLoading && products.length > 0 && (
            <div className="flex flex-col items-center justify-center gap-3 bg-card rounded-lg shadow px-6 py-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {endIndex} de {totalRecords} produtos
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
                <div className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-1"
                >
                  Próxima
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EstoqueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={selectedProduct}
      />
    </div>
  )
}
