import axios from 'axios';
import { buscarPrecoProduto } from './produtos-service';

// Serviço de gerenciamento de pedidos de venda
export interface PedidoVenda {
  NUNOTA?: string
  CODEMP: string
  CODPARC: string
  CODTIPOPER: string
  DHTIPOPER?: string
  TIPMOV: string
  CODVEND: string
  CODTIPVENDA: string
  DHTIPVENDA?: string
  DTNEG: string
  DTFATUR?: string
  DTENTSAI?: string
  OBSERVACAO?: string
  VLRNOTA?: number
  CODNAT?: string
  CODCENCUS?: string
  VLRFRETE?: number
  TIPFRETE?: string
  ORDEMCARGA?: string
  CODPARCTRANSP?: string
  VLROUTROS?: number
  VLRDESCTOT?: number
  PERCDESC?: number
  // Campos do cliente
  TIPO_CLIENTE?: string
  CPF_CNPJ?: string
  IE_RG?: string
  RAZAO_SOCIAL?: string
  itens: ItemPedido[]
}

export interface ItemPedido {
  SEQUENCIA?: number
  CODPROD: string
  QTDNEG: number
  VLRUNIT: number
  VLRTOT?: number
  PERCDESC?: number
  VLRDESC?: number
  CODLOCALORIG: string
  CONTROLE?: string
  AD_QTDBARRA?: number
  CODVOL?: string
  VLRTOTLIQ?: number
  IDALIQICMS?: string
}

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_PEDIDOS_VENDA = "https://api.sandbox.sankhya.com.br/v1/vendas/pedidos";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

async function obterToken(retryCount = 0): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  try {
    const resposta = await axios.post(ENDPOINT_LOGIN, {}, {
      headers: LOGIN_HEADERS,
      timeout: 10000
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      throw new Error("Token não encontrado na resposta de login.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    if (erro.response?.status === 500 && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return obterToken(retryCount + 1);
    }

    cachedToken = null;

    if (erro.response?.status === 500) {
      throw new Error("Serviço Sankhya temporariamente indisponível.");
    }

    throw new Error(`Falha na autenticação Sankhya: ${erro.response?.data?.error || erro.message}`);
  }
}

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  try {
    const token = await obterToken();

    const config = {
      method: method.toLowerCase(),
      url: fullUrl,
      data: data,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 15000
    };

    const resposta = await axios(config);
    return resposta.data;

  } catch (erro: any) {
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;

      if (retryCount < 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
        return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
      }

      throw new Error("Sessão expirada. Tente novamente.");
    }

    if ((erro.code === 'ECONNABORTED' || erro.code === 'ENOTFOUND' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
    }

    const errorDetails = erro.response?.data || erro.message;
    console.error("❌ Erro na requisição Sankhya:", {
      url: fullUrl,
      method,
      error: errorDetails
    });

    throw new Error(erro.response?.data?.statusMessage || erro.message || "Erro na comunicação com o servidor");
  }
}

