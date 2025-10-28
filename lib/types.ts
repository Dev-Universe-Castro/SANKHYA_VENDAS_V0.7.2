export interface User {
  id: number
  name: string
  email: string
  role: 'Administrador' | 'Gerente' | 'Vendedor' | 'Usuário'
  status: 'ativo' | 'bloqueado' | 'pendente'
  avatar?: string
  password: string
  codVendedor?: number // Código do vendedor/gerente na tabela Vendedor
}

export interface Vendedor {
  CODVEND: number
  APELIDO: string
  TIPVEND: 'V' | 'G' // V = Vendedor, G = Gerente
  ATIVO: 'S' | 'N'
  EMPRESA: number
  CODGER?: number // Código do gerente (apenas para vendedores)
}