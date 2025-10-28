import axios from 'axios';
import { cacheService } from './cache-service'; // Assuming this is for in-memory cache if needed
import { redisCacheService } from './redis-cache-service'; // Assuming this is your Redis cache service

// Cache de requisições em andamento para evitar duplicatas
const pendingRequests = new Map<string, Promise<any>>();

// Helper para deduplicar requisições idênticas
async function dedupedRequest<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Se já existe uma requisição em andamento, retorna ela
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key) as Promise<T>;
  }

  // Cria nova requisição
  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

export { dedupedRequest, pendingRequests };

// Serviço de gerenciamento de produtos e estoque
export interface Produto {
  CODPROD: string
  DESCRPROD: string
  ATIVO: string
  LOCAL: string
  MARCA: string
  CARACTERISTICAS: string
  UNIDADE: string
  VLRCOMERC: string
  ESTOQUE?: string
  _id: string
}

export interface Estoque {
  ESTOQUE: string
  CODPROD: string
  ATIVO: string
  CONTROLE: string
  CODLOCAL: string
  _id: string
}

const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

// Obter Token
async function obterToken(retryCount = 0, silent = false): Promise<string> {
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
      throw new Error("Resposta de login do Sankhya não continha o token esperado.");
    }

    cachedToken = token;
    return token;

  } catch (erro: any) {
    if (erro.response?.status === 500 && retryCount < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
      return obterToken(retryCount + 1, silent);
    }

    cachedToken = null;

    if (erro.response?.status === 500) {
      throw new Error("Serviço Sankhya temporariamente indisponível. Tente novamente em instantes.");
    }

    throw new Error(`Falha na autenticação Sankhya: ${erro.response?.data?.error || erro.message}`);
  }
}