// Criar Pedido de Venda usando a nova API
export async function criarPedidoVenda(pedido: PedidoVenda) {
  try {
    console.log("\n" + "🚀 ".repeat(40));
    console.log("INICIANDO CRIAÇÃO DE PEDIDO DE VENDA - NOVA API");
    console.log("🚀 ".repeat(40));

    // Calcular valor total
    let valorTotal = 0;
    pedido.itens.forEach(item => {
      const vlrTotal = item.QTDNEG * item.VLRUNIT;
      const vlrDesc = item.PERCDESC ? (vlrTotal * item.PERCDESC / 100) : 0;
      valorTotal += (vlrTotal - vlrDesc);
    });

    // Ajustar com frete, outros e descontos totais
    valorTotal += (pedido.VLRFRETE || 0);
    valorTotal += (pedido.VLROUTROS || 0);
    valorTotal -= (pedido.VLRDESCTOT || 0);

    // Converter data de YYYY-MM-DD para DD/MM/YYYY
    const formatarData = (dataStr: string) => {
      if (!dataStr) return "";
      const [ano, mes, dia] = dataStr.split('-');
      return `${dia}/${mes}/${ano}`;
    };

    // Obter hora atual no formato HH:mm
    const obterHoraAtual = () => {
      const agora = new Date();
      const horas = String(agora.getHours()).padStart(2, '0');
      const minutos = String(agora.getMinutes()).padStart(2, '0');
      return `${horas}:${minutos}`;
    };

    // Buscar preços dos produtos se não fornecidos
    const itensComPreco = await Promise.all(
      pedido.itens.map(async (item, index) => {
        let valorUnitario = item.VLRUNIT;
        
        // Se não tem preço, buscar da API
        if (!valorUnitario || valorUnitario === 0) {
          console.log(`🔍 Buscando preço do produto ${item.CODPROD}...`);
          valorUnitario = await buscarPrecoProduto(item.CODPROD);
          console.log(`💰 Preço encontrado: ${valorUnitario}`);
        }
        
        return {
          "sequencia": index + 1,
          "codigoProduto": parseInt(item.CODPROD),
          "quantidade": parseFloat(item.QTDNEG.toString()),
          "controle": item.CONTROLE || "007",
          "codigoLocalEstoque": parseInt(item.CODLOCALORIG) || 700,
          "unidade": item.CODVOL || "UN",
          "valorUnitario": parseFloat(valorUnitario.toString()),
          "AD_QTDBARRA": parseFloat((item.AD_QTDBARRA || 1).toString())
        };
      })
    );

    // Montar o payload conforme o novo formato da API
    const PEDIDO_PAYLOAD = {
      "cliente": {
        "tipo": pedido.TIPO_CLIENTE || "PJ",
        "cnpjCpf": pedido.CPF_CNPJ || "",
        "ieRg": pedido.IE_RG || "",
        "razao": pedido.RAZAO_SOCIAL || ""
      },
      "notaModelo": (pedido as any).MODELO_NOTA ? parseInt((pedido as any).MODELO_NOTA) : (parseInt(pedido.CODTIPOPER) || 974),
      "data": formatarData(pedido.DTNEG),
      "hora": obterHoraAtual(),
      "codigoVendedor": parseInt(pedido.CODVEND) || 0,
      "codigoCliente": parseInt(pedido.CODPARC) || 0,
      "valorTotal": parseFloat(valorTotal.toFixed(2)),
      "CODTIPVENDA": pedido.CODTIPVENDA || "1",
      "itens": itensComPreco
    };

    console.log("\n📤 CORPO DE ENVIO - PEDIDO COMPLETO:");
    console.log(JSON.stringify(PEDIDO_PAYLOAD, null, 2));

    const resposta = await fazerRequisicaoAutenticada(
      URL_PEDIDOS_VENDA,
      'POST',
      PEDIDO_PAYLOAD
    );

    console.log("\n📥 RESPOSTA COMPLETA:");
    console.log(JSON.stringify(resposta, null, 2));

    // Verificar se há erro na resposta
    if (resposta?.statusCode && resposta.statusCode >= 400) {
      console.error("\n❌ ESTRUTURA COMPLETA DA RESPOSTA:");
      console.error(JSON.stringify(resposta, null, 2));
      
      const errorMessage = resposta?.error?.details || 
                          resposta?.error?.message || 
                          resposta?.statusMessage ||
                          'Erro ao criar pedido';
      
      throw new Error(errorMessage);
    }

    if (resposta?.error) {
      console.error("\n❌ ERRO NA RESPOSTA:");
      console.error(JSON.stringify(resposta, null, 2));
      
      const errorMessage = resposta.error.details || 
                          resposta.error.message || 
                          'Erro ao criar pedido';
      
      throw new Error(errorMessage);
    }

    // Tentar diferentes formas de extrair o NUNOTA
    console.log("\n🔍 DEBUG - Verificando estrutura da resposta:");
    console.log("- resposta:", resposta);
    console.log("- tipo de resposta:", typeof resposta);

    // Extrair NUNOTA ou ID do pedido da resposta
    let nunota = 
      resposta?.retorno?.codigoPedido || 
      resposta?.codigoPedido || 
      resposta?.codigo ||
      resposta?.nunota || 
      resposta?.NUNOTA ||
      resposta?.id ||
      resposta?.data?.codigoPedido ||
      resposta?.data?.nunota ||
      resposta?.data?.NUNOTA ||
      resposta?.data?.id;

    console.log("\n🔍 NUNOTA/ID EXTRAÍDO:", nunota);

    if (!nunota) {
      console.error("\n❌ ESTRUTURA COMPLETA DA RESPOSTA:");
      console.error(JSON.stringify(resposta, null, 2));
    }

    console.log("\n" + "✅ ".repeat(40));
    console.log(`PEDIDO CRIADO COM SUCESSO! ${nunota ? `NUNOTA: ${nunota}` : 'ID não identificado'}`);
    console.log("✅ ".repeat(40) + "\n");

    return {
      success: true,
      nunota: nunota,
      message: "Pedido criado com sucesso",
      resposta: resposta
    };
  } catch (erro: any) {
    console.error("\n" + "❌ ".repeat(40));
    console.error("ERRO AO CRIAR PEDIDO DE VENDA");
    console.error("Mensagem:", erro.message);
    console.error("❌ ESTRUTURA COMPLETA DA RESPOSTA:");
    console.error(JSON.stringify(erro.response?.data || erro, null, 2));
    console.error("❌ ".repeat(40) + "\n");
    
    // Criar um erro com informações detalhadas
    const errorData = erro.response?.data;
    const detailedError = new Error(
      errorData?.error?.details || 
      errorData?.error?.message || 
      errorData?.statusMessage ||
      erro.message || 
      'Erro desconhecido ao criar pedido'
    );
    (detailedError as any).response = erro.response;
    
    throw detailedError;
  }
}