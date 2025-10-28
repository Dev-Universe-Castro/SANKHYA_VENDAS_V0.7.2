import axios from 'axios';
import { redisCacheService } from './redis-cache-service';

const URL_CONSULTA_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=CRUDServiceProvider.loadRecords&outputType=json";
const URL_SAVE_SERVICO = "https://api.sandbox.sankhya.com.br/gateway/v1/mge/service.sbr?serviceName=DatasetSP.save&outputType=json";

const SANKHYA_BASE_URL = "https://api.sandbox.sankhya.com.br"; // Adicionado para o novo fetch

const LOGIN_HEADERS = {
  'token': process.env.SANKHYA_TOKEN || "",
  'appkey': process.env.SANKHYA_APPKEY || "",
  'username': process.env.SANKHYA_USERNAME || "",
  'password': process.env.SANKHYA_PASSWORD || ""
};

let cachedToken: string | null = null;

// A instância do serviço de cache agora é importada e usada diretamente
// const redisCacheService = new RedisCacheService(); // Instanciação do serviço de cache

async function obterToken(): Promise<string> {
  if (cachedToken) {
    return cachedToken;
  }

  try {
    const resposta = await axios.post(
      "https://api.sandbox.sankhya.com.br/login",
      {},
      { headers: LOGIN_HEADERS, timeout: 10000 }
    );

    const token = resposta.data.bearerToken || resposta.data.token;
    if (!token) {
      throw new Error("Token não encontrado na resposta de login.");
    }

    cachedToken = token;
    return token;
  } catch (erro: any) {
    cachedToken = null;
    throw new Error(`Falha na autenticação Sankhya: ${erro.message}`);
  }
}

async function fazerRequisicaoAutenticada(fullUrl: string, method = 'POST', data = {}) {
  const token = await obterToken();

  try {
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
      throw new Error("Sessão expirada. Tente novamente.");
    }
    throw new Error(`Falha na comunicação com a API Sankhya: ${erro.response?.data?.statusMessage || erro.message}`);
  }
}

function mapearEntidades(entities: any): any[] {
  if (!entities || !entities.entity) {
    return [];
  }

  const fieldNames = entities.metadata.fields.field.map((f: any) => f.name);
  const entityArray = Array.isArray(entities.entity) ? entities.entity : [entities.entity];

  return entityArray.map((rawEntity: any) => {
    const cleanObject: any = {};

    // Capturar CODVEND (chave primária) do objeto $
    if (rawEntity.$) {
      Object.keys(rawEntity.$).forEach(key => {
        cleanObject[key] = rawEntity.$[key];
      });
    }

    // Mapear os demais campos (f0, f1, f2, etc.)
    for (let i = 0; i < fieldNames.length; i++) {
      const fieldKey = `f${i}`;
      const fieldName = fieldNames[i];

      if (rawEntity[fieldKey] && rawEntity[fieldKey].$) {
        cleanObject[fieldName] = rawEntity[fieldKey].$;
      }
    }

    return cleanObject;
  });
}

// CONSULTAR GERENTES
export async function consultarGerentes(): Promise<any[]> {
  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Vendedor",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "APELIDO,TIPVEND,ATIVO"
          }
        },
        "criteria": {
          "expression": {
            "$": "TIPVEND = 'G' AND ATIVO = 'S'"
          }
        }
      }
    }
  };

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD);

    console.log("📊 Resposta completa da API (gerentes):", JSON.stringify(resposta, null, 2));

    if (!resposta?.responseBody?.entities) {
      console.log("⚠️ Nenhuma entidade encontrada na resposta");
      return [];
    }

    const gerentes = mapearEntidades(resposta.responseBody.entities);
    console.log("✅ Gerentes mapeados:", gerentes);
    return gerentes;
  } catch (erro) {
    console.error("❌ Erro ao consultar gerentes:", erro);
    return [];
  }
}