// Requisição Autenticada Genérica
async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}, retryCount = 0) {
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 1000;

  // Utiliza o dedupedRequest para evitar requisições duplicadas
  const requestKey = `${method}:${fullUrl}:${JSON.stringify(data)}`;
  return dedupedRequest(requestKey, async () => {
    try {
      const token = await obterToken();

      const config = {
        method: method.toLowerCase(),
        url: fullUrl,
        data: data,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      };

      const resposta = await axios(config);
      return resposta.data;

    } catch (erro: any) {
      if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
        cachedToken = null;

        if (retryCount < 1) {
          console.log("🔄 Token expirado, obtendo novo token...");
          await new Promise(resolve => setTimeout(resolve, 500));
          return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
        }

        throw new Error("Sessão expirada. Tente novamente.");
      }

      if ((erro.code === 'ECONNABORTED' || erro.code === 'ENOTFOUND' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
        console.log(`🔄 Tentando novamente requisição (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
      }

      const errorDetails = erro.response?.data || erro.message;
      console.error("❌ Erro na requisição Sankhya:", {
        url: fullUrl,
        method,
        error: errorDetails
      });

      if (erro.code === 'ECONNABORTED') {
        throw new Error("Tempo de resposta excedido. Tente novamente.");
      }

      if (erro.response?.status >= 500) {
        throw new Error("Serviço temporariamente indisponível. Tente novamente.");
      }

      throw new Error(erro.response?.data?.statusMessage || erro.message || "Erro na comunicação com o servidor");
    }
  });
}

// Mapeamento genérico de entidades
function mapearEntidades(entities: any) {
  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);

  const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

  return entityArray.map((rawEntity: any, index: number) => {
    const cleanObject: any = {};

    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];

      if (rawEntity[fieldKey]) {
        cleanObject[fieldName] = rawEntity[fieldKey].$;
      }
    }

    cleanObject._id = cleanObject.CODPROD ? String(cleanObject.CODPROD) : String(index);
    return cleanObject;
  });
}

// Buscar Preço do Produto via API
export async function buscarPrecoProduto(codProd: string, codTabPreco: number = 0, silent: boolean = false): Promise<number> {
  const cacheKey = `preco:produto:${codProd}:tabela:${codTabPreco}`;
  const cached = await redisCacheService.get<number>(cacheKey);

  if (cached !== null) {
    if (!silent) console.log(`✅ Retornando preço do produto ${codProd} do cache: R$ ${cached}`);
    return cached;
  }

  const URL_PRECOS = `https://api.sandbox.sankhya.com.br/v1/precos/produto/${codProd}/tabela/${codTabPreco}?pagina=1`;
  const MAX_RETRIES = 1; // Definido como 1 para evitar retentativas excessivas em busca de preço

  // Utiliza o dedupedRequest para evitar requisições duplicadas para o mesmo preço
  const requestKey = `preco:${URL_PRECOS}`;
  return dedupedRequest(requestKey, async () => {
    try {
      // O token é obtido dentro da função dedupedRequest para garantir que seja o mais atual possível
      const token = await obterToken();

      const resposta = await axios.get(URL_PRECOS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });

      // Extrair o preço da resposta
      let preco = 0;

      if (resposta.data && resposta.data.produtos && Array.isArray(resposta.data.produtos) && resposta.data.produtos.length > 0) {
        const produto = resposta.data.produtos[0];
        preco = parseFloat(produto.valor) || 0;
      }

      if (!silent) console.log(`💰 Preço encontrado para produto ${codProd}: R$ ${preco}`);

      // Salvar no cache (5 minutos)
      await redisCacheService.set(cacheKey, preco, 5 * 60); // Cache por 5 minutos

      return preco;

    } catch (erro: any) {
      // Se token expirou, limpar cache e tentar novamente
      if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
        cachedToken = null;
        // Não usar dedupedRequest na retentativa para não criar um loop infinito se o erro for constante
        await new Promise(resolve => setTimeout(resolve, 500));
        return buscarPrecoProduto(codProd, codTabPreco, silent); // Chamada direta para retentar
      }

      // Retry para erros temporários
      if ((erro.code === 'ECONNABORTED' || erro.response?.status >= 500) && retryCount < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 500));
        // Não usar dedupedRequest na retentativa
        return buscarPrecoProduto(codProd, codTabPreco, silent); // Chamada direta para retentar
      }

      console.error(`❌ Erro ao buscar preço para produto ${codProd}:`, erro.message || erro);
      return 0; // Retorna 0 em caso de erro após retentativas
    }
  });
}

// Consultar Produtos com Paginação
export async function consultarProdutos(page: number = 1, pageSize: number = 50, searchName: string = '', searchCode: string = '') {
  // Construir os filtros dinamicamente
  const filters: string[] = [];

  // Filtrar por código do produto
  if (searchCode.trim() !== '') {
    const code = searchCode.trim();
    filters.push(`CODPROD = '${code}'`);
  }

  // Filtrar por descrição do produto
  if (searchName.trim() !== '') {
    const name = searchName.trim().toUpperCase();
    filters.push(`UPPER(DESCRPROD) LIKE '%${name}%'`);
  }

  // Criar a expressão completa de critério
  const criteriaExpression = filters.length > 0 ? filters.join(' AND ') : '1=1';

  // Montar o payload para a requisição
  const dataSet: any = {
    "rootEntity": "Produto",
    "includePresentationFields": "N",
    "offsetPage": null,
    "disableRowsLimit": true,
    "entity": {
      "fieldset": {
        "list": "CODPROD, DESCRPROD, ATIVO, LOCAL, MARCA, CARACTERISTICAS, UNIDADE, VLRCOMERC"
      }
    }
  };

  if (criteriaExpression !== '') {
    dataSet.criteria = {
      "expression": {
        "$": criteriaExpression
      }
    };
  }

  const PRODUTOS_PAYLOAD = {
    "requestBody": {
      "dataSet": dataSet
    }
  };

  const cacheKey = `produtos:list:${page}:${pageSize}:${searchName}:${searchCode}`;
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando produtos do cache');
    return cached;
  }

  // Utiliza o dedupedRequest para evitar requisições duplicadas para a mesma consulta de produtos
  const requestKey = `produtos:${URL_CONSULTA_SERVICO}:${JSON.stringify(PRODUTOS_PAYLOAD)}`;
  return dedupedRequest(requestKey, async () => {
    try {
      const respostaCompleta = await fazerRequisicaoAutenticada(
        URL_CONSULTA_SERVICO,
        'POST',
        PRODUTOS_PAYLOAD
      );

      // Verificar se a resposta tem a estrutura esperada
      if (!respostaCompleta?.responseBody?.entities) {
        console.log("⚠️ Resposta da API sem estrutura esperada:", JSON.stringify(respostaCompleta));
        // Retorna cache válido por 1 hora
        await redisCacheService.set(cacheKey, { produtos: [], total: 0, page, pageSize, totalPages: 0 }, 60 * 60 * 1);
        return {
          produtos: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        };
      }

      const entities = respostaCompleta.responseBody.entities;

      if (!entities || !entities.entity) {
        console.log("ℹ️ Nenhum produto encontrado");
        // Retorna cache válido por 1 hora
        await redisCacheService.set(cacheKey, { produtos: [], total: 0, page, pageSize, totalPages: 0 }, 60 * 60 * 1);
        return {
          produtos: [],
          total: 0,
          page,
          pageSize,
          totalPages: 0
        };
      }

      let listaProdutosLimpa = mapearEntidades(entities);

      // Limitar ao pageSize solicitado (a API pode retornar mais)
      if (listaProdutosLimpa.length > pageSize) {
        listaProdutosLimpa = listaProdutosLimpa.slice(0, pageSize);
      }

      // Retornar produtos SEM buscar estoque/preço (lazy loading)
      // Estoque e preço serão buscados apenas quando necessário via endpoints específicos
      const produtosComEstoque = listaProdutosLimpa.map(produto => ({
        ...produto,
        ESTOQUE: '0', // Será carregado sob demanda
        VLRCOMERC: produto.VLRCOMERC || '0'
      }));

      const resultado = {
        produtos: produtosComEstoque,
        total: entities.total ? parseInt(entities.total) : produtosComEstoque.length,
        page,
        pageSize,
        totalPages: entities.total ? Math.ceil(parseInt(entities.total) / pageSize) : 1
      };

      // Salvar no cache (1 hora)
      await redisCacheService.set(cacheKey, resultado, 60 * 60 * 1);

      return resultado;

    } catch (erro) {
      console.error("❌ Erro ao consultar produtos:", erro);
      // Em caso de erro, retornar um resultado vazio com cache válido para evitar retentativas desnecessárias
      // O cache aqui seria de erro, indicando que a consulta falhou temporariamente.
      // Poderia ter um TTL menor para este cache de erro, por exemplo, 1 minuto.
      await redisCacheService.set(cacheKey, { produtos: [], total: 0, page, pageSize, totalPages: 0 }, 60); // Cache de erro por 1 minuto
      throw erro;
    }
  });
}

