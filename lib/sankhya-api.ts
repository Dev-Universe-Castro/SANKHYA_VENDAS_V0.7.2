import axios from 'axios';
import { redisCacheService } from './redis-cache-service';

// Configuração da API
const ENDPOINT_LOGIN = "https://api.sandbox.sankhya.com.br/login";
const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.saveRecord&outputType=json";

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

// Pool de conexões HTTP otimizado
const http = require('http');
const https = require('https');

const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 30000,
  rejectUnauthorized: true
});

// Instância axios otimizada
const axiosInstance = axios.create({
  httpAgent,
  httpsAgent,
  timeout: 20000,
  maxContentLength: 50 * 1024 * 1024, // 50MB
  maxBodyLength: 50 * 1024 * 1024
});

let cachedToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

// Obter Token com debouncing para evitar múltiplas requisições simultâneas
async function obterToken(retryCount = 0): Promise<string> {
  // Se já tem token em cache, retornar imediatamente
  if (cachedToken) {
    return cachedToken;
  }

  // Se já está buscando token, aguardar a requisição em andamento
  if (tokenPromise) {
    return tokenPromise;
  }

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  // Criar promise para evitar requisições duplicadas
  tokenPromise = (async () => {
    try {
      console.log("🔐 Solicitando novo token de autenticação...");
      const resposta = await axiosInstance.post(ENDPOINT_LOGIN, {}, {
        headers: LOGIN_HEADERS,
        timeout: 10000
      });

    console.log("📥 Resposta de login recebida:", {
      status: resposta.status,
      hasToken: !!(resposta.data.bearerToken || resposta.data.token)
    });

    const token = resposta.data.bearerToken || resposta.data.token;

    if (!token) {
      console.error("❌ Token não encontrado na resposta:", resposta.data);
      throw new Error("Resposta de login do Sankhya não continha o token esperado.");
    }

    cachedToken = token;
      console.log("✅ Token obtido e armazenado em cache");

      // Salvar token no cache Redis também
      await redisCacheService.set('sankhya:token', token, 50 * 60 * 1000); // 50 minutos

      return token;

    } catch (erro: any) {
      // Se for erro 500 e ainda temos retries disponíveis
      if (erro.response?.status === 500 && retryCount < MAX_RETRIES) {
        console.log(`🔄 Tentando novamente autenticação (${retryCount + 1}/${MAX_RETRIES})...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (retryCount + 1)));
        tokenPromise = null; // Resetar promise
        return obterToken(retryCount + 1);
      }

      const errorDetails = erro.response ? {
        status: erro.response.status,
        data: erro.response.data,
        headers: erro.response.headers
      } : {
        message: erro.message,
        code: erro.code
      };

      console.error("❌ Erro no Login Sankhya:", JSON.stringify(errorDetails, null, 2));

      // Limpar cache em caso de erro
      cachedToken = null;
      tokenPromise = null;

      // Mensagem de erro mais amigável
      if (erro.response?.status === 500) {
        throw new Error("Serviço Sankhya temporariamente indisponível. Tente novamente em instantes.");
      }

      throw new Error(`Falha na autenticação Sankhya: ${erro.response?.data?.error || erro.message}`);
    } finally {
      tokenPromise = null;
    }
  })();

  return tokenPromise;
}

// Requisição Autenticada Genérica
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
        'Content-Type': 'application/json'
      },
      timeout: 15000
    };

    const resposta = await axiosInstance(config);
    return resposta.data;

  } catch (erro: any) {
    // Se token expirou, limpar cache e tentar novamente
    if (erro.response && (erro.response.status === 401 || erro.response.status === 403)) {
      cachedToken = null;

      if (retryCount < 1) {
        console.log("🔄 Token expirado, obtendo novo token...");
        await new Promise(resolve => setTimeout(resolve, 500));
        return fazerRequisicaoAutenticada(fullUrl, method, data, retryCount + 1);
      }

      throw new Error("Sessão expirada. Tente novamente.");
    }

    // Retry para erros de rede ou timeout
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

    // Mensagem de erro mais amigável
    if (erro.code === 'ECONNABORTED') {
      throw new Error("Tempo de resposta excedido. Tente novamente.");
    }

    if (erro.response?.status >= 500) {
      throw new Error("Serviço temporariamente indisponível. Tente novamente.");
    }

    throw new Error(erro.response?.data?.statusMessage || erro.message || "Erro na comunicação com o servidor");
  }
}

// Mapeamento de Parceiros
function mapearParceiros(entities: any) {
  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);

  // Se entity não é um array, converte para array
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

    cleanObject._id = cleanObject.CODPARC ? String(cleanObject.CODPARC) : String(index);
    return cleanObject;
  });
}

// Consultar Parceiros com Paginação
export async function consultarParceiros(page: number = 1, pageSize: number = 50, searchName: string = '', searchCode: string = '', codVendedor?: number, codVendedoresEquipe?: number[]) {
  // Criar chave de cache baseada nos parâmetros
  const cacheKey = `parceiros:list:${page}:${pageSize}:${searchName}:${searchCode}:${codVendedor}:${codVendedoresEquipe?.join(',')}`;
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando parceiros do cache');
    return cached;
  }

  // Construir critério de busca
  const filters: string[] = [];

  // SEMPRE filtrar apenas CLIENTES (CLIENTE = 'S')
  filters.push(`CLIENTE = 'S'`);

  // Filtro por código do parceiro
  if (searchCode.trim() !== '') {
    const code = searchCode.trim();
    filters.push(`CODPARC = ${code}`);
  }

  // Filtro por nome do parceiro
  if (searchName.trim() !== '') {
    const name = searchName.trim().toUpperCase();
    filters.push(`NOMEPARC LIKE '%${name}%'`);
  }

  // Filtro por vendedor ou equipe do gerente
  if (codVendedoresEquipe && codVendedoresEquipe.length > 0) {
    // Se é gerente com equipe, buscar clientes APENAS dos vendedores da equipe
    const vendedoresList = codVendedoresEquipe.join(',');
    console.log('🔍 Aplicando filtro de equipe do gerente:', vendedoresList);
    filters.push(`CODVEND IN (${vendedoresList})`);
    // Garantir que CODVEND não seja nulo
    filters.push(`CODVEND IS NOT NULL`);
  } else if (codVendedor) {
    // Se é vendedor, buscar APENAS clientes com esse vendedor preferencial
    console.log('🔍 Aplicando filtro de vendedor único:', codVendedor);
    filters.push(`CODVEND = ${codVendedor}`);
    filters.push(`CODVEND IS NOT NULL`);
  } else {
    console.log('⚠️ Nenhum filtro de vendedor aplicado - buscando todos');
  }

  // Junta todos os filtros com AND
  const criteriaExpression = filters.join(' AND ');

  // Monta o payload base
  const dataSet: any = {
    "rootEntity": "Parceiro",
    "includePresentationFields": "N",
    "offsetPage": null,
    "disableRowsLimit": true,
    "entity": {
      "fieldset": {
        "list": "CODPARC, NOMEPARC, CGC_CPF, CODCID, ATIVO, TIPPESSOA, RAZAOSOCIAL, IDENTINSCESTAD, CEP, CODEND, NUMEND, COMPLEMENTO, CODBAI, LATITUDE, LONGITUDE, CLIENTE, CODVEND"
      }
    },
    "criteria": {
      "expression": {
        "$": criteriaExpression
      }
    }
  };

  const PARCEIROS_PAYLOAD = {
    "requestBody": {
      "dataSet": dataSet
    }
  };

  try {
    console.log("🔍 Buscando parceiros com filtro:", {
      page,
      pageSize,
      searchName,
      searchCode,
      criteriaExpression
    });

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PARCEIROS_PAYLOAD
    );

    console.log("📦 Resposta da consulta recebida:", {
      hasEntities: !!respostaCompleta.responseBody?.entities,
      total: respostaCompleta.responseBody?.entities?.total
    });

    const entities = respostaCompleta.responseBody.entities;

    // Se não houver resultados, retorna array vazio
    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum parceiro encontrado:", {
        total: entities?.total || 0,
        hasMoreResult: entities?.hasMoreResult,
        criteriaExpression
      });

      return {
        parceiros: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0
      };
    }

    const listaParceirosLimpa = mapearParceiros(entities);
    const total = entities.total ? parseInt(entities.total) : listaParceirosLimpa.length;

    // Retornar dados paginados com informações adicionais
    const resultado = {
      parceiros: listaParceirosLimpa,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };

    // Salvar no cache (TTL automático para parceiros: 10 minutos)
    await redisCacheService.set(cacheKey, resultado);

    return resultado;

  } catch (erro) {
    throw erro;
  }
}

// Consultar Tipos de Operação
export async function consultarTiposOperacao() {
  const cacheKey = 'tipos:operacao:all';
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando tipos de operação do cache');
    return cached;
  }

  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "TipoOperacao",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "limit": "100",
        "entity": {
          "fieldset": {
            "list": "CODTIPOPER, DESCROPER, ATIVO"
          }
        },
        "criteria": {
          "expression": {
            "$": "ATIVO = 'S'"
          }
        },
        "orderBy": {
          "expression": {
            "$": "DESCROPER ASC"
          }
        }
      }
    }
  };

  try {
    console.log("🔍 Buscando tipos de operação...");

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PAYLOAD
    );

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum tipo de operação encontrado");
      return [];
    }

    const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
    const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    const tiposOperacao = entityArray.map((rawEntity: any) => {
      const cleanObject: any = {};
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldKey = `f${i}`;
        const fieldName = fieldNames[i];
        if (rawEntity[fieldKey]) {
          cleanObject[fieldName] = rawEntity[fieldKey].$;
        }
      }
      return cleanObject;
    });

    console.log(`✅ ${tiposOperacao.length} tipos de operação encontrados`);

    // Salvar no cache (60 minutos - raramente muda)
    await redisCacheService.set(cacheKey, tiposOperacao);

    return tiposOperacao;

  } catch (erro) {
    console.error("❌ Erro ao consultar tipos de operação:", erro);
    throw erro;
  }
}

// Consultar Tipos de Negociação
export async function consultarTiposNegociacao() {
  const cacheKey = 'tipos:negociacao:all';
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando tipos de negociação do cache');
    return cached;
  }

  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "TipoNegociacao",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "limit": "100",
        "entity": {
          "fieldset": {
            "list": "CODTIPVENDA, DESCRTIPVENDA"
          }
        },
        "criteria": {
          "expression": {
            "$": "ATIVO = 'S'"
          }
        },
        "orderBy": {
          "expression": {
            "$": "DESCRTIPVENDA ASC"
          }
        }
      }
    }
  };

  try {
    console.log("🔍 Buscando tipos de negociação...");

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PAYLOAD
    );

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum tipo de negociação encontrado");
      return [];
    }

    const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
    const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

    const tiposNegociacao = entityArray.map((rawEntity: any) => {
      const cleanObject: any = {};
      for (let i = 0; i < fieldNames.length; i++) {
        const fieldKey = `f${i}`;
        const fieldName = fieldNames[i];
        if (rawEntity[fieldKey]) {
          cleanObject[fieldName] = rawEntity[fieldKey].$;
        }
      }
      return cleanObject;
    });

    console.log(`✅ ${tiposNegociacao.length} tipos de negociação encontrados`);

    // Salvar no cache (60 minutos)
    await redisCacheService.set(cacheKey, tiposNegociacao);

    return tiposNegociacao;

  } catch (erro) {
    console.error("❌ Erro ao consultar tipos de negociação:", erro);
    throw erro;
  }
}

// Consultar Complemento do Parceiro
export async function consultarComplementoParceiro(codParc: string) {
  const cacheKey = `parceiros:complemento:${codParc}`;
  const cached = await redisCacheService.get<any>(cacheKey);

  if (cached !== null) {
    console.log(`✅ Retornando complemento do parceiro ${codParc} do cache`);
    return cached;
  }

  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "ComplementoParc",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "limit": "1",
        "entity": {
          "fieldset": {
            "list": "CODPARC, SUGTIPNEGSAID"
          }
        },
        "criteria": {
          "expression": {
            "$": `CODPARC = ${codParc}`
          }
        }
      }
    }
  };

  try {
    console.log(`🔍 Buscando complemento do parceiro ${codParc}...`);

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PAYLOAD
    );

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum complemento encontrado para o parceiro");
      return null;
    }

    const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
    const rawEntity = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;

    const complemento: any = {};
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];
      if (rawEntity[fieldKey]) {
        complemento[fieldName] = rawEntity[fieldKey].$;
      }
    }

    console.log(`✅ Complemento encontrado:`, complemento);

    // Salvar no cache (10 minutos)
    await redisCacheService.set(cacheKey, complemento);

    return complemento;

  } catch (erro) {
    console.error("❌ Erro ao consultar complemento do parceiro:", erro);
    return null;
  }
}

// Criar/Atualizar Parceiro
export async function salvarParceiro(parceiro: {
  CODPARC?: string;
  NOMEPARC: string;
  CGC_CPF: string;
  CODCID: string;
  ATIVO: string;
  TIPPESSOA: string;
  CODVEND?: number;
  RAZAOSOCIAL?: string;
  IDENTINSCESTAD?: string;
  CEP?: string;
  CODEND?: string;
  NUMEND?: string;
  COMPLEMENTO?: string;
  CODBAI?: string;
  LATITUDE?: string;
  LONGITUDE?: string;
}) {
  // Se tem CODPARC, é atualização (usa DatasetSP.save com pk)
  if (parceiro.CODPARC) {
    const URL_UPDATE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

    const UPDATE_PAYLOAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "Parceiro",
        "standAlone": false,
        "fields": [
          "CODPARC",
          "NOMEPARC",
          "ATIVO",
          "TIPPESSOA",
          "CGC_CPF",
          "CODCID",
          "CODVEND",
          "RAZAOSOCIAL",
          "IDENTINSCESTAD",
          "CEP",
          "CODEND",
          "NUMEND",
          "COMPLEMENTO",
          "CODBAI",
          "LATITUDE",
          "LONGITUDE"
        ],
        "records": [
          {
            "pk": {
              "CODPARC": String(parceiro.CODPARC)
            },
            "values": {
              "1": parceiro.NOMEPARC,
              "2": parceiro.ATIVO,
              "3": parceiro.TIPPESSOA,
              "4": parceiro.CGC_CPF,
              "5": parceiro.CODCID,
              "6": parceiro.CODVEND || null,
              "7": parceiro.RAZAOSOCIAL || "",
              "8": parceiro.IDENTINSCESTAD || "",
              "9": parceiro.CEP || "",
              "10": parceiro.CODEND || "",
              "11": parceiro.NUMEND || "",
              "12": parceiro.COMPLEMENTO || "",
              "13": parceiro.CODBAI || "",
              "14": parceiro.LATITUDE || "",
              "15": parceiro.LONGITUDE || ""
            }
          }
        ]
      }
    };

    try {
      console.log("📤 Enviando requisição para atualizar parceiro:", {
        codigo: parceiro.CODPARC,
        nome: parceiro.NOMEPARC,
        cpfCnpj: parceiro.CGC_CPF,
        cidade: parceiro.CODCID,
        ativo: parceiro.ATIVO,
        tipo: parceiro.TIPPESSOA
      });

      const resposta = await fazerRequisicaoAutenticada(
        URL_UPDATE_SERVICO,
        'POST',
        UPDATE_PAYLOAD
      );

      console.log("✅ Parceiro atualizado com sucesso:", resposta);

      // Invalidar cache de parceiros
      await redisCacheService.invalidateParceiros();
      console.log('🗑️ Cache de parceiros invalidado');

      return resposta;
    } catch (erro: any) {
      console.error("❌ Erro ao atualizar Parceiro Sankhya:", {
        message: erro.message,
        codigo: parceiro.CODPARC,
        dados: {
          nome: parceiro.NOMEPARC,
          cpfCnpj: parceiro.CGC_CPF,
          cidade: parceiro.CODCID
        }
      });
      throw erro;
    }
  }

  // Se não tem CODPARC, é criação (usa DatasetSP.save)
  const URL_CREATE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

  const CREATE_PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "Parceiro",
      "standAlone": false,
      "fields": [
        "CODPARC",
        "NOMEPARC",
        "ATIVO",
        "TIPPESSOA",
        "CGC_CPF",
        "CODCID",
        "CODVEND",
        "RAZAOSOCIAL",
        "IDENTINSCESTAD",
        "CEP",
        "CODEND",
        "NUMEND",
        "COMPLEMENTO",
        "CODBAI",
        "LATITUDE",
        "LONGITUDE"
      ],
      "records": [
        {
          "values": {
            "1": parceiro.NOMEPARC,
            "2": parceiro.ATIVO,
            "3": parceiro.TIPPESSOA,
            "4": parceiro.CGC_CPF,
            "5": parceiro.CODCID,
            "6": parceiro.CODVEND || null,
            "7": parceiro.RAZAOSOCIAL || "",
            "8": parceiro.IDENTINSCESTAD || "",
            "9": parceiro.CEP || "",
            "10": parceiro.CODEND || "",
            "11": parceiro.NUMEND || "",
            "12": parceiro.COMPLEMENTO || "",
            "13": parceiro.CODBAI || "",
            "14": parceiro.LATITUDE || "",
            "15": parceiro.LONGITUDE || ""
          }
        }
      ]
    }
  };

  try {
    console.log("📤 Enviando requisição para criar parceiro:", {
      nome: parceiro.NOMEPARC,
      cpfCnpj: parceiro.CGC_CPF,
      cidade: parceiro.CODCID,
      ativo: parceiro.ATIVO,
      tipo: parceiro.TIPPESSOA
    });

    const resposta = await fazerRequisicaoAutenticada(
      URL_CREATE_SERVICO,
      'POST',
      CREATE_PAYLOAD
    );

    console.log("✅ Parceiro criado com sucesso:", resposta);

    // Invalidar cache de parceiros
    await redisCacheService.invalidateParceiros();
    console.log('🗑️ Cache de parceiros invalidado');

    return resposta;
  } catch (erro: any) {
    console.error("❌ Erro ao criar Parceiro Sankhya:", {
      message: erro.message,
      dados: {
        nome: parceiro.NOMEPARC,
        cpfCnpj: parceiro.CGC_CPF,
        cidade: parceiro.CODCID
      }
    });
    throw erro;
  }
}


// Consultar CODTIPVENDA e NUNOTA do CabecalhoNota por CODTIPOPER
export async function consultarTipVendaPorModelo(codTipOper: string) {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "CabecalhoNota",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "limit": "1",
        "entity": {
          "fieldset": {
            "list": "NUNOTA, CODTIPOPER, CODTIPVENDA"
          }
        },
        "criteria": {
          "expression": {
            "$": `TIPMOV = 'Z' AND CODTIPOPER = ${codTipOper}`
          }
        },
        "orderBy": {
          "expression": {
            "$": "NUNOTA DESC"
          }
        }
      }
    }
  };

  try {
    console.log(`🔍 Buscando CODTIPVENDA e NUNOTA para modelo ${codTipOper} com TIPMOV = 'Z'...`);

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PAYLOAD
    );

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum CabecalhoNota encontrado para este modelo");
      return { codTipVenda: null, nunota: null };
    }

    const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
    const rawEntity = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;

    const cabecalho: any = {};
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];
      if (rawEntity[fieldKey]) {
        cabecalho[fieldName] = rawEntity[fieldKey].$;
      }
    }

    console.log(`✅ CODTIPVENDA e NUNOTA encontrados:`, { codTipVenda: cabecalho.CODTIPVENDA, nunota: cabecalho.NUNOTA });
    return { codTipVenda: cabecalho.CODTIPVENDA, nunota: cabecalho.NUNOTA };

  } catch (erro) {
    console.error("❌ Erro ao consultar CODTIPVENDA e NUNOTA do CabecalhoNota:", erro);
    return { codTipVenda: null, nunota: null };
  }
}

// Consultar dados completos do modelo da nota por NUNOTA
export async function consultarDadosModeloNota(nunota: string) {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "CabecalhoNota",
        "includePresentationFields": "N",
        "offsetPage": "0",
        "limit": "1",
        "entity": {
          "fieldset": {
            "list": "NUNOTA, CODTIPOPER, CODTIPVENDA"
          }
        },
        "criteria": {
          "expression": {
            "$": `NUNOTA = ${nunota}`
          }
        }
      }
    }
  };

  try {
    console.log(`🔍 Buscando dados do modelo NUNOTA ${nunota}...`);

    const respostaCompleta = await fazerRequisicaoAutenticada(
      URL_CONSULTA_SERVICO,
      'POST',
      PAYLOAD
    );

    const entities = respostaCompleta.responseBody.entities;

    if (!entities || !entities.entity) {
      console.log("ℹ️ Nenhum modelo encontrado para este NUNOTA");
      return { codTipOper: null, codTipVenda: null };
    }

    const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
    const rawEntity = Array.isArray(entities.entity) ? entities.entity[0] : entities.entity;

    const cabecalho: any = {};
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];
      if (rawEntity[fieldKey]) {
        cabecalho[fieldName] = rawEntity[fieldKey].$;
      }
    }

    console.log(`✅ Dados do modelo encontrados:`, { 
      codTipOper: cabecalho.CODTIPOPER, 
      codTipVenda: cabecalho.CODTIPVENDA 
    });

    return { 
      codTipOper: cabecalho.CODTIPOPER, 
      codTipVenda: cabecalho.CODTIPVENDA 
    };

  } catch (erro) {
    console.error("❌ Erro ao consultar dados do modelo da nota:", erro);
    return { codTipOper: null, codTipVenda: null };
  }
}