// CONSULTAR VENDEDORES (opcionalmente por gerente)
export async function consultarVendedores(codGerente?: number): Promise<any[]> {
  let criteriaExpression = "TIPVEND = 'V' AND ATIVO = 'S'";

  if (codGerente) {
    criteriaExpression += ` AND CODGER = ${codGerente}`;
  }

  const PAYLOAD = {
    "requestBody": {
      "dataSet": {
        "rootEntity": "Vendedor",
        "includePresentationFields": "S",
        "offsetPage": "0",
        "entity": {
          "fieldset": {
            "list": "APELIDO,TIPVEND,ATIVO,CODGER"
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

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_CONSULTA_SERVICO, 'POST', PAYLOAD);

    console.log("📊 Resposta completa da API (vendedores):", JSON.stringify(resposta, null, 2));

    if (!resposta?.responseBody?.entities) {
      console.log("⚠️ Nenhuma entidade encontrada na resposta");
      return [];
    }

    const vendedores = mapearEntidades(resposta.responseBody.entities);
    console.log("✅ Vendedores mapeados:", vendedores);
    return vendedores;
  } catch (erro) {
    console.error("❌ Erro ao consultar vendedores:", erro);
    return [];
  }
}

// CRIAR GERENTE
export async function criarGerente(apelido: string, empresa: number = 1): Promise<any> {
  const PAYLOAD = {
    "serviceName": "DatasetSP.save",
    "requestBody": {
      "entityName": "Vendedor",
      "standAlone": false,
      "fields": ["APELIDO", "TIPVEND", "ATIVO"],
      "records": [{
        "values": {
          "0": apelido,
          "1": "G",
          "2": "S",
          "3": String(empresa)
        }
      }]
    }
  };

  try {
    const resposta = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);

    // Buscar o gerente recém-criado
    await new Promise(resolve => setTimeout(resolve, 500));
    const gerentes = await consultarGerentes();
    const novoGerente = gerentes.find(g => g.APELIDO === apelido);

    return novoGerente || { CODVEND: Date.now(), APELIDO: apelido, TIPVEND: 'G' };
  } catch (erro: any) {
    throw new Error(`Erro ao criar gerente: ${erro.message}`);
  }
}

// CRIAR VENDEDOR
export async function criarVendedor(dados: { nome: string; email?: string; empresa?: number; codGerente?: number }): Promise<{ codVendedor: number; nome: string }> {
  try {
    console.log("🔄 Criando vendedor:", dados);

    // Determinar se é vendedor ou gerente
    const isGerente = !dados.codGerente;
    const tipoVendedor = isGerente ? "G" : "V";

    // Preparar campos baseados no tipo (APELIDO limite de 15 caracteres)
    const fields = ["APELIDO", "TIPVEND", "ATIVO"];
    const values: any = {
      "0": dados.nome.substring(0, 15),
      "1": tipoVendedor,
      "2": "S"
    };

    let nextIndex = 3;

    // GERENTE: CODGER = 0 (não tem vínculo)
    if (isGerente) {
      fields.push("CODGER");
      values[String(nextIndex)] = "0";
      nextIndex++;
    }
    // VENDEDOR: adicionar CODGER do gerente
    else if (dados.codGerente) {
      fields.push("CODGER");
      values[String(nextIndex)] = String(dados.codGerente);
      nextIndex++;

      // VENDEDOR: adicionar EMPRESA se fornecido
      if (dados.empresa) {
        fields.push("EMPRESA");
        values[String(nextIndex)] = String(dados.empresa);
        nextIndex++;
      }
    }

    // Adicionar EMAIL se fornecido
    if (dados.email) {
      fields.push("EMAIL");
      values[String(nextIndex)] = dados.email;
    }

    const PAYLOAD = {
      "serviceName": "DatasetSP.save",
      "requestBody": {
        "entityName": "Vendedor",
        "standAlone": false,
        "fields": fields,
        "records": [{
          "values": values
        }]
      }
    };

    console.log("📤 Payload para criar vendedor/gerente:", JSON.stringify(PAYLOAD, null, 2));

    const resposta = await fazerRequisicaoAutenticada(URL_SAVE_SERVICO, 'POST', PAYLOAD);

    console.log("📥 Resposta completa da API:", JSON.stringify(resposta, null, 2));

    // Verificar se houve erro na resposta
    if (resposta?.responseBody?.statusMessage && resposta.responseBody.statusMessage !== 'Sucesso') {
      throw new Error(resposta.responseBody.statusMessage);
    }

    // Aguardar um pouco antes de buscar o vendedor recém-criado
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Buscar o vendedor/gerente recém-criado
    const vendedores = isGerente
      ? await consultarGerentes()
      : await consultarVendedores(dados.codGerente);

    const novoVendedor = vendedores.find(v => v.APELIDO === dados.nome.substring(0, 15));

    if (!novoVendedor) {
      console.error("❌ Vendedor/Gerente não encontrado após criação");
      console.log("📋 Lista retornada:", vendedores);
      throw new Error('Vendedor/Gerente criado mas não foi possível recuperar o código.');
    }

    console.log("✅ Vendedor/Gerente criado e recuperado:", novoVendedor);

    return {
      codVendedor: Number(novoVendedor.CODVEND),
      nome: dados.nome
    };
  } catch (error: any) {
    console.error("❌ Erro ao criar vendedor:", error);
    throw new Error(error.message || 'Erro ao criar vendedor no Sankhya');
  }
}


// NOVA FUNÇÃO COM CACHE PARA BUSCAR VENDEDORES
export async function buscarVendedores(tipo: 'todos' | 'gerentes' | 'vendedores' = 'todos', codGerente?: number) {
  const cacheKey = `vendedores:${tipo}:${codGerente || 'all'}`;
  const cached = await redisCacheService.get<any[]>(cacheKey);

  if (cached !== null) {
    console.log('✅ Retornando vendedores do cache');
    return cached;
  }

  try {
    let vendedores: any[] = [];

    switch (tipo) {
      case 'gerentes':
        vendedores = await consultarGerentes();
        break;
      case 'vendedores':
        if (codGerente === undefined) {
          throw new Error("codGerente é obrigatório para buscar vendedores.");
        }
        vendedores = await consultarVendedores(codGerente);
        break;
      case 'todos':
      default:
        const todosGerentes = await consultarGerentes();
        const todosVendedores = await consultarVendedores(); // Busca todos os vendedores, sem filtro de gerente inicial
        vendedores = [...todosGerentes, ...todosVendedores];
        break;
    }

    console.log(`✅ ${vendedores.length} vendedores encontrados`);

    // Salvar no cache (30 minutos)
    await redisCacheService.set(cacheKey, vendedores);

    return vendedores;
  } catch (erro) {
    console.error("❌ Erro ao buscar vendedores:", erro);
    return [];
  }
}