// Consultar Estoque de um Produto
export async function consultarEstoqueProduto(codProd: string, searchLocal: string = '', silent: boolean = false) {
  const cacheKey = `estoque:produto:${codProd}:local:${searchLocal}`;
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    if (!silent) console.log(`✅ Retornando estoque do produto ${codProd} do cache`);
    return cached;
  }

  if (!silent) console.log(`🔍 Buscando estoque do produto ${codProd}...`);

  let criteriaExpression = `CODPROD = ${codProd}`;

  if (searchLocal.trim() !== '') {
    const local = searchLocal.trim();
    criteriaExpression += ` AND CODLOCAL LIKE '%${local}%'`;
  }

  const ESTOQUE_PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Estoque",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "ESTOQUE, CODPROD, ATIVO, CONTROLE, CODLOCAL"
          }
        },
        "criteria": {
          "expression": {
            "$": criteriaExpression
          }
        }
      }
    }
  };

  // Utiliza o dedupedRequest para evitar requisições duplicadas para o mesmo estoque
  const requestKey = `estoque:${URL_CONSULTA_SERVICO}:${JSON.stringify(ESTOQUE_PAYLOAD)}`;
  return dedupedRequest(requestKey, async () => {
    try {
      const respostaCompleta = await fazerRequisicaoAutenticada(
        URL_CONSULTA_SERVICO,
        'POST',
        ESTOQUE_PAYLOAD
      );

      // Verificar se a resposta tem a estrutura esperada
      if (!respostaCompleta?.responseBody?.entities) {
        console.warn(`⚠️ Resposta da API sem estrutura esperada para estoque de ${codProd}:`, JSON.stringify(respostaCompleta));
        // Cache por 30 segundos, pois estoque pode mudar rapidamente
        await redisCacheService.set(cacheKey, { estoques: [], total: 0, estoqueTotal: 0 }, 30);
        return {
          estoques: [],
          total: 0,
          estoqueTotal: 0
        };
      }

      const entities = respostaCompleta.responseBody.entities;

      if (!entities || !entities.entity) {
        // Nenhum estoque encontrado para o produto/local especificado
        await redisCacheService.set(cacheKey, { estoques: [], total: 0, estoqueTotal: 0 }, 30);
        return {
          estoques: [],
          total: 0,
          estoqueTotal: 0
        };
      }

      const listaEstoquesLimpa = mapearEntidades(entities);

      // Calcular estoque total
      const estoqueTotal = listaEstoquesLimpa.reduce((acc: number, estoque: any) => {
        const quantidade = parseFloat(estoque.ESTOQUE || '0');
        return acc + quantidade;
      }, 0);

      const resultado = {
        estoques: listaEstoquesLimpa,
        total: listaEstoquesLimpa.length,
        estoqueTotal: estoqueTotal
      };

      // Salvar no cache (30 segundos - estoque muda com frequência)
      await redisCacheService.set(cacheKey, resultado, 30);

      return resultado;

    } catch (erro) {
      console.error(`❌ Erro ao consultar estoque para produto ${codProd}:`, erro);
      // Cache de erro por 15 segundos
      await redisCacheService.set(cacheKey, { estoques: [], total: 0, estoqueTotal: 0 }, 15);
      throw erro;
    }
  });
}